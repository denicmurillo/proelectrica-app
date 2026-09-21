from fastapi import FastAPI, HTTPException, Depends, Security, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, Integer, String, JSON, BIGINT, Date, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship
from sqlalchemy.orm.attributes import flag_modified
from typing import List, Optional
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import hmac
import jwt
import re
import requests
import time
import os
import logging
from dotenv import load_dotenv

# --- LIBRERÍAS DE GOOGLE CALENDAR ---
from google.oauth2 import service_account
from googleapiclient.discovery import build

# =================================================================
# 0. CONFIGURACIÓN
# =================================================================
load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("proelectrica")

# URL del proyecto de Supabase: de ahí se descargan las claves públicas (JWKS) que verifican los tokens.
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
# Solo para proyectos que aún firman con la clave HS256 heredada. Con claves asimétricas (ES256) va vacío.
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")
WEBHOOK_SECRET = os.environ.get("WEBHOOK_SECRET", "")
# Una o varias URL del frontend separadas por coma; se ignora la barra final (el navegador no la envía en 'Origin').
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
ORIGENES_PERMITIDOS = sorted(
    {u.strip().rstrip("/") for u in FRONTEND_URL.split(",") if u.strip()} | {"http://localhost:5173"}
)

# =================================================================
# 1. BASE DE DATOS Y MODELOS
# =================================================================
SQLALCHEMY_DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./proelectrica.db")
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class ProyectoDB(Base):
    __tablename__ = "proyectos"
    id = Column(Integer, primary_key=True, index=True)
    estado = Column(String, default="Nueva Solicitud")
    empresa_encargada = Column(String, default="Proeléctrica")
    empresa_solicitante = Column(String, index=True)
    correo_solicitante = Column(String)
    identificador_solicitud = Column(String, nullable=True)
    datos_dinamicos = Column(JSON)
    inspector = Column(String, nullable=True)
    monto_cotizado = Column(String, nullable=True)
    pago = Column(String, default="Pendiente")
    bitacora = Column(JSON, default=[])
    archivos = Column(JSON, default=[])
    titulo_proyecto = Column(String, nullable=True)
    fecha_programacion = Column(String, nullable=True)
    fecha_inicio = Column(String, nullable=True)
    fecha_fin = Column(String, nullable=True)
    presupuesto_gastos = Column(String, nullable=True)
    utilidad_esperada = Column(String, nullable=True)
    salud_proyecto = Column(String, default="Saludable")
    progreso = Column(Integer, default=0)

    tareas = relationship("TareaDB", back_populates="proyecto", cascade="all, delete-orphan")


class TareaDB(Base):
    __tablename__ = "tareas"
    id = Column(Integer, primary_key=True, index=True)
    id_proyecto = Column(Integer, ForeignKey("proyectos.id", ondelete="CASCADE"))
    descripcion = Column(String, nullable=False)
    asignado_a = Column(String, nullable=False)
    asignado_por = Column(String, nullable=False)
    estado = Column(String, default="Pendiente")
    fecha_limite = Column(String, nullable=True)
    enlace_calendario = Column(String, nullable=True)
    created_at = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())

    proyecto = relationship("ProyectoDB", back_populates="tareas")


# El esquema lo gestiona Alembic (`alembic upgrade head`). Este atajo es solo para desarrollo con una BD vacía;
# si se ejecutara siempre, `alembic revision --autogenerate` generaría migraciones vacías.
if os.environ.get("AUTO_CREATE_TABLES") == "1":
    Base.metadata.create_all(bind=engine)

# =================================================================
# 2. ESQUEMAS PYDANTIC (VALIDACIÓN)
# =================================================================
class Ubicacion(BaseModel):
    provincia: str
    canton: str
    distrito: str
    exacta: str


class DetallesTecnicos(BaseModel):
    actividad: str
    codigo_ciiu: Optional[str] = ""
    cantidad_permisos: str
    area_m2: str


class Contacto(BaseModel):
    nombre: str
    telefono: str


class Propietario(BaseModel):
    nombre: str
    cedula: str


class FormularioSolicitud(BaseModel):
    fecha_solicitud: str
    empresa_solicitante: str
    correo_solicitante: str
    ubicacion: Ubicacion
    detalles_tecnicos: DetallesTecnicos
    contacto: Contacto
    propietario: Propietario
    seguimiento_inspeccion: str


class ActualizacionVBA(BaseModel):
    id_proyecto: int
    codigo_solicitud: str


class GestionGC(BaseModel):
    titulo_proyecto: Optional[str] = None
    empresa_encargada: Optional[str] = None
    empresa_solicitante: Optional[str] = None
    correo_solicitante: Optional[str] = None
    estado: Optional[str] = None
    seguimiento: Optional[str] = None
    monto_cotizado: Optional[str] = None
    pago: Optional[str] = None
    inspector: Optional[str] = None
    fecha_programacion: Optional[str] = None
    fecha_inicio: Optional[str] = None
    fecha_fin: Optional[str] = None
    presupuesto_gastos: Optional[str] = None
    salud_proyecto: Optional[str] = None
    progreso: Optional[int] = None
    # La bitácora NO se edita desde aquí: es append-only (POST /v1/proyectos/{id}/bitacora).
    archivos: Optional[List[dict]] = None
    datos_dinamicos: Optional[dict] = None


class TareaCrear(BaseModel):
    descripcion: str
    asignado_a: str
    fecha_limite: str


class TareaActualizar(BaseModel):
    descripcion: Optional[str] = None
    asignado_a: Optional[str] = None
    fecha_limite: Optional[str] = None


class EntradaBitacora(BaseModel):
    texto: str = Field(min_length=1, max_length=5000)


# =================================================================
# 3. MOTOR DE GOOGLE CALENDAR
# =================================================================
def crear_evento_calendario(
    titulo_proyecto: str,
    descripcion: str,
    correo_invitado: str,
    fecha: str,
    correo_asignador: str
):
    SCOPES = ['https://www.googleapis.com/auth/calendar.events']
    rutas_posibles = [
        '/etc/secrets/google-credentials.json',
        '/opt/render/project/src/google-credentials.json',
        'google-credentials.json'
    ]

    SERVICE_ACCOUNT_FILE = None
    for ruta in rutas_posibles:
        if os.path.exists(ruta):
            SERVICE_ACCOUNT_FILE = ruta
            break

    if not SERVICE_ACCOUNT_FILE:
        return None

    try:
        creds = service_account.Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE, scopes=SCOPES
        ).with_subject(correo_asignador)
        service = build('calendar', 'v3', credentials=creds)
        evento = {
            'summary': f"Inspección/Tarea: {titulo_proyecto}",
            'description': f"Tarea asignada desde Proeléctrica PMO:\n\n{descripcion}",
            'start': {'date': fecha},
            'end': {'date': fecha},
            'attendees': [{'email': correo_invitado}],
            'reminders': {'useDefault': False},
        }
        evento_creado = service.events().insert(
            calendarId='primary', body=evento, sendUpdates='all'
        ).execute()
        return evento_creado.get('htmlLink')
    except Exception as e:
        logger.error(f"❌ Error al crear el evento de Google Calendar: {e}")
        return None


# =================================================================
# 4. SEGURIDAD: AUTENTICACIÓN JWT Y DEPENDENCIAS
# =================================================================
JWT_AUDIENCE = "authenticated"  # 'aud' que Supabase asigna a los usuarios con sesión iniciada
ALGORITMOS_ASIMETRICOS = ("ES256", "RS256")
JWKS_INTERVALO_MIN = 30  # segundos mínimos entre descargas del JWKS
_PLACEHOLDER = re.compile(r"your|tu_|changeme|xxx|example|ejemplo", re.IGNORECASE)

# Caché en memoria de las claves públicas de Supabase (kid -> clave)
_jwks = {"claves": {}, "ultimo_intento": float("-inf"), "fallo": False}
bearer_scheme = HTTPBearer()


def validar_configuracion_seguridad():
    """
    Se ejecuta al arrancar la API. Es preferible no iniciar a iniciar con la API desprotegida
    (en Render, un arranque fallido mantiene la versión anterior en línea).
    """
    errores = []
    if not SUPABASE_URL and not SUPABASE_JWT_SECRET:
        errores.append("SUPABASE_URL no está configurada (se necesita para validar los tokens)")
    if SUPABASE_JWT_SECRET and _PLACEHOLDER.search(SUPABASE_JWT_SECRET):
        errores.append("SUPABASE_JWT_SECRET parece un marcador de posición (déjala vacía si tu proyecto usa ES256)")
    if len(WEBHOOK_SECRET) < 16 or _PLACEHOLDER.search(WEBHOOK_SECRET):
        errores.append("WEBHOOK_SECRET falta, tiene menos de 16 caracteres o parece un marcador de posición")
    if errores:
        raise RuntimeError("Configuración de seguridad inválida: " + "; ".join(errores))


def _clave_publica_supabase(kid: Optional[str]):
    """Clave pública (del JWKS de Supabase) con la que se firmó el token. Se cachea en memoria."""
    clave = _jwks["claves"].get(kid) if kid else None
    if clave is not None:
        return clave

    # Clave desconocida (primera petición o rotación de claves): se refresca el JWKS, como máximo una vez
    # cada JWKS_INTERVALO_MIN s, para que un 'kid' falso no provoque una descarga por cada llamada.
    ahora = time.monotonic()
    if ahora - _jwks["ultimo_intento"] >= JWKS_INTERVALO_MIN:
        _jwks["ultimo_intento"] = ahora
        try:
            resp = requests.get(f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json", timeout=5)
            resp.raise_for_status()
            claves = {}
            for jwk in resp.json().get("keys", []):
                try:
                    claves[jwk["kid"]] = jwt.PyJWK(jwk).key
                except Exception:
                    continue  # tipos de clave que no usamos
            _jwks["claves"] = claves
            _jwks["fallo"] = False
        except Exception as e:
            _jwks["fallo"] = True
            logger.error(f"❌ No se pudo descargar el JWKS de Supabase: {e}")
        clave = _jwks["claves"].get(kid) if kid else None
        if clave is not None:
            return clave

    if _jwks["fallo"] and not _jwks["claves"]:
        # Fallo de infraestructura, no del usuario: 503 (con 401 el frontend cerraría la sesión).
        raise HTTPException(status_code=503, detail="No se pudieron obtener las claves de Supabase. Reintenta en unos segundos.")
    raise HTTPException(status_code=401, detail="Token firmado con una clave desconocida.")


def get_current_user(credentials: HTTPAuthorizationCredentials = Security(bearer_scheme)) -> dict:
    """
    Valida el Bearer JWT emitido por Supabase y devuelve su payload (sub, email, role, ...).
    - ES256/RS256 (claves asimétricas, por defecto en proyectos nuevos): se verifica con el JWKS público.
    - HS256 (clave heredada): solo si SUPABASE_JWT_SECRET está configurado.
    Nunca se acepta un token sin verificar su firma, audiencia y expiración.
    """
    token = credentials.credentials
    try:
        cabecera = jwt.get_unverified_header(token)
        alg = cabecera.get("alg")
        if alg == "HS256" and SUPABASE_JWT_SECRET:
            clave = SUPABASE_JWT_SECRET
        elif alg in ALGORITMOS_ASIMETRICOS and SUPABASE_URL:
            clave = _clave_publica_supabase(cabecera.get("kid"))
        else:
            logger.warning(f"⚠️ Token rechazado: algoritmo '{alg}' sin configuración (SUPABASE_URL / SUPABASE_JWT_SECRET).")
            raise HTTPException(status_code=401, detail="Token JWT no soportado.")
        return jwt.decode(
            token, clave, algorithms=[alg], audience=JWT_AUDIENCE, options={"require": ["exp", "sub"]}
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token JWT expirado.")
    except jwt.InvalidTokenError as e:
        logger.warning(f"⚠️ Token rechazado: {e}")
        raise HTTPException(status_code=401, detail="Token JWT inválido.")


def verificar_webhook_secret(x_webhook_secret: Optional[str] = Header(default=None)):
    """Valida el header X-Webhook-Secret de los webhooks externos (formulario, macro VBA)."""
    if not WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Webhook no configurado en el servidor.")
    if not x_webhook_secret or not hmac.compare_digest(x_webhook_secret.encode(), WEBHOOK_SECRET.encode()):
        raise HTTPException(status_code=403, detail="Webhook secret inválido o ausente.")


def email_de_usuario(usuario: dict) -> str:
    return usuario.get("email") or usuario.get("sub", "sistema")


def nombre_de_usuario(usuario: dict) -> str:
    """Parte local del correo (ana.perez@proelectrica.net -> ana.perez): es el autor que ve la bitácora."""
    return email_de_usuario(usuario).split("@")[0]


# =================================================================
# 5. APP, CORS Y DEPENDENCIA DE BASE DE DATOS
# =================================================================
@asynccontextmanager
async def lifespan(_: FastAPI):
    validar_configuracion_seguridad()
    yield


app = FastAPI(title="API Proeléctrica", version="5.0", lifespan=lifespan)

# CORS estricto: solo el/los frontend(s) configurados, métodos y cabeceras explícitos.
# La autenticación va en el header Authorization (Bearer), no en cookies -> allow_credentials=False.
app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGENES_PERMITIDOS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def registrar_bitacora(proyecto: ProyectoDB, autor: str, texto: str) -> dict:
    """
    Agrega una entrada al final de la bitácora. El autor sale del token (o es 'Sistema') y la
    estampa de tiempo (UTC, ISO 8601) la pone el servidor: el cliente no puede falsificarlos.
    El proyecto debe haberse consultado con .with_for_update() para no perder entradas concurrentes.
    """
    entrada = {
        "id": int(time.time() * 1000),
        "autor": autor,
        "texto": texto,
        "fecha": datetime.now(timezone.utc).isoformat(timespec="milliseconds"),
    }
    proyecto.bitacora = (proyecto.bitacora or []) + [entrada]
    flag_modified(proyecto, "bitacora")
    return entrada


# =================================================================
# 6. ENDPOINTS
# =================================================================

# --- Proyectos ---

@app.get("/v1/proyectos", status_code=200)
def listar_proyectos(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    return db.query(ProyectoDB).order_by(ProyectoDB.id.desc()).all()


@app.post("/v1/proyectos/manual", status_code=201)
def crear_proyecto_manual(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    datos_base = {
        "tipo_registro": "Proyecto",
        "ubicacion": {"provincia": "", "canton": "", "distrito": "", "exacta": ""},
        "detalles_tecnicos": {"actividad": "", "codigo_ciiu": "", "cantidad_permisos": "", "area_m2": ""},
        "contacto": {"nombre": "", "telefono": ""},
        "propietario": {"nombre": "", "cedula": ""},
        "fecha_solicitud": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "moneda_presupuesto": "CRC",
        "moneda_cotizacion": "CRC",
        "resultados_proyecto": "",
        "talento_requerido": [],
        "otro_talento": "",
        "colaboradores": []
    }
    nuevo_proyecto = ProyectoDB(
        titulo_proyecto="Nuevo Proyecto",
        empresa_encargada="Proeléctrica",
        empresa_solicitante="Cliente por definir",
        correo_solicitante="",
        datos_dinamicos=datos_base,
        estado="Cotización"
    )
    registrar_bitacora(nuevo_proyecto, "Sistema", "Registro inicial creado.")
    db.add(nuevo_proyecto)
    db.commit()
    db.refresh(nuevo_proyecto)
    # Se devuelve el proyecto completo para que el frontend lo agregue a su caché sin volver a descargar la lista
    return {"status": "success", "id_proyecto": nuevo_proyecto.id, "proyecto": nuevo_proyecto}


@app.patch("/v1/proyectos/{id_proyecto}/gestion", status_code=200)
def actualizar_gestion_gc(
    id_proyecto: int,
    payload: GestionGC,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    proyecto = db.query(ProyectoDB).filter(ProyectoDB.id == id_proyecto).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    # Actualización parcial: solo los campos presentes en la petición (la bitácora no se toca desde aquí)
    campos_actualizables = {
        "titulo_proyecto": "titulo_proyecto",
        "empresa_encargada": "empresa_encargada",
        "empresa_solicitante": "empresa_solicitante",
        "correo_solicitante": "correo_solicitante",
        "estado": "estado",
        "monto_cotizado": "monto_cotizado",
        "pago": "pago",
        "inspector": "inspector",
        "fecha_programacion": "fecha_programacion",
        "fecha_inicio": "fecha_inicio",
        "fecha_fin": "fecha_fin",
        "presupuesto_gastos": "presupuesto_gastos",
        "salud_proyecto": "salud_proyecto",
        "progreso": "progreso",
        "archivos": "archivos",
        "datos_dinamicos": "datos_dinamicos",
    }

    datos_enviados = payload.model_dump(exclude_unset=True)
    for campo_payload, campo_modelo in campos_actualizables.items():
        if campo_payload in datos_enviados:
            setattr(proyecto, campo_modelo, datos_enviados[campo_payload])

    # Marcar campos JSON como modificados para que SQLAlchemy los detecte
    if "archivos" in datos_enviados:
        flag_modified(proyecto, "archivos")
    if "datos_dinamicos" in datos_enviados:
        flag_modified(proyecto, "datos_dinamicos")

    try:
        db.commit()
        db.refresh(proyecto)
    except Exception as e:
        logger.error(f"❌ Error al actualizar gestión: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    return {"status": "success", "proyecto": proyecto}


@app.delete("/v1/proyectos/{id_proyecto}", status_code=200)
def eliminar_proyecto(
    id_proyecto: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    proyecto = db.query(ProyectoDB).filter(ProyectoDB.id == id_proyecto).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    try:
        db.delete(proyecto)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    return {"status": "success", "message": "Proyecto eliminado"}


# --- Bitácora (endpoint aislado, append-only) ---

@app.post("/v1/proyectos/{id_proyecto}/bitacora", status_code=201)
def agregar_entrada_bitacora(
    id_proyecto: int,
    payload: EntradaBitacora,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Único camino para escribir en la bitácora desde el cliente: solo agrega, nunca reemplaza.
    Autor (desde el JWT) y estampa de tiempo UTC ISO 8601 los define el servidor.
    """
    proyecto = db.query(ProyectoDB).filter(ProyectoDB.id == id_proyecto).with_for_update().first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    entrada = registrar_bitacora(proyecto, nombre_de_usuario(current_user), payload.texto)

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    return {"status": "success", "entrada": entrada}


# --- Tareas ---

@app.post("/v1/proyectos/{id_proyecto}/tareas", status_code=201)
def crear_tarea(
    id_proyecto: int,
    payload: TareaCrear,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    proyecto = db.query(ProyectoDB).filter(ProyectoDB.id == id_proyecto).with_for_update().first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    # Autor extraído del token, no del payload del cliente
    email_asignador = email_de_usuario(current_user)
    nombre_asignador = nombre_de_usuario(current_user)

    titulo_ev = proyecto.titulo_proyecto if proyecto.titulo_proyecto else proyecto.empresa_solicitante
    enlace_cal = crear_evento_calendario(
        titulo_ev, payload.descripcion, payload.asignado_a, payload.fecha_limite, email_asignador
    )

    nueva_tarea = TareaDB(
        id_proyecto=id_proyecto,
        descripcion=payload.descripcion,
        asignado_a=payload.asignado_a,
        asignado_por=nombre_asignador,
        fecha_limite=payload.fecha_limite,
        enlace_calendario=enlace_cal
    )
    db.add(nueva_tarea)
    registrar_bitacora(
        proyecto, nombre_asignador,
        f"Asignó una nueva tarea a {payload.asignado_a}: '{payload.descripcion}' (Para el {payload.fecha_limite})"
    )

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    return {"status": "success"}


@app.patch("/v1/tareas/{id_tarea}", status_code=200)
def editar_tarea(
    id_tarea: int,
    payload: TareaActualizar,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    tarea = db.query(TareaDB).filter(TareaDB.id == id_tarea).first()
    if not tarea:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")

    datos_enviados = payload.model_dump(exclude_unset=True)
    cambios = []

    if "descripcion" in datos_enviados and tarea.descripcion != datos_enviados["descripcion"]:
        cambios.append(f"Descripción (de '{tarea.descripcion}' a '{datos_enviados['descripcion']}')")
        tarea.descripcion = datos_enviados["descripcion"]

    if "asignado_a" in datos_enviados and tarea.asignado_a != datos_enviados["asignado_a"]:
        cambios.append(f"Responsable (de '{tarea.asignado_a}' a '{datos_enviados['asignado_a']}')")
        tarea.asignado_a = datos_enviados["asignado_a"]

    if "fecha_limite" in datos_enviados and tarea.fecha_limite != datos_enviados["fecha_limite"]:
        cambios.append(f"Fecha (de '{tarea.fecha_limite}' a '{datos_enviados['fecha_limite']}')")
        tarea.fecha_limite = datos_enviados["fecha_limite"]

    if cambios:
        proyecto = db.query(ProyectoDB).filter(ProyectoDB.id == tarea.id_proyecto).with_for_update().first()
        if proyecto:
            registrar_bitacora(
                proyecto, nombre_de_usuario(current_user),
                f"Editó la tarea de inspección: Se modificó {', '.join(cambios)}."
            )

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    return {"status": "success"}


@app.get("/v1/proyectos/{id_proyecto}/tareas", status_code=200)
def listar_tareas_proyecto(
    id_proyecto: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    return db.query(TareaDB).filter(
        TareaDB.id_proyecto == id_proyecto
    ).order_by(TareaDB.id.desc()).all()


@app.get("/v1/tareas/operativo/{correo}", status_code=200)
def listar_mis_tareas(
    correo: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    resultados = (
        db.query(TareaDB, ProyectoDB.titulo_proyecto, ProyectoDB.empresa_solicitante)
        .outerjoin(ProyectoDB, TareaDB.id_proyecto == ProyectoDB.id)
        .filter(TareaDB.asignado_a == correo, TareaDB.estado == "Pendiente")
        .order_by(TareaDB.fecha_limite.asc())
        .all()
    )
    return [
        {
            "id": t.id, "proyecto": titulo or cliente or "Desconocido",
            "id_proyecto": t.id_proyecto, "descripcion": t.descripcion,
            "asignado_a": t.asignado_a, "asignado_por": t.asignado_por,
            "fecha_limite": t.fecha_limite, "enlace_calendario": t.enlace_calendario
        }
        for t, titulo, cliente in resultados
    ]


@app.get("/v1/tareas/activas", status_code=200)
def listar_todas_tareas_activas(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    resultados = (
        db.query(TareaDB, ProyectoDB.titulo_proyecto, ProyectoDB.empresa_solicitante)
        .outerjoin(ProyectoDB, TareaDB.id_proyecto == ProyectoDB.id)
        .filter(TareaDB.estado == "Pendiente")
        .order_by(TareaDB.fecha_limite.asc())
        .all()
    )
    return [
        {
            "id": t.id, "proyecto": titulo or cliente or "Desconocido",
            "id_proyecto": t.id_proyecto, "descripcion": t.descripcion,
            "asignado_a": t.asignado_a, "asignado_por": t.asignado_por,
            "fecha_limite": t.fecha_limite, "enlace_calendario": t.enlace_calendario
        }
        for t, titulo, cliente in resultados
    ]


@app.patch("/v1/tareas/{id_tarea}/completar", status_code=200)
def completar_tarea(
    id_tarea: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    tarea = db.query(TareaDB).filter(TareaDB.id == id_tarea).first()
    if not tarea:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")

    tarea.estado = "Completada"
    proyecto = db.query(ProyectoDB).filter(ProyectoDB.id == tarea.id_proyecto).with_for_update().first()
    if proyecto:
        registrar_bitacora(
            proyecto, nombre_de_usuario(current_user),
            f"Se marcó como COMPLETADA la tarea: '{tarea.descripcion}'"
        )

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    return {"status": "success"}


# --- Webhooks (protegidos con Shared Secret, sin autenticación JWT de usuario) ---

@app.post("/v1/proyectos/webhook-forms", status_code=201, dependencies=[Depends(verificar_webhook_secret)])
def recibir_datos_formulario(
    payload: FormularioSolicitud,
    db: Session = Depends(get_db)
):
    fecha_limpia = payload.fecha_solicitud[:10] if payload.fecha_solicitud else datetime.now(timezone.utc).strftime("%Y-%m-%d")
    datos_dinamicos_json = {
        "tipo_registro": "Verificacion",
        "ubicacion": payload.ubicacion.model_dump(),
        "detalles_tecnicos": payload.detalles_tecnicos.model_dump(),
        "contacto": payload.contacto.model_dump(),
        "propietario": payload.propietario.model_dump(),
        "seguimiento_inspeccion": payload.seguimiento_inspeccion,
        "fecha_solicitud": fecha_limpia,
        "cancelacion_pago": "No",
        "moneda_cotizacion": "CRC"
    }
    nuevo_proyecto = ProyectoDB(
        empresa_encargada="UVIE Proeléctrica",
        empresa_solicitante=payload.empresa_solicitante,
        correo_solicitante=payload.correo_solicitante,
        datos_dinamicos=datos_dinamicos_json,
        estado="Nueva Solicitud"
    )
    registrar_bitacora(nuevo_proyecto, "Sistema", "Registro inicial creado.")
    db.add(nuevo_proyecto)
    try:
        db.commit()
        db.refresh(nuevo_proyecto)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    return {"status": "success", "id_proyecto": nuevo_proyecto.id}


@app.post("/v1/proyectos/actualizar-codigo", status_code=200, dependencies=[Depends(verificar_webhook_secret)])
def actualizar_codigo_vba(
    payload: ActualizacionVBA,
    db: Session = Depends(get_db)
):
    proyecto = db.query(ProyectoDB).filter(ProyectoDB.id == payload.id_proyecto).with_for_update().first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    proyecto.identificador_solicitud = payload.codigo_solicitud
    proyecto.estado = "Oferta Generada"
    registrar_bitacora(
        proyecto, "Sistema (VBA Automático)",
        f"Se asignó el documento oficial: {payload.codigo_solicitud}. El estado cambió a 'Oferta Generada'."
    )

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    return {"status": "success", "message": "Código y estado actualizados"}
