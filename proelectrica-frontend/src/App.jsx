import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import {
  Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, AppBar, Toolbar,
  Dialog, DialogTitle, DialogContent, Box, Button, Divider,
  TextField, MenuItem, List, ListItem, ListItemText, ListItemAvatar, Avatar, IconButton,
  Tabs, Tab, ListItemButton, Slider, Tooltip, ToggleButton, ToggleButtonGroup, Card, CardContent,
  CircularProgress
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import EditDocumentIcon from '@mui/icons-material/EditDocument';
import SendIcon from '@mui/icons-material/Send';
import LogoutIcon from '@mui/icons-material/Logout';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

// =================================================================
// GRÁFICOS NATIVOS: MUI X CHARTS
// =================================================================
import { PieChart } from '@mui/x-charts/PieChart';
import { BarChart } from '@mui/x-charts/BarChart';

// =================================================================
// ENTORNO Y CREDENCIALES
// =================================================================
const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_APP_ID = import.meta.env.VITE_GOOGLE_APP_ID || '';

// --- CREDENCIALES SUPABASE AUTH ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =================================================================
// CONSTANTES Y ESTILOS GLOBALES
// =================================================================
const comunInputSx = { '& .MuiInputBase-root': { fontSize: '0.875rem' } };
const comunMenuSx = { fontSize: '0.875rem' };

const EQUIPO_PROELECTRICA = [
  "Denic Murillo Murillo",
  "Andrey Castro Herrera",
  "Seidy Ortega Pérez",
  "Jeffry Molina Aguilar",
  "Allan Gómez Chavarría"
];

const EMPRESAS_ENCARGADAS = ["Proeléctrica", "Edificaciones", "Investigaciones"];
const OPCIONES_SINO = ["Sí", "No"];
const OPCIONES_PAGO = ["Pendiente", "Adelanto y Abonos", "Cancelado"];

const ESTADOS_PROYECTO = [
  "Cotización", "Adjudicado", "En progreso", "Revisión por parte del cliente",
  "Completado y listo para facturar", "Facturado y pendiente de pago",
  "Pago recibido y proyecto archivado", "No se ejecutó. Proyecto archivado"
];
const ESTADOS_PROGRESO_BLOQUEADO = ["Cotización", "Adjudicado", "Nueva Solicitud", "Solicitud Generada"];
const SALUD_OPCIONES = ["Saludable", "Necesita atención", "En peligro"];
const TALENTO_OPCIONES = [
  "Director de Proyecto", "Jefe de Cuadrilla", "Diseñador Eléctrico",
  "Diseñador Mecánico", "Técnico Electricista", "Ayudante",
  "Maestro de Obras", "Inspector eléctrico", "Inspector mecánico", "Dibujante"
];

const ESTADOS_VERIFICACION = [
  "Nueva Solicitud", "Solicitud Generada", "Pendiente de pago", "Adjudicado y pagado",
  "Asignado y programado", "Elaboración de informe", "En revisión del Verificador",
  "Finalizado y entregado", "Archivado no adjudicado"
];
const SEGUIMIENTO_VERIFICACION = ["Primera inspección", "Reinspección"];
const PROVINCIAS = ["San José", "Alajuela", "Cartago", "Heredia", "Guanacaste", "Puntarenas", "Limón"];
const COLORES_GRAFICOS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#f43f5e', '#64748b'];

const isProyectoApp = (p) => p?.datos_dinamicos?.tipo_registro === 'Proyecto' || p?.datos_dinamicos?.seguimiento_inspeccion === 'Ingreso Manual';
const safeParseMonto = (val) => {
  if (!val) return 0;
  const num = Number(String(val).replace(/[^0-9.-]+/g, ""));
  return isNaN(num) ? 0 : num;
};

const getFechaOrdenamiento = (p) => {
  if (isProyectoApp(p)) return p.fecha_inicio || p.datos_dinamicos?.fecha_solicitud || '1970-01-01';
  return p.datos_dinamicos?.fecha_solicitud || p.fecha_programacion || '1970-01-01';
};

// =================================================================
// COMPONENTE VISUAL: LOGIN
// =================================================================
const LoginScreen = ({ setSession }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg('Credenciales inválidas. Por favor, verifica tu correo y contraseña.');
      setLoading(false);
    } else {
      setSession(data.session);
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
      <Paper elevation={3} sx={{ p: 5, maxWidth: '400px', width: '100%', borderRadius: '12px', textAlign: 'center' }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <img src="/logo.png" alt="Proeléctrica" style={{ height: '60px' }} onError={(e) => { e.target.style.display = 'none'; }} />
        </Box>
        <Typography variant="h5" fontWeight="bold" color="#1e293b" gutterBottom>Acceso al Sistema</Typography>
        <Typography variant="body2" color="textSecondary" mb={4}>Ingresa tus credenciales corporativas</Typography>

        {errorMsg && (
          <Box sx={{ backgroundColor: '#fef2f2', border: '1px solid #fecdd3', p: 1.5, borderRadius: '6px', mb: 3 }}>
            <Typography variant="body2" color="#e11d48">{errorMsg}</Typography>
          </Box>
        )}

        <form onSubmit={handleLogin}>
          <TextField fullWidth label="Correo Electrónico" variant="outlined" margin="normal" value={email} onChange={(e) => setEmail(e.target.value)} required type="email" />
          <TextField fullWidth label="Contraseña" variant="outlined" margin="normal" value={password} onChange={(e) => setPassword(e.target.value)} required type="password" sx={{ mb: 3 }} />

          <Button fullWidth type="submit" variant="contained" color="primary" size="large" disabled={loading} startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LockOutlinedIcon />} sx={{ borderRadius: '8px', py: 1.2, fontWeight: 'bold', textTransform: 'none' }}>
            {loading ? 'Verificando...' : 'Iniciar Sesión'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

// =================================================================
// COMPONENTE VISUAL: DASHBOARD ESTRATÉGICO
// =================================================================
const DashboardTab = ({ proyectos, vistaDashboard, setVistaDashboard, abrirFicha }) => {
  const [empresaFiltroGerencia, setEmpresaFiltroGerencia] = useState('Todas');

  const calcularMetricasGerencia = () => {
    let cuentasPorCobrar = 0; let totalFiltrado = 0; const conteoEmpresas = {};
    proyectos.forEach(p => {
      const monto = safeParseMonto(p.monto_cotizado);
      const empresa = !isProyectoApp(p) ? (p.empresa_encargada || "UVIE Proeléctrica") : (p.empresa_encargada || "Sin Asignar");
      const estadoSeguro = p.estado || '';

      conteoEmpresas[empresa] = (conteoEmpresas[empresa] || 0) + 1;
      const pasaFiltro = empresaFiltroGerencia === 'Todas' || empresa === empresaFiltroGerencia;

      if (pasaFiltro) {
        totalFiltrado++;
        if (["Facturado y pendiente de pago", "Pendiente de pago"].includes(estadoSeguro)) {
          cuentasPorCobrar += monto;
        }
      }
    });
    const pieData = Object.keys(conteoEmpresas).map((key, index) => ({ id: index, label: key, value: conteoEmpresas[key], color: COLORES_GRAFICOS[index % COLORES_GRAFICOS.length] })).filter(d => d.value > 0);
    return { cuentasPorCobrar, pieData, total: totalFiltrado };
  };

  const calcularMetricasPMO = () => {
    const pmoProyectos = proyectos.filter(p => isProyectoApp(p) && !(p.estado || '').includes('archivado'));
    const saludCont = { "Saludable": 0, "Necesita atención": 0, "En peligro": 0 };
    const talentoCont = {}; const proyectosCercaVencimiento = []; const proyectosEnRiesgo = [];
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);

    pmoProyectos.forEach(p => {
      const salud = p.salud_proyecto || 'Saludable';
      saludCont[salud] += 1;
      if (salud === 'Necesita atención' || salud === 'En peligro') proyectosEnRiesgo.push({ id: p.id, titulo: p.titulo_proyecto, salud });

      const talentos = p.datos_dinamicos?.talento_requerido || [];
      if (Array.isArray(talentos)) talentos.forEach(t => { talentoCont[t] = (talentoCont[t] || 0) + 1; });

      if (p.fecha_fin && !["Completado y listo para facturar", "Facturado y pendiente de pago"].includes(p.estado)) {
        const parts = p.fecha_fin.split(/[-/]/);
        if (parts.length === 3) {
          const year = parts[0].length === 4 ? parts[0] : parts[2];
          const month = parts[0].length === 4 ? parts[1] : parts[1];
          const day = parts[0].length === 4 ? parts[2] : parts[0];
          const fechaFinObj = new Date(year, month - 1, day);
          const diasFaltantes = Math.ceil((fechaFinObj.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
          if (diasFaltantes <= 14) proyectosCercaVencimiento.push({ id: p.id, titulo: p.titulo_proyecto, diasFaltantes });
        }
      }
    });

    proyectosCercaVencimiento.sort((a, b) => a.diasFaltantes - b.diasFaltantes);
    const saludData = Object.keys(saludCont).map((key, index) => ({ id: index, label: key, value: saludCont[key], color: key === 'Saludable' ? '#10b981' : key === 'Necesita atención' ? '#f59e0b' : '#f43f5e' })).filter(d => d.value > 0);
    const talentoData = Object.keys(talentoCont).map(key => ({ name: key, value: talentoCont[key] })).filter(d => d.value > 0).sort((a, b) => b.value - a.value).slice(0, 5);

    return { saludData, talentoData, proyectosCercaVencimiento, proyectosEnRiesgo, totalActivos: pmoProyectos.length };
  };

  const calcularMetricasGC = () => {
    const verifProyectos = proyectos.filter(p => !isProyectoApp(p));
    const estadosCont = {}; const seguimientoCont = { "Primera inspección": 0, "Reinspección": 0 };
    let alertasVBA = 0; const informesPendientes = [];
    const estadosFlujoCalidad = ["Adjudicado y pagado", "Asignado y programado", "Elaboración de informe", "En revisión del Verificador"];

    verifProyectos.forEach(p => {
      const estadoSeguro = p.estado || 'Sin Estado';
      estadosCont[estadoSeguro] = (estadosCont[estadoSeguro] || 0) + 1;
      if (p.datos_dinamicos?.seguimiento_inspeccion) seguimientoCont[p.datos_dinamicos.seguimiento_inspeccion] = (seguimientoCont[p.datos_dinamicos.seguimiento_inspeccion] || 0) + 1;
      if (estadoSeguro === 'Nueva Solicitud' || !p.identificador_solicitud) alertasVBA += 1;
      if (estadosFlujoCalidad.includes(estadoSeguro)) informesPendientes.push({ id: p.id, identificador: p.identificador_solicitud || 'Sin ID', cliente: p.empresa_solicitante || 'Sin Nombre', estado: estadoSeguro });
    });

    const estadosData = Object.keys(estadosCont).map(key => ({ name: key, value: estadosCont[key] })).filter(d => d.value > 0).sort((a, b) => a.value - b.value);
    const segData = Object.keys(seguimientoCont).map((key, index) => ({ id: index, label: key, value: seguimientoCont[key], color: key === 'Reinspección' ? '#f43f5e' : '#0ea5e9' })).filter(d => d.value > 0);

    return { estadosData, segData, informesPendientes, alertasVBA };
  };

  const mGerencia = calcularMetricasGerencia();
  const mPMO = calcularMetricasPMO();
  const mGC = calcularMetricasGC();

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, flexGrow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1e293b' }}>Panel Estratégico Interactivo</Typography>
        <ToggleButtonGroup color="primary" value={vistaDashboard} exclusive onChange={(e, val) => { if (val) setVistaDashboard(val); }} size="small" sx={{ backgroundColor: '#fff' }}>
          <ToggleButton value="Gerencia" sx={{ px: 3, fontWeight: 'bold', textTransform: 'none' }}>Gerencia</ToggleButton>
          <ToggleButton value="PMO" sx={{ px: 3, fontWeight: 'bold', textTransform: 'none' }}>PMO</ToggleButton>
          <ToggleButton value="GC" sx={{ px: 3, fontWeight: 'bold', textTransform: 'none' }}>Calidad (GC)</ToggleButton>
          <ToggleButton value="Operativo" sx={{ px: 3, fontWeight: 'bold', textTransform: 'none' }}>Operativo</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {vistaDashboard === 'Gerencia' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
            <TextField select size="small" label="Filtrar por Empresa" value={empresaFiltroGerencia} onChange={(e) => setEmpresaFiltroGerencia(e.target.value)} sx={{ width: '250px', backgroundColor: '#fff', ...comunInputSx }}>
              <MenuItem value="Todas" sx={comunMenuSx}>Todas las Empresas</MenuItem>
              {EMPRESAS_ENCARGADAS.map(e => <MenuItem key={e} value={e} sx={comunMenuSx}>{e}</MenuItem>)}
              <MenuItem value="UVIE Proeléctrica" sx={comunMenuSx}>UVIE Proeléctrica</MenuItem>
              <MenuItem value="Sin Asignar" sx={comunMenuSx}>Sin Asignar</MenuItem>
            </TextField>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <Card elevation={1} sx={{ borderRadius: '12px', borderTop: '4px solid #f43f5e' }}><CardContent><Typography color="textSecondary" variant="subtitle2" fontWeight="bold">Cuentas por Cobrar ({empresaFiltroGerencia})</Typography><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><AccountBalanceWalletIcon sx={{ color: '#f43f5e', fontSize: 32 }} /><Typography variant="h4" fontWeight="bold" color="#1e293b">₡ {mGerencia.cuentasPorCobrar.toLocaleString('es-CR')}</Typography></Box></CardContent></Card>
            <Card elevation={1} sx={{ borderRadius: '12px', borderTop: '4px solid #8b5cf6' }}><CardContent><Typography color="textSecondary" variant="subtitle2" fontWeight="bold">Volumen Operaciones ({empresaFiltroGerencia})</Typography><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><AssignmentTurnedInIcon sx={{ color: '#8b5cf6', fontSize: 32 }} /><Typography variant="h4" fontWeight="bold" color="#1e293b">{mGerencia.total} Registros</Typography></Box></CardContent></Card>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <Paper elevation={1} sx={{ p: 3, borderRadius: '12px', minHeight: '350px', display: 'flex', flexDirection: 'column' }}><Typography variant="subtitle1" fontWeight="bold" color="#1e293b" mb={2}>Distribución por Empresa Encargada</Typography>{mGerencia.pieData.length > 0 ? <PieChart series={[{ data: mGerencia.pieData, innerRadius: 40, cornerRadius: 5 }]} height={250} /> : <Typography color="textSecondary">Sin datos suficientes</Typography>}</Paper>
          </Box>
        </Box>
      )}

      {vistaDashboard === 'PMO' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {mPMO.proyectosEnRiesgo.length > 0 && (
            <Card elevation={0} sx={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px' }}>
              <CardContent sx={{ py: '16px !important' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}><WarningAmberIcon sx={{ color: '#d97706' }} /><Typography variant="subtitle1" fontWeight="bold" color="#b45309">Alerta de Riesgo en Proyectos</Typography></Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>{mPMO.proyectosEnRiesgo.map((p, idx) => (<Chip key={idx} onClick={() => abrirFicha(proyectos.find(x => x.id === p.id))} label={`${p.titulo || `Proyecto #${p.id}`} (${p.salud})`} color={p.salud === 'En peligro' ? "error" : "warning"} variant="outlined" sx={{ fontWeight: 'bold', backgroundColor: '#fff', cursor: 'pointer', '&:hover': { opacity: 0.8 } }} />))}</Box>
              </CardContent>
            </Card>
          )}

          {mPMO.proyectosCercaVencimiento.length > 0 && (
            <Card elevation={0} sx={{ backgroundColor: '#fef2f2', border: '1px solid #fecdd3', borderRadius: '8px' }}>
              <CardContent sx={{ py: '16px !important' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}><EventBusyIcon sx={{ color: '#e11d48' }} /><Typography variant="subtitle1" fontWeight="bold" color="#e11d48">Proyectos Cerca del Límite de Entrega</Typography></Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>{mPMO.proyectosCercaVencimiento.map((p, idx) => (<Chip key={idx} onClick={() => abrirFicha(proyectos.find(x => x.id === p.id))} label={`${p.titulo || `Proyecto #${p.id}`} (${p.diasFaltantes < 0 ? `Vencido hace ${Math.abs(p.diasFaltantes)} días` : p.diasFaltantes === 0 ? 'Vence Hoy' : `Faltan ${p.diasFaltantes} días`})`} color={p.diasFaltantes <= 0 ? "error" : "warning"} variant="outlined" sx={{ fontWeight: 'bold', backgroundColor: '#fff', cursor: 'pointer', '&:hover': { opacity: 0.8 } }} />))}</Box>
              </CardContent>
            </Card>
          )}

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <Paper elevation={1} sx={{ p: 3, borderRadius: '12px', height: '350px', display: 'flex', flexDirection: 'column' }}><Typography variant="subtitle1" fontWeight="bold" color="#1e293b" mb={2}>Radar de Salud (Activos)</Typography>{mPMO.saludData.length > 0 ? <PieChart series={[{ data: mPMO.saludData, innerRadius: 40, cornerRadius: 5 }]} height={250} /> : <Typography color="textSecondary">Sin datos</Typography>}</Paper>
            <Paper elevation={1} sx={{ p: 3, borderRadius: '12px', height: '350px', display: 'flex', flexDirection: 'column' }}><Typography variant="subtitle1" fontWeight="bold" color="#1e293b" mb={2}>Top 5: Talento Requerido</Typography>{mPMO.talentoData.length > 0 ? <BarChart dataset={mPMO.talentoData} yAxis={[{ scaleType: 'band', dataKey: 'name' }]} xAxis={[{ tickMinStep: 1 }]} series={[{ dataKey: 'value', label: 'Unidades', color: '#0ea5e9' }]} layout="horizontal" height={250} margin={{ left: 120 }} /> : <Typography color="textSecondary">Sin datos</Typography>}</Paper>
          </Box>
        </Box>
      )}

      {vistaDashboard === 'GC' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            {mGC.alertasVBA > 0 && (
              <Card elevation={0} sx={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', height: '100%' }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1, py: '16px !important' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><WarningAmberIcon sx={{ color: '#d97706' }} /><Typography variant="subtitle1" fontWeight="bold" color="#b45309">Alerta Documental (VBA)</Typography></Box>
                  <Typography variant="body2" color="#b45309">Existen <strong>{mGC.alertasVBA}</strong> verificaciones en "Nueva Solicitud" que aún no cuentan con un Identificador oficial.</Typography>
                </CardContent>
              </Card>
            )}

            {mGC.informesPendientes.length > 0 && (
              <Card elevation={0} sx={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', height: '100%' }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1, py: '16px !important' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><EditDocumentIcon sx={{ color: '#15803d' }} /><Typography variant="subtitle1" fontWeight="bold" color="#15803d">Flujo de Evaluación (ISO 17020)</Typography></Box>
                  <Typography variant="body2" color="#15803d" mb={1}>Verificaciones en proceso operativo y elaboración de informes:</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{mGC.informesPendientes.map((inf, idx) => (<Chip key={idx} onClick={() => abrirFicha(proyectos.find(x => x.id === inf.id))} label={`${inf.identificador} - ${inf.cliente} (${inf.estado})`} size="small" variant="outlined" sx={{ color: '#15803d', borderColor: '#15803d', backgroundColor: '#fff', cursor: 'pointer', '&:hover': { backgroundColor: '#dcfce7' } }} />))}</Box>
                </CardContent>
              </Card>
            )}
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
            <Paper elevation={1} sx={{ p: 3, borderRadius: '12px', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="subtitle1" fontWeight="bold" color="#1e293b" mb={2}>Distribución de Estados</Typography>
              {mGC.estadosData.length > 0 ? (
                <BarChart
                  layout="horizontal"
                  dataset={mGC.estadosData}
                  yAxis={[{ scaleType: 'band', dataKey: 'name' }]}
                  xAxis={[{ tickMinStep: 1 }]}
                  series={[{ dataKey: 'value', label: 'Expedientes', color: '#8b5cf6' }]}
                  height={320}
                  margin={{ left: 200, right: 20, top: 20, bottom: 20 }}
                />
              ) : (
                <Typography color="textSecondary">Sin datos</Typography>
              )}
            </Paper>
            <Paper elevation={1} sx={{ p: 3, borderRadius: '12px', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="subtitle1" fontWeight="bold" color="#1e293b" mb={2}>Índice Reinspecciones</Typography>
              {mGC.segData.length > 0 ? <PieChart series={[{ data: mGC.segData }]} height={250} /> : <Typography color="textSecondary">Sin datos</Typography>}
            </Paper>
          </Box>
        </Box>
      )}

      {vistaDashboard === 'Operativo' && (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 3 }}><Paper elevation={1} sx={{ p: 3, borderRadius: '12px', minHeight: '350px' }}><Typography variant="subtitle1" fontWeight="bold" color="#1e293b" mb={2}>Mis Próximas Inspecciones</Typography><Typography variant="body2" color="textSecondary">Próxima fase.</Typography></Paper></Box>
      )}
    </Box>
  );
};

// =================================================================
// COMPONENTES VISUALES AISLADOS
// =================================================================
const FilaDato = ({ etiqueta, valor, colorValor = 'textPrimary' }) => (
  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1.5 }}>
    <Box sx={{ width: '180px', flexShrink: 0 }}><Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>{etiqueta}</Typography></Box>
    <Box sx={{ flexGrow: 1 }}><Typography variant="body2" color={colorValor} sx={{ fontWeight: colorValor === 'primary' ? 'bold' : 'normal', color: colorValor === 'textPrimary' ? '#334155' : undefined }}>{valor || '---'}</Typography></Box>
  </Box>
);

const FilaEditable = ({ etiqueta, children }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
    <Box sx={{ width: '180px', flexShrink: 0 }}><Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>{etiqueta}</Typography></Box>
    <Box sx={{ flexGrow: 1, maxWidth: '500px' }}>{children}</Box>
  </Box>
);

// =================================================================
// APLICACIÓN PRINCIPAL
// =================================================================
function App() {
  const [session, setSession] = useState(null);
  const [authCargando, setAuthCargando] = useState(true);

  const [proyectos, setProyectos] = useState([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState(null);

  const [tabActual, setTabActual] = useState(1);
  const [filtroEstado, setFiltroEstado] = useState('Activos');
  const [vistaDashboard, setVistaDashboard] = useState('Gerencia');

  const [nuevoComentario, setNuevoComentario] = useState('');
  const [bitacora, setBitacora] = useState([]);
  const [archivos, setArchivos] = useState([]);

  const chatEndRef = useRef(null);
  const tokenClientRef = useRef(null);
  const [pickerCargado, setPickerCargado] = useState(false);

  const [datosGC, setDatosGC] = useState({
    tituloProyecto: '', empresaEncargada: 'Proeléctrica', empresa_solicitante: '', correo_solicitante: '', estado: '', montoCotizado: '', inspector: '', colaboradores: [],
    fechaProgramacion: '', fechaInicio: '', fechaFin: '', seguimiento: '', pago: 'Pendiente', progreso: 0,
    provincia: '', canton: '', distrito: '', exacta: '',
    actividad: '', cantidad_permisos: '', area_m2: '',
    contactoNombre: '', contactoTelefono: '',
    propietarioNombre: '', propietarioCedula: '',
    presupuestoGastos: '', monedaPresupuesto: 'CRC', resultadosProyecto: '', talentoRequerido: [], otroTalento: '', saludProyecto: 'Saludable',
    fechaSolicitud: '', cancelacionPago: 'No', monedaCotizacion: 'CRC'
  });

  const [datosGuardados, setDatosGuardados] = useState({});

  const estadoActualRef = useRef({ archivos, bitacora, datosGC, proyectoSeleccionado });
  useEffect(() => {
    estadoActualRef.current = { archivos, bitacora, datosGC, proyectoSeleccionado };
  }, [archivos, bitacora, datosGC, proyectoSeleccionado]);

  // AUTENTICACIÓN
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthCargando(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    cargarProyectos();
    inicializarGoogleAPIs();
    inyectarSolucionZIndex();
    const intervaloRefresh = setInterval(() => { cargarProyectos(); }, 10000);
    return () => clearInterval(intervaloRefresh);
  }, [session]);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [bitacora, modalAbierto]);

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
  };

  const inyectarSolucionZIndex = () => {
    const style = document.createElement('style');
    style.innerHTML = `.picker-dialog { z-index: 100000 !important; } .picker-dialog-bg { z-index: 99999 !important; }`;
    document.head.appendChild(style);
  };

  const inicializarGoogleAPIs = () => {
    const checkGoogle = setInterval(() => {
      if (window.gapi && window.google) {
        window.gapi.load('picker', () => setPickerCargado(true));
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/drive.readonly',
          callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
              sessionStorage.setItem('googlePickerToken', tokenResponse.access_token);
              crearYMostrarPicker(tokenResponse.access_token);
            }
          },
        });
        clearInterval(checkGoogle);
      }
    }, 500);
  };

  const abrirGoogleDrivePicker = () => {
    if (!pickerCargado || !tokenClientRef.current) { alert("Conectando de forma segura con Google. Intenta en un par de segundos..."); return; }
    const tokenGuardado = sessionStorage.getItem('googlePickerToken');
    if (tokenGuardado) crearYMostrarPicker(tokenGuardado);
    else tokenClientRef.current.requestAccessToken();
  };

  const crearYMostrarPicker = (accessToken) => {
    const viewRecents = new window.google.picker.DocsView(window.google.picker.ViewId.RECENT).setLabel('Recientes');
    const viewDrive = new window.google.picker.DocsView().setIncludeFolders(true).setEnableDrives(true).setLabel('Explorar Drive');
    try {
      const picker = new window.google.picker.PickerBuilder().addView(viewRecents).addView(viewDrive).enableFeature(window.google.picker.Feature.SUPPORT_DRIVES).enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED).setOAuthToken(accessToken).setDeveloperKey(GOOGLE_API_KEY).setAppId(GOOGLE_APP_ID).setLocale('es').setCallback(manejarArchivoSeleccionado).build();
      picker.setVisible(true);
    } catch (error) { sessionStorage.removeItem('googlePickerToken'); tokenClientRef.current.requestAccessToken(); }
  };

  const manejarArchivoSeleccionado = (data) => {
    if (data.action === window.google.picker.Action.PICKED) {
      const { archivos: currentArchivos, bitacora: currentBitacora, datosGC: currentDatosGC, proyectoSeleccionado: currentProyecto } = estadoActualRef.current;
      const nuevosArchivos = [...currentArchivos];
      let textosBitacora = [];
      data.docs.forEach(doc => { nuevosArchivos.push({ nombre: doc.name, url: doc.url, id: doc.id }); textosBitacora.push(`Adjuntó el archivo: "${doc.name}"`); });
      setArchivos(nuevosArchivos);
      const nombreUsuario = session?.user?.email?.split('@')[0] || 'Usuario';
      const nuevosLogs = textosBitacora.map((texto, i) => ({ id: Date.now() + i, autor: nombreUsuario, texto, fecha: new Date().toLocaleString() }));
      const nuevaBitacora = [...currentBitacora, ...nuevosLogs];
      setBitacora(nuevaBitacora);
      autoguardarEnBackend(currentDatosGC, nuevaBitacora, nuevosArchivos, currentProyecto);
    }
  };

  const eliminarArchivo = (indexAEliminar, nombreArchivo) => {
    const nuevosArchivos = archivos.filter((_, index) => index !== indexAEliminar);
    setArchivos(nuevosArchivos);
    const nombreUsuario = session?.user?.email?.split('@')[0] || 'Usuario';
    const nuevoLog = { id: Date.now(), autor: nombreUsuario, texto: `Eliminó el archivo adjunto: "${nombreArchivo}"`, fecha: new Date().toLocaleString() };
    const nuevaBitacora = [...bitacora, nuevoLog];
    setBitacora(nuevaBitacora);
    autoguardarEnBackend(datosGC, nuevaBitacora, nuevosArchivos, proyectoSeleccionado);
  };

  const cargarProyectos = async () => {
    try {
      const respuesta = await axios.get(`${API_URL}/v1/proyectos`);
      setProyectos(respuesta.data);
    } catch (error) { console.error(error); }
  };

  const formatFechaInput = (dateStr) => {
    if (!dateStr) return '';
    const datePart = dateStr.split(' ')[0].split('T')[0];
    if (datePart.includes('/')) {
      const parts = datePart.split('/');
      if (parts[2] && parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      if (parts[0] && parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    if (datePart.includes('-')) {
      const parts = datePart.split('-');
      if (parts[0].length === 4) return datePart;
      if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return datePart;
  };

  const abrirFicha = (proyecto) => {
    if (!proyecto) return;
    setProyectoSeleccionado(proyecto);

    let colabArray = [];
    if (Array.isArray(proyecto.datos_dinamicos?.colaboradores)) {
      colabArray = proyecto.datos_dinamicos.colaboradores;
    } else if (proyecto.datos_dinamicos?.colaboradores) {
      colabArray = [proyecto.datos_dinamicos.colaboradores];
    }

    const datosIniciales = {
      tituloProyecto: proyecto.titulo_proyecto || '',
      empresaEncargada: proyecto.empresa_encargada || 'Proeléctrica',
      empresa_solicitante: proyecto.empresa_solicitante || '',
      correo_solicitante: proyecto.correo_solicitante || '',
      estado: proyecto.estado || 'Nueva Solicitud',
      montoCotizado: proyecto.monto_cotizado || '',
      inspector: proyecto.inspector || '',
      colaboradores: colabArray,
      fechaProgramacion: formatFechaInput(proyecto.fecha_programacion),
      fechaInicio: formatFechaInput(proyecto.fecha_inicio),
      fechaFin: formatFechaInput(proyecto.fecha_fin),
      fechaSolicitud: formatFechaInput(proyecto.datos_dinamicos?.fecha_solicitud),
      seguimiento: proyecto.datos_dinamicos?.seguimiento_inspeccion || '',
      pago: proyecto.pago || 'Pendiente',
      cancelacionPago: proyecto.datos_dinamicos?.cancelacion_pago || 'No',
      progreso: proyecto.progreso || 0,
      provincia: proyecto.datos_dinamicos?.ubicacion?.provincia || '',
      canton: proyecto.datos_dinamicos?.ubicacion?.canton || '',
      distrito: proyecto.datos_dinamicos?.ubicacion?.distrito || '',
      exacta: proyecto.datos_dinamicos?.ubicacion?.exacta || '',
      actividad: proyecto.datos_dinamicos?.detalles_tecnicos?.actividad || '',
      cantidad_permisos: proyecto.datos_dinamicos?.detalles_tecnicos?.cantidad_permisos || '',
      area_m2: proyecto.datos_dinamicos?.detalles_tecnicos?.area_m2 || '',
      contactoNombre: proyecto.datos_dinamicos?.contacto?.nombre || '',
      contactoTelefono: proyecto.datos_dinamicos?.contacto?.telefono || '',
      propietarioNombre: proyecto.datos_dinamicos?.propietario?.nombre || '',
      propietarioCedula: proyecto.datos_dinamicos?.propietario?.cedula || '',
      presupuestoGastos: proyecto.presupuesto_gastos || '',
      saludProyecto: proyecto.salud_proyecto || 'Saludable',
      monedaPresupuesto: proyecto.datos_dinamicos?.moneda_presupuesto || 'CRC',
      monedaCotizacion: proyecto.datos_dinamicos?.moneda_cotizacion || 'CRC',
      resultadosProyecto: proyecto.datos_dinamicos?.resultados_proyecto || '',
      talentoRequerido: proyecto.datos_dinamicos?.talento_requerido || [],
      otroTalento: proyecto.datos_dinamicos?.otro_talento || ''
    };

    setDatosGC(datosIniciales);
    setDatosGuardados(datosIniciales);
    setBitacora(proyecto.bitacora?.length > 0 ? proyecto.bitacora : [{ id: 1, autor: 'Sistema', texto: 'Registro inicial creado.', fecha: proyecto.datos_dinamicos?.fecha_solicitud || new Date().toLocaleString() }]);
    setArchivos(proyecto.archivos || []);
    setModalAbierto(true);
  };

  const cerrarFicha = () => {
    setModalAbierto(false);
    setProyectoSeleccionado(null);
  };

  const autoguardarEnBackend = async (nuevosDatosGC, nuevaBitacora, nuevosArchivos, proyectoBase) => {
    try {
      const datosDinamicosActualizados = {
        ...proyectoBase.datos_dinamicos,
        seguimiento_inspeccion: nuevosDatosGC.seguimiento,
        fecha_solicitud: nuevosDatosGC.fechaSolicitud,
        cancelacion_pago: nuevosDatosGC.cancelacionPago,
        moneda_presupuesto: nuevosDatosGC.monedaPresupuesto,
        moneda_cotizacion: nuevosDatosGC.monedaCotizacion,
        resultados_proyecto: nuevosDatosGC.resultadosProyecto,
        talento_requerido: nuevosDatosGC.talentoRequerido,
        otro_talento: nuevosDatosGC.otroTalento,
        colaboradores: nuevosDatosGC.colaboradores,
        ubicacion: {
          ...proyectoBase.datos_dinamicos?.ubicacion,
          provincia: nuevosDatosGC.provincia,
          canton: nuevosDatosGC.canton,
          distrito: nuevosDatosGC.distrito,
          exacta: nuevosDatosGC.exacta
        },
        detalles_tecnicos: {
          ...proyectoBase.datos_dinamicos?.detalles_tecnicos,
          actividad: nuevosDatosGC.actividad,
          cantidad_permisos: nuevosDatosGC.cantidad_permisos,
          area_m2: nuevosDatosGC.area_m2
        },
        contacto: {
          ...proyectoBase.datos_dinamicos?.contacto,
          nombre: nuevosDatosGC.contactoNombre,
          telefono: nuevosDatosGC.contactoTelefono
        },
        propietario: {
          ...proyectoBase.datos_dinamicos?.propietario,
          nombre: nuevosDatosGC.propietarioNombre,
          cedula: nuevosDatosGC.propietarioCedula
        }
      };

      const payload = {
        titulo_proyecto: nuevosDatosGC.tituloProyecto,
        empresa_encargada: nuevosDatosGC.empresaEncargada,
        empresa_solicitante: nuevosDatosGC.empresa_solicitante,
        correo_solicitante: nuevosDatosGC.correo_solicitante,
        estado: nuevosDatosGC.estado,
        seguimiento: nuevosDatosGC.seguimiento,
        monto_cotizado: nuevosDatosGC.montoCotizado,
        pago: nuevosDatosGC.pago,
        inspector: nuevosDatosGC.inspector,
        fecha_programacion: nuevosDatosGC.fechaProgramacion,
        fecha_inicio: nuevosDatosGC.fechaInicio,
        fecha_fin: nuevosDatosGC.fechaFin,
        progreso: nuevosDatosGC.progreso,
        presupuesto_gastos: nuevosDatosGC.presupuestoGastos,
        salud_proyecto: nuevosDatosGC.saludProyecto,
        bitacora: nuevaBitacora,
        archivos: nuevosArchivos,
        datos_dinamicos: datosDinamicosActualizados
      };
      await axios.put(`${API_URL}/v1/proyectos/${proyectoBase.id}/gestion`, payload);
    } catch (error) { console.error("Error en autoguardado:", error); }
  };

  const verificarYGuardarCampo = (campo, valorNuevo) => {
    if (JSON.stringify(datosGuardados[campo]) === JSON.stringify(valorNuevo)) return;

    let progresoAjustado = datosGC.progreso;
    if (campo === 'estado' && ESTADOS_PROGRESO_BLOQUEADO.includes(valorNuevo)) progresoAjustado = 0;

    const nombresLegibles = {
      tituloProyecto: "Título del Proyecto", empresaEncargada: "Empresa Encargada", empresa_solicitante: "Cliente / Solicitante", correo_solicitante: "Contacto (Email)",
      estado: "Estado (Status)", seguimiento: "Seguimiento", montoCotizado: "Monto Cotizado", pago: "Estado de Pago", cancelacionPago: "Cancelación del pago", inspector: "Administrador / Inspector",
      colaboradores: "Colaboradores", fechaProgramacion: "Fecha de Programación", fechaInicio: "Fecha de Inicio", fechaFin: "Fecha Final", fechaSolicitud: "Fecha de Solicitud", progreso: "Progreso (%)",
      provincia: "Provincia", canton: "Cantón", distrito: "Distrito", exacta: "Dirección Exacta",
      actividad: "Actividad", cantidad_permisos: "Cantidad de Permisos", area_m2: "Área (m²)",
      contactoNombre: "Nombre Contacto", contactoTelefono: "Teléfono Contacto", propietarioNombre: "Nombre Propietario", propietarioCedula: "Cédula Propietario",
      presupuestoGastos: "Presupuesto de Gastos", monedaPresupuesto: "Moneda de Presupuesto", monedaCotizacion: "Moneda de Cotización", resultadosProyecto: "Resultados del Proyecto",
      talentoRequerido: "Talento Requerido", otroTalento: "Otro Talento", saludProyecto: "Salud del Proyecto"
    };

    let valorFormateado = valorNuevo;
    if (valorNuevo === '' || valorNuevo === null) valorFormateado = 'Vacío';
    if (campo === 'progreso') valorFormateado = `${valorNuevo}%`;
    if (campo === 'talentoRequerido' || campo === 'colaboradores') valorFormateado = valorNuevo.length > 0 ? valorNuevo.join(', ') : 'Ninguno';

    const nuevoLog = { id: Date.now(), autor: 'Sistema', texto: `Cambió ${nombresLegibles[campo] || campo} a: "${valorFormateado}"`, fecha: new Date().toLocaleString() };
    const nuevaBitacora = [...bitacora, nuevoLog];
    const nuevosDatosGC = { ...datosGC, [campo]: valorNuevo, progreso: progresoAjustado };

    setBitacora(nuevaBitacora);
    setDatosGC(nuevosDatosGC);
    setDatosGuardados(nuevosDatosGC);
    autoguardarEnBackend(nuevosDatosGC, nuevaBitacora, archivos, proyectoSeleccionado);
  };

  const handleTeclado = (e) => { setDatosGC({ ...datosGC, [e.target.name]: e.target.value }); };

  const agregarComentario = () => {
    if (nuevoComentario.trim() === '') return;
    const nombreUsuario = session?.user?.email?.split('@')[0] || 'Usuario';
    const nuevaBitacora = [...bitacora, { id: Date.now(), autor: nombreUsuario, texto: nuevoComentario, fecha: new Date().toLocaleString() }];
    setBitacora(nuevaBitacora);
    setNuevoComentario('');
    autoguardarEnBackend(datosGC, nuevaBitacora, archivos, proyectoSeleccionado);
  };

  const crearProyectoManual = async () => {
    try {
      const res = await axios.post(`${API_URL}/v1/proyectos/manual`);
      const respuestaLista = await axios.get(`${API_URL}/v1/proyectos`);
      setProyectos(respuestaLista.data);
      const nuevoProyecto = respuestaLista.data.find(p => p.id === res.data.id_proyecto);
      if (nuevoProyecto) { abrirFicha(nuevoProyecto); }
    } catch (error) { console.error("Error creando proyecto:", error); }
  };

  // VISTA SI NO HAY SESIÓN ACTIVA
  if (authCargando) return <Box sx={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}><CircularProgress /></Box>;
  if (!session) return <LoginScreen setSession={setSession} />;

  // RENDERIZADO PRINCIPAL (SESIÓN ACTIVA)
  const dataAplicacion = tabActual === 0 ? proyectos.filter(p => !isProyectoApp(p)) : proyectos.filter(p => isProyectoApp(p));

  let listaMostrar = dataAplicacion;
  if (filtroEstado !== 'Todos') {
    if (filtroEstado === 'Cotizaciones') {
      listaMostrar = dataAplicacion.filter(p => p.estado && ["Nueva Solicitud", "Solicitud Generada", "Cotización"].includes(p.estado));
    } else if (filtroEstado === 'Activos') {
      listaMostrar = dataAplicacion.filter(p => p.estado && ["Adjudicado", "En progreso", "Revisión por parte del cliente", "Asignado y programado", "Elaboración de informe", "En revisión del Verificador"].includes(p.estado));
    } else if (filtroEstado === 'Facturación') {
      listaMostrar = dataAplicacion.filter(p => p.estado && ["Completado y listo para facturar", "Facturado y pendiente de pago", "Pendiente de pago"].includes(p.estado));
    } else if (filtroEstado === 'Archivados') {
      listaMostrar = dataAplicacion.filter(p => p.estado && ["Pago recibido y proyecto archivado", "No se ejecutó. Proyecto archivado", "Archivado no adjudicado", "Adjudicado y pagado", "Finalizado y entregado"].includes(p.estado));
    }
  }

  // ORDENAMIENTO DINÁMICO POR FECHA (MÁS RECIENTE ARRIBA)
  const listaMostrarOrdenada = [...listaMostrar].sort((a, b) => {
    const fechaA = new Date(getFechaOrdenamiento(a)).getTime();
    const fechaB = new Date(getFechaOrdenamiento(b)).getTime();
    if (fechaA !== fechaB) return fechaB - fechaA;
    return b.id - a.id;
  });

  const contarPorGrupo = (grupoEstados) => dataAplicacion.filter(p => p.estado && grupoEstados.some(est => p.estado.includes(est))).length;

  const renderizarEstado = (estadoBackend) => {
    let color = 'default';
    const estadoSeguro = estadoBackend || '';
    if (["Nueva Solicitud", "Solicitud Generada", "Cotización"].includes(estadoSeguro)) color = 'warning';
    if (["Adjudicado", "En progreso", "Revisión", "Asignado y programado", "Elaboración de informe", "En revisión del Verificador"].some(s => estadoSeguro.includes(s))) color = 'info';
    if (["Completado y listo para facturar", "Facturado y pendiente de pago", "Pendiente de pago"].includes(estadoSeguro)) color = 'primary';
    if (estadoSeguro.includes('archivado') || estadoSeguro.includes('pagado') || estadoSeguro.includes('entregado') || estadoSeguro === 'Finalizado') color = 'success';
    return <Chip label={estadoSeguro || 'Sin Estado'} color={color} size="small" sx={{ fontWeight: 'bold', fontSize: '0.75rem', height: '24px' }} />;
  };

  const esVistaProyecto = proyectoSeleccionado && isProyectoApp(proyectoSeleccionado);
  const esProgresoBloqueado = ESTADOS_PROGRESO_BLOQUEADO.includes(datosGC.estado);

  const tableCellSx = { fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '250px', py: 1.5 };
  const tableHeadSx = { ...tableCellSx, fontWeight: 'bold', color: '#475569' };

  const inspectorOpciones = [...new Set([...EQUIPO_PROELECTRICA, datosGC.inspector])].filter(Boolean);
  const colabOpciones = [...new Set([...EQUIPO_PROELECTRICA, ...(datosGC.colaboradores || [])])].filter(Boolean);

  return (
    <Box sx={{ backgroundColor: '#f1f5f9', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      <AppBar position="static" sx={{ backgroundColor: '#0284c7', boxShadow: 'none' }}>
        <Toolbar sx={{ minHeight: '60px !important', px: { xs: 2, md: 4, lg: 6 }, display: 'flex', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 4 }}>
              <img src="/logo.png" alt="Proeléctrica" style={{ height: '38px' }} onError={(e) => { e.target.style.display = 'none'; }} />
            </Box>
            <Tabs value={tabActual} onChange={(e, val) => { setTabActual(val); }} textColor="inherit" indicatorColor="secondary" sx={{ minHeight: '60px' }}>
              <Tab icon={<FactCheckIcon sx={{ fontSize: 20 }} />} iconPosition="start" label="Verificaciones" sx={{ minHeight: '60px', fontWeight: 'bold', textTransform: 'none' }} />
              <Tab icon={<AccountTreeIcon sx={{ fontSize: 20 }} />} iconPosition="start" label="Proyectos" sx={{ minHeight: '60px', fontWeight: 'bold', textTransform: 'none' }} />
              <Tab icon={<DashboardIcon sx={{ fontSize: 20 }} />} iconPosition="start" label="Actividad Global" sx={{ minHeight: '60px', fontWeight: 'bold', textTransform: 'none' }} />
            </Tabs>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ mr: 2, fontWeight: 'bold', opacity: 0.9, display: { xs: 'none', md: 'block' } }}>
              {session.user.email}
            </Typography>
            <IconButton color="inherit" onClick={cerrarSesion} title="Cerrar Sesión">
              <LogoutIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {tabActual === 2 ? (
        <DashboardTab proyectos={proyectos} vistaDashboard={vistaDashboard} setVistaDashboard={setVistaDashboard} abrirFicha={abrirFicha} />
      ) : (
        <Box sx={{ flexGrow: 1, px: { xs: 2, md: 4, lg: 6 }, py: 3, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, alignItems: 'flex-start' }}>

          <Paper elevation={1} sx={{ width: { xs: '100%', md: '220px' }, flexShrink: 0, borderRadius: '8px', overflow: 'hidden' }}>
            <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#64748b', fontSize: '0.8rem' }}>VISTAS Y FILTROS</Typography></Box>
            <List dense disablePadding>
              <ListItemButton selected={filtroEstado === 'Todos'} onClick={() => setFiltroEstado('Todos')}><ListItemText primary="Todos los registros" sx={{ '& .MuiListItemText-primary': { fontWeight: filtroEstado === 'Todos' ? 'bold' : 'normal', fontSize: '0.85rem' } }} /><Chip label={dataAplicacion.length} size="small" sx={{ height: '20px', fontSize: '0.7rem' }} /></ListItemButton>
              <Divider />
              <Box sx={{ px: 2, py: 1 }}><Typography variant="caption" sx={{ fontWeight: 'bold', color: '#8b5cf6', fontSize: '0.7rem' }}>COTIZACIONES</Typography></Box>
              <ListItemButton selected={filtroEstado === 'Cotizaciones'} onClick={() => setFiltroEstado('Cotizaciones')}><ListItemText primary="Mostrar Cotizaciones" sx={{ '& .MuiListItemText-primary': { color: '#7c3aed', fontSize: '0.85rem' } }} /><Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.8rem' }}>{contarPorGrupo(["Nueva Solicitud", "Solicitud Generada", "Cotización"])}</Typography></ListItemButton>
              <Divider />
              <Box sx={{ px: 2, py: 1 }}><Typography variant="caption" sx={{ fontWeight: 'bold', color: '#dc2626', fontSize: '0.7rem' }}>PROYECTOS ACTIVOS</Typography></Box>
              <ListItemButton selected={filtroEstado === 'Activos'} onClick={() => setFiltroEstado('Activos')}><ListItemText primary="Mostrar Activos" sx={{ '& .MuiListItemText-primary': { color: '#dc2626', fontSize: '0.85rem' } }} /><Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.8rem' }}>{contarPorGrupo(["Adjudicado", "En progreso", "Revisión por parte del cliente", "Asignado y programado", "Elaboración de informe", "En revisión del Verificador"])}</Typography></ListItemButton>
              <Divider />
              <Box sx={{ px: 2, py: 1 }}><Typography variant="caption" sx={{ fontWeight: 'bold', color: '#f59e0b', fontSize: '0.7rem' }}>FACTURACIÓN Y COBRO</Typography></Box>
              <ListItemButton selected={filtroEstado === 'Facturación'} onClick={() => setFiltroEstado('Facturación')}><ListItemText primary="Mostrar Pendientes" sx={{ '& .MuiListItemText-primary': { color: '#d97706', fontSize: '0.85rem' } }} /><Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.8rem' }}>{contarPorGrupo(["Completado y listo para facturar", "Facturado y pendiente de pago", "Pendiente de pago"])}</Typography></ListItemButton>
              <Divider />
              <Box sx={{ px: 2, py: 1 }}><Typography variant="caption" sx={{ fontWeight: 'bold', color: '#2563eb', fontSize: '0.7rem' }}>ARCHIVADOS</Typography></Box>
              <ListItemButton selected={filtroEstado === 'Archivados'} onClick={() => setFiltroEstado('Archivados')}><ListItemText primary="Mostrar Archivados" sx={{ '& .MuiListItemText-primary': { color: '#2563eb', fontSize: '0.85rem' } }} /><Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.8rem' }}>{contarPorGrupo(["Pago recibido y proyecto archivado", "No se ejecutó. Proyecto archivado", "Archivado no adjudicado", "Adjudicado y pagado", "Finalizado y entregado"])}</Typography></ListItemButton>
            </List>
          </Paper>

          <Paper elevation={1} sx={{ flexGrow: 1, padding: '1.5rem', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1e293b' }}>
                {tabActual === 0 ? 'Verificaciones Eléctricas' : 'Portafolio de Proyectos'}
              </Typography>
              {tabActual === 1 && (
                <Button variant="contained" color="primary" size="small" startIcon={<AddIcon />} onClick={crearProyectoManual} sx={{ fontWeight: 'bold', borderRadius: '20px', textTransform: 'none' }}>Añadir Proyecto</Button>
              )}
            </Box>

            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                  {tabActual === 0 ? (
                    <TableRow>
                      <TableCell sx={{ ...tableHeadSx, width: '30%' }}>Cliente / Empresa</TableCell>
                      <TableCell sx={{ ...tableHeadSx, width: '20%' }}>ID Documento</TableCell>
                      <TableCell sx={{ ...tableHeadSx, width: '20%' }}>Status</TableCell>
                      <TableCell sx={{ ...tableHeadSx, width: '15%' }}>Empresa Encargada</TableCell>
                      <TableCell sx={{ ...tableHeadSx, width: '15%' }}>Área (m²)</TableCell>
                    </TableRow>
                  ) : (
                    <TableRow>
                      <TableCell sx={{ ...tableHeadSx, width: '25%' }}>Título del Proyecto</TableCell>
                      <TableCell sx={{ ...tableHeadSx, width: '20%' }}>Cliente</TableCell>
                      <TableCell sx={{ ...tableHeadSx, width: '20%' }}>Status</TableCell>
                      <TableCell sx={{ ...tableHeadSx, width: '15%' }}>Progreso</TableCell>
                      <TableCell sx={{ ...tableHeadSx, width: '10%' }}>Pago</TableCell>
                      <TableCell sx={{ ...tableHeadSx, width: '10%' }}>Admin</TableCell>
                    </TableRow>
                  )}
                </TableHead>
                <TableBody>
                  {listaMostrarOrdenada.length === 0 ? (
                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'gray', fontSize: '0.85rem' }}>No hay registros para este filtro.</TableCell></TableRow>
                  ) : (
                    listaMostrarOrdenada.map((proyecto) => (
                      <TableRow key={proyecto.id} hover style={{ cursor: 'pointer' }} onClick={() => abrirFicha(proyecto)}>
                        {tabActual === 0 ? (
                          <>
                            <TableCell sx={{ ...tableCellSx, fontWeight: 600, color: '#0ea5e9' }}>{proyecto.empresa_solicitante || 'Sin Nombre'}</TableCell>
                            <TableCell sx={tableCellSx}>{proyecto.identificador_solicitud || 'Pendiente'}</TableCell>
                            <TableCell sx={tableCellSx}>{renderizarEstado(proyecto.estado)}</TableCell>
                            <TableCell sx={tableCellSx}>{proyecto.empresa_encargada || 'UVIE Proeléctrica'}</TableCell>
                            <TableCell sx={{ ...tableCellSx, overflow: 'visible' }}>{proyecto.datos_dinamicos?.detalles_tecnicos?.area_m2 || '---'}</TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell sx={{ ...tableCellSx, fontWeight: 'bold', color: '#8b5cf6' }}>{proyecto.titulo_proyecto || 'Sin Título'}</TableCell>
                            <TableCell sx={{ ...tableCellSx, fontWeight: 500, color: '#0ea5e9' }}>{proyecto.empresa_solicitante || 'Sin Nombre'}</TableCell>
                            <TableCell sx={tableCellSx}>{renderizarEstado(proyecto.estado)}</TableCell>
                            <TableCell sx={tableCellSx}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: '100%', minWidth: '80px', bgcolor: '#e2e8f0', borderRadius: '4px', height: '6px' }}><Box sx={{ bgcolor: '#0ea5e9', height: '6px', borderRadius: '4px', width: `${proyecto.progreso || 0}%` }} /></Box>
                                <Typography variant="caption" fontWeight="bold" sx={{ fontSize: '0.7rem' }}>{proyecto.progreso || 0}%</Typography>
                              </Box>
                            </TableCell>
                            <TableCell sx={tableCellSx}>{proyecto.pago || 'Pendiente'}</TableCell>
                            <TableCell sx={tableCellSx}>{proyecto.inspector || 'Sin asignar'}</TableCell>
                          </>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}

      {/* MODAL BLINDADO */}
      <Dialog open={modalAbierto} onClose={cerrarFicha} maxWidth="xl" fullWidth sx={{ '& .MuiDialog-paper': { height: '85vh', maxHeight: '85vh', borderRadius: '8px', display: 'flex', flexDirection: 'column' }, zIndex: 1200 }}>
        {proyectoSeleccionado && (
          <>
            <DialogTitle sx={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2, flexShrink: 0 }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1e293b' }}>
                  {esVistaProyecto ? 'Expediente de Proyecto' : 'Expediente de Verificación'}
                </Typography>
              </Box>
              <IconButton onClick={cerrarFicha}><Typography variant="body2" fontWeight="bold" color="textSecondary">CERRAR ✕</Typography></IconButton>
            </DialogTitle>

            <DialogContent sx={{ padding: 0, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
              <Box sx={{ flexGrow: 1, overflowY: 'auto', p: '2rem 3rem', backgroundColor: '#fff', minHeight: 0 }}>

                <Box sx={{ mb: 4 }}>
                  <Typography variant="subtitle1" sx={{ color: '#0ea5e9', fontWeight: 'bold', textTransform: 'uppercase', mb: 2, letterSpacing: '0.5px' }}>Información del Cliente y Ubicación</Typography>
                  <Box sx={{ pl: 1 }}>

                    {esVistaProyecto && (
                      <FilaEditable etiqueta="Título del Proyecto">
                        <TextField fullWidth size="small" variant="standard" name="tituloProyecto" value={datosGC.tituloProyecto} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('tituloProyecto', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} InputProps={{ disableUnderline: true }} sx={{ '& .MuiInputBase-input': { fontWeight: 'bold', color: '#8b5cf6', fontSize: '1rem' } }} />
                      </FilaEditable>
                    )}

                    {esVistaProyecto ? (
                      <FilaEditable etiqueta="Empresa Encargada">
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, py: 0.5 }}>
                          {EMPRESAS_ENCARGADAS.map(empresa => (
                            <Chip key={empresa} label={empresa} onClick={() => verificarYGuardarCampo('empresaEncargada', empresa)} color={datosGC.empresaEncargada === empresa ? "primary" : "default"} variant={datosGC.empresaEncargada === empresa ? "filled" : "outlined"} sx={{ borderRadius: '4px', fontWeight: datosGC.empresaEncargada === empresa ? 'bold' : 'normal', cursor: 'pointer' }} />
                          ))}
                        </Box>
                      </FilaEditable>
                    ) : (
                      <FilaDato etiqueta="Empresa Encargada" valor="UVIE Proeléctrica" colorValor="primary" />
                    )}

                    <FilaEditable etiqueta="Cliente / Solicitante">
                      <TextField fullWidth size="small" variant="standard" name="empresa_solicitante" value={datosGC.empresa_solicitante} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('empresa_solicitante', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} InputProps={{ disableUnderline: true }} sx={{ '& .MuiInputBase-input': { fontWeight: 'bold', color: '#0ea5e9', fontSize: '0.875rem' } }} />
                    </FilaEditable>

                    {!esVistaProyecto && (
                      <FilaDato etiqueta="Identificador (VBA)" valor={proyectoSeleccionado.identificador_solicitud} colorValor="primary" />
                    )}

                    <FilaEditable etiqueta="Provincia / Cantón">
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField select fullWidth size="small" name="provincia" value={datosGC.provincia} onChange={(e) => verificarYGuardarCampo('provincia', e.target.value)} sx={comunInputSx}>
                          <MenuItem value="" sx={comunMenuSx}><em>Ninguno</em></MenuItem>
                          {PROVINCIAS.map(prov => <MenuItem key={prov} value={prov} sx={comunMenuSx}>{prov}</MenuItem>)}
                        </TextField>
                        <TextField fullWidth size="small" name="canton" placeholder="Cantón" value={datosGC.canton} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('canton', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} sx={comunInputSx} />
                      </Box>
                    </FilaEditable>

                    <FilaEditable etiqueta="Distrito">
                      <TextField fullWidth size="small" name="distrito" value={datosGC.distrito} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('distrito', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} sx={comunInputSx} />
                    </FilaEditable>

                    <FilaEditable etiqueta="Dirección Exacta">
                      <TextField fullWidth size="small" name="exacta" value={datosGC.exacta} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('exacta', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} sx={comunInputSx} />
                    </FilaEditable>
                  </Box>
                </Box>

                <Box sx={{ mb: 4 }}>
                  <Typography variant="subtitle1" sx={{ color: '#0ea5e9', fontWeight: 'bold', textTransform: 'uppercase', mb: 2, letterSpacing: '0.5px' }}>Detalles Técnicos</Typography>
                  <Box sx={{ pl: 1 }}>
                    <FilaEditable etiqueta="Actividad"><TextField fullWidth size="small" name="actividad" value={datosGC.actividad} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('actividad', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} sx={comunInputSx} /></FilaEditable>

                    {!esVistaProyecto && (
                      <FilaEditable etiqueta="Permisos (Cantidad)"><TextField fullWidth size="small" name="cantidad_permisos" value={datosGC.cantidad_permisos} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('cantidad_permisos', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} sx={comunInputSx} /></FilaEditable>
                    )}

                    <FilaEditable etiqueta="Área (m²)"><TextField fullWidth size="small" name="area_m2" value={datosGC.area_m2} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('area_m2', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} sx={comunInputSx} /></FilaEditable>
                    <FilaEditable etiqueta="Contacto (Nombre)"><TextField fullWidth size="small" name="contactoNombre" value={datosGC.contactoNombre} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('contactoNombre', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} sx={comunInputSx} /></FilaEditable>
                    <FilaEditable etiqueta="Contacto (Teléfono)"><TextField fullWidth size="small" name="contactoTelefono" value={datosGC.contactoTelefono} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('contactoTelefono', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} sx={comunInputSx} /></FilaEditable>

                    <FilaEditable etiqueta="Contacto (Email)">
                      <TextField fullWidth size="small" name="correo_solicitante" value={datosGC.correo_solicitante} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('correo_solicitante', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} sx={comunInputSx} />
                    </FilaEditable>

                    {!esVistaProyecto && (
                      <>
                        <FilaEditable etiqueta="Propietario (Nombre)"><TextField fullWidth size="small" name="propietarioNombre" value={datosGC.propietarioNombre} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('propietarioNombre', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} sx={comunInputSx} /></FilaEditable>
                        <FilaEditable etiqueta="Propietario (Cédula)"><TextField fullWidth size="small" name="propietarioCedula" value={datosGC.propietarioCedula} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('propietarioCedula', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} sx={comunInputSx} /></FilaEditable>
                      </>
                    )}

                    {esVistaProyecto && (
                      <>
                        <FilaEditable etiqueta="Resultados del Proyecto">
                          <TextField fullWidth multiline rows={4} size="small" name="resultadosProyecto" value={datosGC.resultadosProyecto} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('resultadosProyecto', e.target.value)} placeholder="Resultados esperados, alcance..." sx={comunInputSx} />
                        </FilaEditable>

                        <FilaEditable etiqueta="Talento Requerido">
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, py: 0.5 }}>
                            {TALENTO_OPCIONES.map(talento => {
                              const isSelected = Array.isArray(datosGC.talentoRequerido) && datosGC.talentoRequerido.includes(talento);
                              return (
                                <Chip key={talento} label={talento} onClick={() => {
                                  const current = Array.isArray(datosGC.talentoRequerido) ? datosGC.talentoRequerido : [];
                                  const newValue = isSelected ? current.filter(t => t !== talento) : [...current, talento];
                                  verificarYGuardarCampo('talentoRequerido', newValue);
                                }} color={isSelected ? "primary" : "default"} variant={isSelected ? "filled" : "outlined"} sx={{ borderRadius: '4px', fontWeight: isSelected ? 'bold' : 'normal', cursor: 'pointer' }} />
                              );
                            })}
                          </Box>
                        </FilaEditable>

                        <FilaEditable etiqueta="Otro Talento Requerido">
                          <TextField fullWidth size="small" name="otroTalento" value={datosGC.otroTalento} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('otroTalento', e.target.value)} placeholder="Subcontratos y otros" sx={comunInputSx} />
                        </FilaEditable>
                      </>
                    )}
                  </Box>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ color: '#8b5cf6', fontWeight: 'bold', textTransform: 'uppercase', mb: 3, mt: 4, letterSpacing: '0.5px' }}>Gestión Operativa</Typography>
                  <Box sx={{ pl: 1 }}>

                    {!esVistaProyecto && (
                      <FilaEditable etiqueta="Fecha de Solicitud">
                        <TextField fullWidth type="date" size="small" name="fechaSolicitud" value={datosGC.fechaSolicitud} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('fechaSolicitud', e.target.value)} sx={comunInputSx} />
                      </FilaEditable>
                    )}

                    <FilaEditable etiqueta="Status">
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, py: 0.5 }}>
                        {(esVistaProyecto ? ESTADOS_PROYECTO : ESTADOS_VERIFICACION).map(est => (
                          <Chip key={est} label={est} onClick={() => verificarYGuardarCampo('estado', est)} color={datosGC.estado === est ? "primary" : "default"} variant={datosGC.estado === est ? "filled" : "outlined"} sx={{ borderRadius: '4px', fontWeight: datosGC.estado === est ? 'bold' : 'normal', cursor: 'pointer' }} />
                        ))}
                      </Box>
                    </FilaEditable>

                    <FilaEditable etiqueta="Monto Cotizado">
                      <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
                        <TextField select size="small" name="monedaCotizacion" value={datosGC.monedaCotizacion} onChange={(e) => verificarYGuardarCampo('monedaCotizacion', e.target.value)} sx={{ width: '100px', ...comunInputSx }}>
                          <MenuItem value="CRC" sx={comunMenuSx}>CRC</MenuItem>
                          <MenuItem value="USD" sx={comunMenuSx}>USD</MenuItem>
                        </TextField>
                        <TextField fullWidth size="small" name="montoCotizado" value={datosGC.montoCotizado} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('montoCotizado', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} placeholder="Monto total" sx={comunInputSx} />
                      </Box>
                    </FilaEditable>

                    {esVistaProyecto ? (
                      <>
                        <FilaEditable etiqueta="Presupuesto de Gastos">
                          <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
                            <TextField select size="small" name="monedaPresupuesto" value={datosGC.monedaPresupuesto} onChange={(e) => verificarYGuardarCampo('monedaPresupuesto', e.target.value)} sx={{ width: '100px', ...comunInputSx }}>
                              <MenuItem value="CRC" sx={comunMenuSx}>CRC</MenuItem>
                              <MenuItem value="USD" sx={comunMenuSx}>USD</MenuItem>
                            </TextField>
                            <TextField fullWidth size="small" name="presupuestoGastos" value={datosGC.presupuestoGastos} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('presupuestoGastos', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} placeholder="Monto total" sx={comunInputSx} />
                          </Box>
                        </FilaEditable>

                        <FilaEditable etiqueta="Estado de Pago">
                          <TextField select fullWidth size="small" name="pago" value={datosGC.pago} onChange={(e) => verificarYGuardarCampo('pago', e.target.value)} sx={comunInputSx}>
                            {OPCIONES_PAGO.map(opt => <MenuItem key={opt} value={opt} sx={comunMenuSx}>{opt}</MenuItem>)}
                          </TextField>
                        </FilaEditable>

                        <FilaEditable etiqueta="Salud del Proyecto">
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, py: 0.5 }}>
                            {SALUD_OPCIONES.map(salud => (
                              <Chip key={salud} label={salud} onClick={() => verificarYGuardarCampo('saludProyecto', salud)} color={datosGC.saludProyecto === salud ? "primary" : "default"} variant={datosGC.saludProyecto === salud ? "filled" : "outlined"} sx={{ borderRadius: '4px', fontWeight: datosGC.saludProyecto === salud ? 'bold' : 'normal', cursor: 'pointer' }} />
                            ))}
                          </Box>
                        </FilaEditable>

                        <FilaEditable etiqueta="Progreso del Proyecto">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, width: '100%', px: 1 }}>
                            <Tooltip title={esProgresoBloqueado ? "Bloqueado en esta etapa" : ""} placement="top">
                              <Slider disabled={esProgresoBloqueado} value={Number(datosGC.progreso) || 0} onChange={(e, val) => setDatosGC({ ...datosGC, progreso: val })} onChangeCommitted={(e, val) => verificarYGuardarCampo('progreso', val)} valueLabelDisplay="auto" step={5} marks min={0} max={100} sx={{ color: esProgresoBloqueado ? 'text.disabled' : 'primary.main' }} />
                            </Tooltip>
                            <Typography variant="body2" fontWeight="bold" sx={{ minWidth: '40px', color: esProgresoBloqueado ? 'text.disabled' : 'inherit' }}>{datosGC.progreso || 0}%</Typography>
                          </Box>
                        </FilaEditable>

                        <FilaEditable etiqueta="Administrador">
                          <TextField select fullWidth size="small" name="inspector" value={datosGC.inspector} onChange={(e) => verificarYGuardarCampo('inspector', e.target.value)} sx={comunInputSx}>
                            <MenuItem value="" sx={comunMenuSx}><em>Sin Asignar</em></MenuItem>
                            {inspectorOpciones.map(nombre => <MenuItem key={nombre} value={nombre} sx={comunMenuSx}>{nombre}</MenuItem>)}
                          </TextField>
                        </FilaEditable>

                        <FilaEditable etiqueta="Colaboradores">
                          <TextField select fullWidth size="small" name="colaboradores" SelectProps={{ multiple: true }} value={datosGC.colaboradores || []} onChange={(e) => verificarYGuardarCampo('colaboradores', e.target.value)} sx={comunInputSx}>
                            {colabOpciones.map(nombre => <MenuItem key={nombre} value={nombre} sx={comunMenuSx}>{nombre}</MenuItem>)}
                          </TextField>
                        </FilaEditable>

                        <FilaEditable etiqueta="Fechas (Inicio - Fin)">
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <TextField fullWidth type="date" size="small" name="fechaInicio" value={datosGC.fechaInicio} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('fechaInicio', e.target.value)} sx={comunInputSx} />
                            <Typography>-</Typography>
                            <TextField fullWidth type="date" size="small" name="fechaFin" value={datosGC.fechaFin} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('fechaFin', e.target.value)} sx={comunInputSx} />
                          </Box>
                        </FilaEditable>
                      </>
                    ) : (
                      <>
                        <FilaEditable etiqueta="Cancelación del pago">
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, py: 0.5 }}>
                            {OPCIONES_SINO.map(opt => (
                              <Chip key={opt} label={opt} onClick={() => verificarYGuardarCampo('cancelacionPago', opt)} color={datosGC.cancelacionPago === opt ? "primary" : "default"} variant={datosGC.cancelacionPago === opt ? "filled" : "outlined"} sx={{ borderRadius: '4px', fontWeight: datosGC.cancelacionPago === opt ? 'bold' : 'normal', cursor: 'pointer' }} />
                            ))}
                          </Box>
                        </FilaEditable>

                        <FilaEditable etiqueta="Seguimiento">
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, py: 0.5 }}>
                            {SEGUIMIENTO_VERIFICACION.map(seg => (
                              <Chip key={seg} label={seg} onClick={() => verificarYGuardarCampo('seguimiento', seg)} color={datosGC.seguimiento === seg ? "primary" : "default"} variant={datosGC.seguimiento === seg ? "filled" : "outlined"} sx={{ borderRadius: '4px', fontWeight: datosGC.seguimiento === seg ? 'bold' : 'normal', cursor: 'pointer' }} />
                            ))}
                          </Box>
                        </FilaEditable>

                        <FilaEditable etiqueta="Inspector Asignado">
                          <TextField select fullWidth size="small" name="inspector" value={datosGC.inspector} onChange={(e) => verificarYGuardarCampo('inspector', e.target.value)} sx={comunInputSx}>
                            <MenuItem value="" sx={comunMenuSx}><em>Sin Asignar</em></MenuItem>
                            {inspectorOpciones.map(nombre => <MenuItem key={nombre} value={nombre} sx={comunMenuSx}>{nombre}</MenuItem>)}
                          </TextField>
                        </FilaEditable>

                        <FilaEditable etiqueta="Fecha Programación">
                          <TextField fullWidth type="date" size="small" name="fechaProgramacion" value={datosGC.fechaProgramacion} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('fechaProgramacion', e.target.value)} sx={comunInputSx} />
                        </FilaEditable>
                      </>
                    )}

                    <FilaEditable etiqueta="Archivos (Drive)">
                      <Box sx={{ width: '100%' }}>
                        {archivos.map((archivo, i) => (
                          <Box key={i} sx={{ display: 'flex', alignItems: 'center', p: 1, border: '1px solid #e2e8f0', borderRadius: '4px', mb: 1 }}>
                            <InsertDriveFileIcon color="primary" sx={{ mr: 1 }} />
                            <Typography variant="body2" sx={{ flexGrow: 1, cursor: 'pointer', textDecoration: 'underline', color: '#0ea5e9' }} onClick={() => window.open(archivo.url, '_blank')}>{archivo.nombre}</Typography>
                            <IconButton size="small" color="error" onClick={() => eliminarArchivo(i, archivo.nombre)}><DeleteIcon fontSize="small" /></IconButton>
                          </Box>
                        ))}
                        <Button variant="outlined" onClick={abrirGoogleDrivePicker} startIcon={<AttachFileIcon />} sx={{ textTransform: 'none', borderRadius: '20px', mt: 1, color: '#00838f', borderColor: '#00838f' }}>Adjuntar desde Google Drive</Button>
                      </Box>
                    </FilaEditable>

                  </Box>
                </Box>
              </Box>

              {/* COLUMNA DERECHA: BITÁCORA */}
              <Box sx={{ width: '380px', flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <Box sx={{ flexShrink: 0, p: 2, borderBottom: '1px solid #e2e8f0', backgroundColor: '#f1f5f9' }}>
                  <Typography variant="subtitle1" sx={{ color: '#8b5cf6', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bitácora y Actividad</Typography>
                </Box>

                <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, minHeight: 0 }}>
                  <List disablePadding>
                    {bitacora.map((comentario) => {
                      const esSistema = comentario.texto.match(/^(Cambió|Adjuntó|Eliminó|Registro migrado)/) || comentario.autor === 'Sistema';
                      return (
                        <ListItem key={comentario.id} alignItems="flex-start" sx={{ px: 0, mb: esSistema ? 0.5 : 2 }}>
                          <ListItemAvatar sx={{ minWidth: '40px' }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: esSistema ? '#e2e8f0' : '#cbd5e1' }}>
                              <PersonIcon fontSize="small" sx={{ color: esSistema ? '#94a3b8' : '#fff' }} />
                            </Avatar>
                          </ListItemAvatar>

                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                <Typography variant="caption" fontWeight="bold" color={esSistema ? "textSecondary" : "textPrimary"}>
                                  {comentario.autor}
                                </Typography>
                                <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.65rem' }}>
                                  {comentario.fecha}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Typography
                                variant="body2"
                                sx={{
                                  mt: 0.5,
                                  color: esSistema ? '#6b7280' : '#111827',
                                  fontStyle: esSistema ? 'italic' : 'normal',
                                  backgroundColor: esSistema ? 'transparent' : '#fff',
                                  p: esSistema ? 0 : 1.5,
                                  border: esSistema ? 'none' : '1px solid #e2e8f0',
                                  borderRadius: '4px',
                                  fontSize: '0.8rem',
                                  wordBreak: 'break-word'
                                }}
                              >
                                {comentario.texto}
                              </Typography>
                            }
                          />
                        </ListItem>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </List>
                </Box>
                <Box sx={{ flexShrink: 0, p: 2, backgroundColor: '#fff', borderTop: '1px solid #e2e8f0' }}>
                  <TextField fullWidth multiline maxRows={3} size="small" placeholder="Añade un comentario..." value={nuevoComentario} onChange={(e) => setNuevoComentario(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); agregarComentario(); } }} sx={{ backgroundColor: '#fff', mb: 1, ...comunInputSx }} />
                  <Button fullWidth variant="contained" endIcon={<SendIcon />} size="small" onClick={agregarComentario} sx={{ textTransform: 'none', borderRadius: '4px' }}>Comentar</Button>
                </Box>
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}

export default App;