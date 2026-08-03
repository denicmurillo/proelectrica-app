from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, JSON
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from typing import List
from datetime import datetime
import time

# ==========================================
# 1. BASE DE DATOS Y MODELOS
# ==========================================
SQLALCHEMY_DATABASE_URL = "sqlite:///./proelectrica.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
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
    
    # --- CAMPOS COMPARTIDOS GESTIÓN GC ---
    inspector = Column(String, nullable=True)
    monto_cotizado = Column(String, nullable=True)
    pago = Column(String, default="Pendiente")
    bitacora = Column(JSON, default=[]) 
    archivos = Column(JSON, default=[]) 
    
    # --- CAMPOS PMO / PROYECTOS ---
    titulo_proyecto = Column(String, nullable=True)
    fecha_programacion = Column(String, nullable=True)
    fecha_inicio = Column(String, nullable=True)
    fecha_fin = Column(String, nullable=True)
    presupuesto_gastos = Column(String, nullable=True)
    utilidad_esperada = Column(String, nullable=True)
    salud_proyecto = Column(String, default="Saludable")
    progreso = Column(Integer, default=0)

Base.metadata.create_all(bind=engine)

# ==========================================
# 2. ESQUEMAS PYDANTIC (VALIDACIÓN)
# ==========================================
class Ubicacion(BaseModel):
    provincia: str
    canton: str
    distrito: str
    exacta: str

class DetallesTecnicos(BaseModel):
    actividad: str
    codigo_ciiu: str | None = ""
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
    titulo_proyecto: str | None = ""
    empresa_encargada: str | None = "Proeléctrica" 
    empresa_solicitante: str 
    correo_solicitante: str | None = "" 
    estado: str
    seguimiento: str
    monto_cotizado: str
    pago: str
    inspector: str
    fecha_programacion: str | None = ""
    fecha_inicio: str | None = ""
    fecha_fin: str | None = ""
    presupuesto_gastos: str | None = ""
    utilidad_esperada: str | None = ""
    salud_proyecto: str | None = "Saludable"
    progreso: int | None = 0
    bitacora: List[dict]
    archivos: List[dict] = []
    datos_dinamicos: dict 

# ==========================================
# 3. APP Y RUTAS (ENDPOINTS)
# ==========================================
app = FastAPI(title="API Proeléctrica", version="1.0.0")

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

@app.post("/v1/proyectos/webhook-forms", status_code=201)
async def recibir_datos_formulario(payload: FormularioSolicitud, db: Session = Depends(get_db)):
    try:
        fecha_limpia = payload.fecha_solicitud[:10] if payload.fecha_solicitud else datetime.now().strftime("%Y-%m-%d")
        
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
        db.add(nuevo_proyecto)
        db.commit()
        db.refresh(nuevo_proyecto)
        return {"status": "success", "id_proyecto": nuevo_proyecto.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/v1/proyectos/actualizar-codigo", status_code=200)
async def actualizar_codigo_vba(payload: ActualizacionVBA, db: Session = Depends(get_db)):
    try:
        proyecto = db.query(ProyectoDB).filter(ProyectoDB.id == payload.id_proyecto).first()
        if not proyecto:
            raise HTTPException(status_code=404, detail="Proyecto no encontrado")
            
        proyecto.identificador_solicitud = payload.codigo_solicitud
        proyecto.estado = "Solicitud Generada" # <--- CAMBIO AUTOMÁTICO DE ESTADO
        
        # Inyectamos log a la bitácora
        bitacora_actual = proyecto.bitacora if proyecto.bitacora else []
        nuevo_log = {
            "id": int(time.time() * 1000),
            "autor": "Sistema (VBA Automático)",
            "texto": f"Se asignó el documento oficial: {payload.codigo_solicitud}. El proyecto avanzó a 'Solicitud Generada'.",
            "fecha": datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        }
        proyecto.bitacora = bitacora_actual + [nuevo_log]

        db.commit()
        return {"status": "success", "message": "Código y estado actualizados"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/v1/proyectos/manual", status_code=201)
async def crear_proyecto_manual(db: Session = Depends(get_db)):
    try:
        datos_base = {
            "tipo_registro": "Proyecto",
            "ubicacion": {"provincia": "San José", "canton": "", "distrito": "", "exacta": ""},
            "detalles_tecnicos": {"actividad": "", "codigo_ciiu": "", "cantidad_permisos": "", "area_m2": ""},
            "contacto": {"nombre": "", "telefono": ""},
            "propietario": {"nombre": "", "cedula": ""},
            "fecha_solicitud": datetime.now().strftime("%Y-%m-%d"),
            "moneda_presupuesto": "CRC",
            "moneda_cotizacion": "CRC",
            "resultados_proyecto": "",
            "talento_requerido": [],
            "otro_talento": ""
        }
        nuevo_proyecto = ProyectoDB(
            titulo_proyecto="Nuevo Proyecto", 
            empresa_encargada="Proeléctrica",
            empresa_solicitante="Cliente por definir",
            correo_solicitante="",
            datos_dinamicos=datos_base,
            estado="Cotización" 
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
        if not proyecto:
            raise HTTPException(status_code=404, detail="Proyecto no encontrado")
        
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
        proyecto.utilidad_esperada = payload.utilidad_esperada
        proyecto.salud_proyecto = payload.salud_proyecto
        proyecto.progreso = payload.progreso
        proyecto.bitacora = payload.bitacora
        proyecto.archivos = payload.archivos
        proyecto.datos_dinamicos = payload.datos_dinamicos
        
        db.commit()
        return {"status": "success", "message": "Gestión actualizada correctamente"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/v1/proyectos", status_code=200)
async def listar_proyectos(db: Session = Depends(get_db)):
    return db.query(ProyectoDB).order_by(ProyectoDB.id.desc()).all()