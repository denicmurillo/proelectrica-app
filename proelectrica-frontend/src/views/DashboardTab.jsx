import { useState, useMemo } from 'react';
import {
    Box, Typography, TextField, MenuItem, Card, CardContent, Paper,
    Button, Chip, ToggleButton, ToggleButtonGroup
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import EditDocumentIcon from '@mui/icons-material/EditDocument';
import { PieChart } from '@mui/x-charts/PieChart';
import { BarChart } from '@mui/x-charts/BarChart';

// --- CONSTANTES LOCALES DEL DASHBOARD ---
const comunInputSx = { '& .MuiInputBase-root': { fontSize: '0.875rem' } };
const comunMenuSx = { fontSize: '0.875rem' };
const EMPRESAS_ENCARGADAS = ["Proeléctrica", "Edificaciones", "Investigaciones"];
const COLORES_GRAFICOS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#f43f5e', '#64748b'];

const currentYear = new Date().getFullYear();
const defaultStartDate = `${currentYear}-01-01`;
const defaultEndDate = `${currentYear}-12-31`;

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

export const DashboardTab = ({ proyectos, vistaDashboard, setVistaDashboard, abrirFicha }) => {
    const [empresaFiltroGerencia, setEmpresaFiltroGerencia] = useState('Todas');
    const [fechaFiltroInicio, setFechaFiltroInicio] = useState(defaultStartDate);
    const [fechaFiltroFin, setFechaFiltroFin] = useState(defaultEndDate);

    const mGerencia = useMemo(() => {
        let totalFiltrado = 0; const conteoEmpresas = {};
        let pmoExitosos = 0, pmoPerdidos = 0;
        let verifExitosos = 0, verifPerdidos = 0;

        proyectos.forEach(p => {
            const fechaOrden = getFechaOrdenamiento(p);
            if (fechaFiltroInicio && fechaOrden < fechaFiltroInicio) return;
            if (fechaFiltroFin && fechaOrden > fechaFiltroFin) return;

            const empresa = !isProyectoApp(p) ? (p.empresa_encargada || "UVIE Proeléctrica") : (p.empresa_encargada || "Sin Asignar");
            const estadoSeguro = p.estado || '';

            const pasaFiltro = empresaFiltroGerencia === 'Todas' || empresa === empresaFiltroGerencia;
            if (pasaFiltro) {
                totalFiltrado++;
                conteoEmpresas[empresa] = (conteoEmpresas[empresa] || 0) + 1;

                if (isProyectoApp(p)) {
                    if (['Adjudicado', 'En progreso', 'Revisión por parte del cliente', 'Completado y listo para facturar', 'Facturado y pendiente de pago', 'Pago recibido y proyecto archivado'].includes(estadoSeguro)) pmoExitosos++;
                    else if (['No se ejecutó. Proyecto archivado'].includes(estadoSeguro)) pmoPerdidos++;
                } else {
                    if (['Adjudicado y pagado', 'Asignado y programado', 'Elaboración de informe', 'En revisión del Verificador', 'Finalizado y entregado'].includes(estadoSeguro)) verifExitosos++;
                    else if (['Archivado no adjudicado'].includes(estadoSeguro)) verifPerdidos++;
                }
            }
        });

        const pieData = Object.keys(conteoEmpresas).map((key, index) => ({ id: index, label: key, value: conteoEmpresas[key], color: COLORES_GRAFICOS[index % COLORES_GRAFICOS.length] })).filter(d => d.value > 0);

        const totalPMO = pmoExitosos + pmoPerdidos;
        const efecPMO = totalPMO > 0 ? Math.round((pmoExitosos / totalPMO) * 100) : 0;

        const totalVerif = verifExitosos + verifPerdidos;
        const efecVerif = totalVerif > 0 ? Math.round((verifExitosos / totalVerif) * 100) : 0;

        return { pieData, total: totalFiltrado, efecPMO, pmoExitosos, totalPMO, efecVerif, verifExitosos, totalVerif };
    }, [proyectos, empresaFiltroGerencia, fechaFiltroInicio, fechaFiltroFin]);

    const mPMO = useMemo(() => {
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
    }, [proyectos]);

    const mGC = useMemo(() => {
        const verifProyectos = proyectos.filter(p => !isProyectoApp(p));
        const estadosCont = {}; const seguimientoCont = { "Primera inspección": 0, "Reinspección": 0 };
        let alertasVBA = 0; const informesPendientes = []; const alertasSLA = [];
        const estadosFlujoCalidad = ["Adjudicado y pagado", "Asignado y programado", "Elaboración de informe", "En revisión del Verificador"];

        verifProyectos.forEach(p => {
            const estadoSeguro = p.estado || 'Sin Estado';
            estadosCont[estadoSeguro] = (estadosCont[estadoSeguro] || 0) + 1;
            if (p.datos_dinamicos?.seguimiento_inspeccion) seguimientoCont[p.datos_dinamicos.seguimiento_inspeccion] = (seguimientoCont[p.datos_dinamicos.seguimiento_inspeccion] || 0) + 1;
            if (estadoSeguro === 'Nueva Solicitud' || !p.identificador_solicitud) alertasVBA += 1;
            if (estadosFlujoCalidad.includes(estadoSeguro)) informesPendientes.push({ id: p.id, identificador: p.identificador_solicitud || 'Sin ID', cliente: p.empresa_solicitante || 'Sin Nombre', estado: estadoSeguro });

            if (estadoSeguro === "Elaboración de informe" || estadoSeguro === "En revisión del Verificador") {
                const logCambio = [...(p.bitacora || [])].reverse().find(log => log.texto.includes(`Cambió Estado (Status) a: "${estadoSeguro}"`));
                let dias = 0;
                if (logCambio && logCambio.id) dias = Math.floor((Date.now() - logCambio.id) / (1000 * 60 * 60 * 24));
                if (estadoSeguro === "Elaboración de informe" && dias > 10) alertasSLA.push({ id: p.id, identificador: p.identificador_solicitud, cliente: p.empresa_solicitante, dias, estado: estadoSeguro });
                else if (estadoSeguro === "En revisión del Verificador" && dias > 2) alertasSLA.push({ id: p.id, identificador: p.identificador_solicitud, cliente: p.empresa_solicitante, dias, estado: estadoSeguro });
            }
        });

        const estadosData = Object.keys(estadosCont).map(key => ({ name: key, value: estadosCont[key] })).filter(d => d.value > 0).sort((a, b) => a.value - b.value);
        const segData = Object.keys(seguimientoCont).map((key, index) => ({ id: index, label: key, value: seguimientoCont[key], color: key === 'Reinspección' ? '#f43f5e' : '#0ea5e9' })).filter(d => d.value > 0);
        return { estadosData, segData, informesPendientes, alertasVBA, alertasSLA };
    }, [proyectos]);

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, flexGrow: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1e293b' }}>Panel Estratégico Interactivo</Typography>
                <ToggleButtonGroup color="primary" value={vistaDashboard} exclusive onChange={(e, val) => { if (val) setVistaDashboard(val); }} size="small" sx={{ backgroundColor: '#fff' }}>
                    <ToggleButton value="Gerencia" sx={{ px: 3, fontWeight: 'bold', textTransform: 'none' }}>Gerencia</ToggleButton>
                    <ToggleButton value="PMO" sx={{ px: 3, fontWeight: 'bold', textTransform: 'none' }}>PMO</ToggleButton>
                    <ToggleButton value="GC" sx={{ px: 3, fontWeight: 'bold', textTransform: 'none' }}>Calidad (GC)</ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {vistaDashboard === 'Gerencia' && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                        <TextField select size="small" label="Filtrar por Empresa" value={empresaFiltroGerencia} onChange={(e) => setEmpresaFiltroGerencia(e.target.value)} sx={{ width: '250px', backgroundColor: '#fff', ...comunInputSx }}>
                            <MenuItem value="Todas" sx={comunMenuSx}>Todas las Empresas</MenuItem>
                            {EMPRESAS_ENCARGADAS.map(e => <MenuItem key={e} value={e} sx={comunMenuSx}>{e}</MenuItem>)}
                            <MenuItem value="UVIE Proeléctrica" sx={comunMenuSx}>UVIE Proeléctrica</MenuItem>
                            <MenuItem value="Sin Asignar" sx={comunMenuSx}>Sin Asignar</MenuItem>
                        </TextField>
                        <TextField type="date" size="small" label="Fecha Inicio" InputLabelProps={{ shrink: true }} value={fechaFiltroInicio} onChange={(e) => setFechaFiltroInicio(e.target.value)} sx={{ backgroundColor: '#fff', ...comunInputSx }} />
                        <TextField type="date" size="small" label="Fecha Fin" InputLabelProps={{ shrink: true }} value={fechaFiltroFin} onChange={(e) => setFechaFiltroFin(e.target.value)} sx={{ backgroundColor: '#fff', ...comunInputSx }} />
                        <Button onClick={() => { setFechaFiltroInicio(defaultStartDate); setFechaFiltroFin(defaultEndDate); }} size="small" color="inherit">Reiniciar Año Actual</Button>
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
                        <Card elevation={1} sx={{ borderRadius: '12px', borderTop: '4px solid #10b981' }}>
                            <CardContent>
                                <Typography color="textSecondary" variant="subtitle2" fontWeight="bold">Efectividad en Ventas: Proyectos</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                                    <FactCheckIcon sx={{ color: '#10b981', fontSize: 30, position: 'relative', top: 5 }} />
                                    <Typography variant="h4" fontWeight="bold" color="#1e293b">{mGerencia.efecPMO}%</Typography>
                                    <Typography variant="subtitle1" color="textSecondary" fontWeight="bold">({mGerencia.pmoExitosos}/{mGerencia.totalPMO})</Typography>
                                </Box>
                            </CardContent>
                        </Card>
                        <Card elevation={1} sx={{ borderRadius: '12px', borderTop: '4px solid #0ea5e9' }}>
                            <CardContent>
                                <Typography color="textSecondary" variant="subtitle2" fontWeight="bold">Efectividad en Ventas: Verificaciones</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                                    <FactCheckIcon sx={{ color: '#0ea5e9', fontSize: 30, position: 'relative', top: 5 }} />
                                    <Typography variant="h4" fontWeight="bold" color="#1e293b">{mGerencia.efecVerif}%</Typography>
                                    <Typography variant="subtitle1" color="textSecondary" fontWeight="bold">({mGerencia.verifExitosos}/{mGerencia.totalVerif})</Typography>
                                </Box>
                            </CardContent>
                        </Card>
                        <Card elevation={1} sx={{ borderRadius: '12px', borderTop: '4px solid #8b5cf6' }}>
                            <CardContent>
                                <Typography color="textSecondary" variant="subtitle2" fontWeight="bold">Volumen Operaciones</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <AssignmentTurnedInIcon sx={{ color: '#8b5cf6', fontSize: 32 }} />
                                    <Typography variant="h4" fontWeight="bold" color="#1e293b">{mGerencia.total} Registros</Typography>
                                </Box>
                            </CardContent>
                        </Card>
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
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>{mPMO.proyectosEnRiesgo.map((p) => (<Chip key={p.id} onClick={() => abrirFicha(proyectos.find(x => x.id === p.id))} label={`${p.titulo || `Proyecto #${p.id}`} (${p.salud})`} color={p.salud === 'En peligro' ? "error" : "warning"} variant="outlined" sx={{ fontWeight: 'bold', backgroundColor: '#fff', cursor: 'pointer', '&:hover': { opacity: 0.8 } }} />))}</Box>
                            </CardContent>
                        </Card>
                    )}
                    {mPMO.proyectosCercaVencimiento.length > 0 && (
                        <Card elevation={0} sx={{ backgroundColor: '#fef2f2', border: '1px solid #fecdd3', borderRadius: '8px' }}>
                            <CardContent sx={{ py: '16px !important' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}><EventBusyIcon sx={{ color: '#e11d48' }} /><Typography variant="subtitle1" fontWeight="bold" color="#e11d48">Proyectos Cerca del Límite de Entrega</Typography></Box>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>{mPMO.proyectosCercaVencimiento.map((p) => (<Chip key={p.id} onClick={() => abrirFicha(proyectos.find(x => x.id === p.id))} label={`${p.titulo || `Proyecto #${p.id}`} (${p.diasFaltantes < 0 ? `Vencido hace ${Math.abs(p.diasFaltantes)} días` : p.diasFaltantes === 0 ? 'Vence Hoy' : `Faltan ${p.diasFaltantes} días`})`} color={p.diasFaltantes <= 0 ? "error" : "warning"} variant="outlined" sx={{ fontWeight: 'bold', backgroundColor: '#fff', cursor: 'pointer', '&:hover': { opacity: 0.8 } }} />))}</Box>
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
                    {mGC.alertasSLA.length > 0 && (
                        <Card elevation={0} sx={{ backgroundColor: '#fef2f2', border: '1px solid #fecdd3', borderRadius: '8px', mb: 1 }}>
                            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1, py: '16px !important' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><EventBusyIcon sx={{ color: '#e11d48' }} /><Typography variant="subtitle1" fontWeight="bold" color="#e11d48">SLA Vencido (Atención Inmediata)</Typography></Box>
                                <Typography variant="body2" color="#e11d48" mb={1}>Verificaciones que han superado el tiempo máximo operativo permitido:</Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {mGC.alertasSLA.map((inf) => (
                                        <Chip key={inf.id} onClick={() => abrirFicha(proyectos.find(x => x.id === inf.id))} label={`${inf.identificador || 'Sin ID'} - ${inf.cliente || 'Desconocido'} (${inf.dias} días en ${inf.estado})`} size="small" variant="filled" color="error" sx={{ fontWeight: 'bold', cursor: 'pointer', '&:hover': { opacity: 0.8 } }} />
                                    ))}
                                </Box>
                            </CardContent>
                        </Card>
                    )}
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
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{mGC.informesPendientes.map((inf) => (<Chip key={inf.id} onClick={() => abrirFicha(proyectos.find(x => x.id === inf.id))} label={`${inf.identificador} - ${inf.cliente} (${inf.estado})`} size="small" variant="outlined" sx={{ color: '#15803d', borderColor: '#15803d', backgroundColor: '#fff', cursor: 'pointer', '&:hover': { backgroundColor: '#dcfce7' } }} />))}</Box>
                                </CardContent>
                            </Card>
                        )}
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
                        <Paper elevation={1} sx={{ p: 3, borderRadius: '12px', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="subtitle1" fontWeight="bold" color="#1e293b" mb={2}>Distribución de Estados</Typography>
                            {mGC.estadosData.length > 0 ? (
                                <BarChart layout="horizontal" dataset={mGC.estadosData} yAxis={[{ scaleType: 'band', dataKey: 'name' }]} xAxis={[{ tickMinStep: 1 }]} series={[{ dataKey: 'value', label: 'Expedientes', color: '#8b5cf6' }]} height={320} margin={{ left: 200, right: 20, top: 20, bottom: 20 }} />
                            ) : (<Typography color="textSecondary">Sin datos</Typography>)}
                        </Paper>
                        <Paper elevation={1} sx={{ p: 3, borderRadius: '12px', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="subtitle1" fontWeight="bold" color="#1e293b" mb={2}>Índice Reinspecciones</Typography>
                            {mGC.segData.length > 0 ? <PieChart series={[{ data: mGC.segData }]} height={250} /> : <Typography color="textSecondary">Sin datos</Typography>}
                        </Paper>
                    </Box>
                </Box>
            )}
        </Box>
    );
};