// src/utils/constants.js

export const comunInputSx = { '& .MuiInputBase-root': { fontSize: '0.875rem' } };
export const comunMenuSx = { fontSize: '0.875rem' };

export const EQUIPO_PROELECTRICA = [
    { nombre: "Denic Murillo Murillo", correo: "dmurillo@proelectrica.net" },
    { nombre: "Andrey Castro Herrera", correo: "acastro@proelectrica.net" },
    { nombre: "Seidy Ortega Pérez", correo: "sortega@proelectrica.net" },
    { nombre: "Jeffry Molina Aguilar", correo: "jmolina@proelectrica.net" },
    { nombre: "Allan Gómez Chavarría", correo: "agomez@proelectrica.net" }
];

export const EMPRESAS_ENCARGADAS = ["Proeléctrica", "Edificaciones", "Investigaciones"];
export const OPCIONES_SINO = ["Sí", "No"];
export const OPCIONES_PAGO = ["Pendiente", "Adelanto y Abonos", "Cancelado"];
export const ESTADOS_PROYECTO = ["Cotización", "Adjudicado", "En progreso", "Revisión por parte del cliente", "Completado y listo para facturar", "Facturado y pendiente de pago", "Pago recibido y proyecto archivado", "No se ejecutó. Proyecto archivado"];
export const ESTADOS_PROGRESO_BLOQUEADO = ["Cotización", "Adjudicado", "Nueva Solicitud", "Oferta Generada"];
export const SALUD_OPCIONES = ["Saludable", "Necesita atención", "En peligro"];
export const TALENTO_OPCIONES = ["Director de Proyecto", "Jefe de Cuadrilla", "Diseñador Eléctrico", "Diseñador Mecánico", "Técnico Electricista", "Ayudante", "Maestro de Obras", "Inspector eléctrico", "Inspector mecánico", "Dibujante"];
export const ESTADOS_VERIFICACION = ["Nueva Solicitud", "Oferta Generada", "Pendiente de pago", "Adjudicado y pagado", "Asignado y programado", "Elaboración de informe", "En revisión del Verificador", "Finalizado y entregado", "Archivado no adjudicado"];
export const SEGUIMIENTO_VERIFICACION = ["Primera inspección", "Reinspección"];
export const PROVINCIAS = ["San José", "Alajuela", "Cartago", "Heredia", "Guanacaste", "Puntarenas", "Limón"];
export const COLORES_GRAFICOS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#f43f5e', '#64748b'];

export const isProyectoApp = (p) => p?.datos_dinamicos?.tipo_registro === 'Proyecto' || p?.datos_dinamicos?.seguimiento_inspeccion === 'Ingreso Manual';

export const safeParseMonto = (val) => {
    if (!val) return 0;
    const num = Number(String(val).replace(/[^0-9.-]+/g, ""));
    return isNaN(num) ? 0 : num;
};

export const getFechaOrdenamiento = (p) => {
    if (isProyectoApp(p)) return p.fecha_inicio || p.datos_dinamicos?.fecha_solicitud || '1970-01-01';
    return p.datos_dinamicos?.fecha_solicitud || p.fecha_programacion || '1970-01-01';
};

const currentYear = new Date().getFullYear();
export const defaultStartDate = `${currentYear}-01-01`;
export const defaultEndDate = `${currentYear}-12-31`;