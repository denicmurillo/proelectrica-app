from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, JSON, BIGINT, Date, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from typing import List, Optional
from datetime import datetime
import time
import os

# --- LIBRERÍAS DE GOOGLE CALENDAR ---
from google.oauth2 import service_account
from googleapiclient.discovery import build

# =================================================================
# 1. BASE DE DATOS Y MODELOS
# =================================================================
SQLALCHEMY_DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./proelectrica.db")
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {})
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
    created_at = Column(String, default=lambda: datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

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

class GestionGC(BaseModel):
    titulo_proyecto: Optional[str] = ""
    empresa_encargada: Optional[str] = "Proeléctrica"
    empresa_solicitante: str
    correo_solicitante: Optional[str] = ""
    estado: str
    seguimiento: str
    monto_cotizado: str
    pago: str
    inspector: str
    fecha_programacion: Optional[str] = ""
    fecha_inicio: Optional[str] = ""
    fecha_fin: Optional[str] = ""
    presupuesto_gastos: Optional[str] = ""
    salud_proyecto: Optional[str] = "Saludable"
    progreso: Optional[int] = 0
    bitacora: List[dict]
    archivos: List[dict] = []
    datos_dinamicos: dict

class TareaCrear(BaseModel):
    descripcion: str
    asignado_a: str
    asignado_por: str
    correo_asignador: str
    fecha_limite: str

# =================================================================
# 3. MOTOR DE GOOGLE CALENDAR
# =================================================================
def crear_evento_calendario(titulo_proyecto: str, descripcion: str, correo_invitado: str, fecha: str, correo_asignador: str):
    """Crea un evento asumiendo la identidad del usuario conectado"""
    SERVICE_ACCOUNT_FILE = 'google-credentials.json'
    SCOPES = ['https://www.googleapis.com/auth/calendar.events']
    
    if not os.path.exists(SERVICE_ACCOUNT_FILE):
        print("⚠️ ADVERTENCIA: No se encontró 'google-credentials.json'.")
        return None
        
    try:
        # El robot asume la identidad de quien asigna la tarea
        creds = service_account.Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE, 
            scopes=SCOPES
        ).with_subject(correo_asignador)
        
        service = build('calendar', 'v3', credentials=creds)
        
        evento = {
            'summary': f"Inspección/Tarea: {titulo_proyecto}",
            'description': f"Tarea asignada desde Proeléctrica PMO:\n\n{descripcion}",
            'start': {
                'dateTime': f"{fecha}T08:00:00-06:00",
                'timeZone': 'America/Costa_Rica',
            },
            'end': {
                'dateTime': f"{fecha}T17:00:00-06:00",
                'timeZone': 'America/Costa_Rica',
            },
            'attendees': [{'email': correo_invitado}],
            'reminders': {
                'useDefault': False,
                'overrides': [
                    {'method': 'popup', 'minutes': 870}, 
                    {'method': 'email', 'minutes': 870},
                ]
            },
        }
        
        evento_creado = service.events().insert(calendarId='primary', body=evento, sendUpdates='all').execute()
        return evento_creado.get('htmlLink')
        
    except Exception as e:
        print(f"❌ Error al crear el evento de Google Calendar: {e}")
        return None

# =================================================================
# 4. APP Y RUTAS (ENDPOINTS)
# =================================================================
app = FastAPI(title="API Proeléctrica", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- RUTAS DE PROYECTOS ---
@app.get("/v1/proyectos", status_code=200)
async def listar_proyectos(db: Session = Depends(get_db)):
    return db.query(ProyectoDB).order_by(ProyectoDB.id.desc()).all()

@app.post("/v1/proyectos/manual", status_code=201)
async def crear_proyecto_manual(db: Session = Depends(get_db)):
    try:
        datos_base = {
            "tipo_registro": "Proyecto",
            "ubicacion": {"provincia": "", "canton": "", "distrito": "", "exacta": ""},
            "detalles_tecnicos": {"actividad": "", "codigo_ciiu": "", "cantidad_permisos": "", "area_m2": ""},
            "contacto": {"nombre": "", "telefono": ""},
            "propietario": {"nombre": "", "cedula": ""},
            "fecha_solicitud": datetime.now().strftime("%Y-%m-%d"),
            "moneda_presupuesto": "CRC",
            "moneda_cotizacion": "CRC",
            "resultados_proyecto": "",
            "talento_requerido": [],
            "otro_talento": "",
            "colaboradores": []
        }
        nuevo_proyecto = ProyectoDB(
            titulo_proyecto="Nuevo Proyecto", empresa_encargada="Proeléctrica", empresa_solicitante="Cliente por definir", correo_solicitante="",
            datos_dinamicos=datos_base, estado="Cotización"
        )
        db.add(nuevo_proyecto)
        db.commit()
        db.refresh(nuevo_proyecto)
        return {"status": "success", "id_proyecto": nuevo_proyecto.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/v1/proyectos/{id_proyecto}/gestion", status_code=200)
async def actualizar_gestion_gc(id_proyecto: int, payload: GestionGC, db: Session = Depends(get_db)):
    try:
        proyecto = db.query(ProyectoDB).filter(ProyectoDB.id == id_proyecto).first()
        if not proyecto: raise HTTPException(status_code=404, detail="Proyecto no encontrado")
        
        proyecto.titulo_proyecto = payload.titulo_proyecto
        proyecto.empresa_encargada = payload.empresa_encargada
        proyecto.empresa_solicitante = payload.empresa_solicitante
        proyecto.correo_solicitante = payload.correo_solicitante
        proyecto.estado = payload.estado
        proyecto.monto_cotizado = payload.monto_cotizado
        proyecto.pago = payload.pago
        proyecto.inspector = payload.inspector
        proyecto.fecha_programacion = payload.fecha_programacion
        proyecto.fecha_inicio = payload.fecha_inicio
        proyecto.fecha_fin = payload.fecha_fin
        proyecto.presupuesto_gastos = payload.presupuesto_gastos
        proyecto.salud_proyecto = payload.salud_proyecto
        proyecto.progreso = payload.progreso
        proyecto.bitacora = payload.bitacora
        proyecto.archivos = payload.archivos
        proyecto.datos_dinamicos = payload.datos_dinamicos
        
        db.commit()
        return {"status": "success"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# --- RUTAS DE TAREAS ---
@app.post("/v1/proyectos/{id_proyecto}/tareas", status_code=201)
async def crear_tarea(id_proyecto: int, payload: TareaCrear, db: Session = Depends(get_db)):
    try:
        proyecto = db.query(ProyectoDB).filter(ProyectoDB.id == id_proyecto).first()
        if not proyecto: raise HTTPException(status_code=404, detail="Proyecto no encontrado")
        
        titulo_ev = proyecto.titulo_proyecto if proyecto.titulo_proyecto else proyecto.empresa_solicitante
        enlace_cal = crear_evento_calendario(titulo_ev, payload.descripcion, payload.asignado_a, payload.fecha_limite, payload.correo_asignador)
        
        nueva_tarea = TareaDB(
            id_proyecto=id_proyecto,
            descripcion=payload.descripcion,
            asignado_a=payload.asignado_a,
            asignado_por=payload.asignado_por,
            fecha_limite=payload.fecha_limite,
            enlace_calendario=enlace_cal
        )
        db.add(nueva_tarea)
        
        bitacora_actual = proyecto.bitacora if proyecto.bitacora else []
        nuevo_log = {
            "id": int(time.time() * 1000),
            "autor": payload.asignado_por,
            "texto": f"Asignó una nueva tarea a {payload.asignado_a}: '{payload.descripcion}' (Para el {payload.fecha_limite})",
            "fecha": datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        }
        proyecto.bitacora = bitacora_actual + [nuevo_log]
        
        db.commit()
        return {"status": "success", "message": "Tarea creada y notificada exitosamente"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/v1/proyectos/{id_proyecto}/tareas", status_code=200)
async def listar_tareas_proyecto(id_proyecto: int, db: Session = Depends(get_db)):
    return db.query(TareaDB).filter(TareaDB.id_proyecto == id_proyecto).order_by(TareaDB.id.desc()).all()

@app.get("/v1/tareas/operativo/{correo}", status_code=200)
async def listar_mis_tareas(correo: str, db: Session = Depends(get_db)):
    tareas = db.query(TareaDB).filter(TareaDB.asignado_a == correo, TareaDB.estado == 'Pendiente').order_by(TareaDB.fecha_limite.asc()).all()
    resultado = []
    for t in tareas:
        proy = db.query(ProyectoDB).filter(ProyectoDB.id == t.id_proyecto).first()
        nombre_proy = proy.titulo_proyecto if proy.titulo_proyecto else proy.empresa_solicitante if proy else "Desconocido"
        resultado.append({
            "id": t.id,
            "proyecto": nombre_proy,
            "id_proyecto": t.id_proyecto,
            "descripcion": t.descripcion,
            "asignado_por": t.asignado_por,
            "fecha_limite": t.fecha_limite,
            "enlace_calendario": t.enlace_calendario
        })
    return resultado

@app.put("/v1/tareas/{id_tarea}/completar", status_code=200)
async def completar_tarea(id_tarea: int, db: Session = Depends(get_db)):
    try:
        tarea = db.query(TareaDB).filter(TareaDB.id == id_tarea).first()
        if not tarea: raise HTTPException(status_code=404, detail="Tarea no encontrada")
        
        tarea.estado = "Completada"
        
        proyecto = db.query(ProyectoDB).filter(ProyectoDB.id == tarea.id_proyecto).first()
        if proyecto:
            bitacora_actual = proyecto.bitacora if proyecto.bitacora else []
            nuevo_log = {
                "id": int(time.time() * 1000),
                "autor": "Sistema",
                "texto": f"Se marcó como COMPLETADA la tarea: '{tarea.descripcion}'",
                "fecha": datetime.now().strftime("%d/%m/%Y %H:%M:%S")
            }
            proyecto.bitacora = bitacora_actual + [nuevo_log]
            
        db.commit()
        return {"status": "success"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))