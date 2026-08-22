import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import {
  Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, AppBar, Toolbar,
  Box, Button, Divider, TextField, MenuItem, List, ListItem, ListItemText, IconButton, Tabs, Tab, ListItemButton,
  CircularProgress, Snackbar, Alert, InputAdornment, Dialog, DialogTitle, DialogContent, ListItemAvatar, Avatar, Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LogoutIcon from '@mui/icons-material/Logout';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import EditIcon from '@mui/icons-material/Edit';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';

// --- IMPORTACIÓN DE MÓDULOS (LA NUEVA ARQUITECTURA) ---
import { isProyectoApp, getFechaOrdenamiento, EQUIPO_PROELECTRICA, comunInputSx, comunMenuSx, ESTADOS_PROGRESO_BLOQUEADO } from './utils/constants';
import { LoginScreen } from './views/LoginScreen';
import { DashboardTab } from './views/DashboardTab';
import { ExpedienteModal } from './components/ExpedienteModal';

// --- ENTORNO Y CREDENCIALES ---
const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_APP_ID = import.meta.env.VITE_GOOGLE_APP_ID || '';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function App() {
  // --- ESTADOS GLOBALES ---
  const [session, setSession] = useState(null);
  const [authCargando, setAuthCargando] = useState(true);
  const [proyectos, setProyectos] = useState([]);
  const [todasLasTareas, setTodasLasTareas] = useState([]);
  const [tareasProyecto, setTareasProyecto] = useState([]);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const mostrarMensaje = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

  // --- CONTROL DE NAVEGACIÓN Y VISTAS ---
  const [tabActual, setTabActual] = useState(1);
  const [filtroEstado, setFiltroEstado] = useState('Activos');
  const [vistaDashboard, setVistaDashboard] = useState('Gerencia');
  const [busqueda, setBusqueda] = useState('');

  // --- CONTROL DE MODALES ---
  const [modalAbierto, setModalAbierto] = useState(false);
  const [bitacoraExpandida, setBitacoraExpandida] = useState(false);
  const [tareasExpandidas, setTareasExpandidas] = useState(false);
  const [tareaEditando, setTareaEditando] = useState(null);
  const [tabDerecha, setTabDerecha] = useState(0);

  // --- ESTADOS DE DATOS ---
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState(null);
  const [estadoGuardado, setEstadoGuardado] = useState('');
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [datosNuevaTarea, setDatosNuevaTarea] = useState({ descripcion: '', asignado_a: '', fecha_limite: '' });
  const [creandoTarea, setCreandoTarea] = useState(false);
  const [datosEdicionTarea, setDatosEdicionTarea] = useState({ descripcion: '', asignado_a: '', fecha_limite: '' });
  const [bitacora, setBitacora] = useState([]);
  const [archivos, setArchivos] = useState([]);
  const [datosGC, setDatosGC] = useState({});
  const [datosGuardados, setDatosGuardados] = useState({});

  // --- REFERENCIAS ---
  const chatEndRef = useRef(null);
  const chatExpandedEndRef = useRef(null);
  const tokenClientRef = useRef(null);
  const [pickerCargado, setPickerCargado] = useState(false);

  const estadoActualRef = useRef({ archivos, bitacora, datosGC, proyectoSeleccionado });
  useEffect(() => { estadoActualRef.current = { archivos, bitacora, datosGC, proyectoSeleccionado }; }, [archivos, bitacora, datosGC, proyectoSeleccionado]);

  // --- EFECTOS PRINCIPALES ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setAuthCargando(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setSession(session); });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    cargarProyectos();
    cargarTodasLasTareas();
    inicializarGoogleAPIs();
    inyectarSolucionZIndex();
    const intervaloRefresh = setInterval(() => { cargarProyectos(); cargarTodasLasTareas(); }, 300000);
    return () => clearInterval(intervaloRefresh);
  }, [session]);

  useEffect(() => {
    if (chatEndRef.current && tabDerecha === 0) chatEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    if (chatExpandedEndRef.current) chatExpandedEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [bitacora, modalAbierto, bitacoraExpandida, tabDerecha]);

  // --- LÓGICA DE GOOGLE DRIVE ---
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
          client_id: GOOGLE_CLIENT_ID, scope: 'https://www.googleapis.com/auth/drive.readonly',
          callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
              const expiresIn = (tokenResponse.expires_in || 3600) * 1000;
              const expiryTime = Date.now() + expiresIn - 300000; // 5 minutos buffer
              sessionStorage.setItem('googlePickerToken', JSON.stringify({ token: tokenResponse.access_token, expiry: expiryTime }));
              crearYMostrarPicker(tokenResponse.access_token);
            }
          },
        });
        clearInterval(checkGoogle);
      }
    }, 500);
  };

  const abrirGoogleDrivePicker = () => {
    if (!pickerCargado || !tokenClientRef.current) return mostrarMensaje("Conectando con Google... intenta de nuevo en unos segundos.", "info");
    const tokenStr = sessionStorage.getItem('googlePickerToken');
    if (tokenStr) {
      try {
        const tokenData = JSON.parse(tokenStr);
        if (Date.now() < tokenData.expiry) { crearYMostrarPicker(tokenData.token); return; }
      } catch (e) { }
    }
    sessionStorage.removeItem('googlePickerToken');
    tokenClientRef.current.requestAccessToken();
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

  const eliminarArchivo = (archivoAEliminar) => {
    const nuevosArchivos = archivos.filter(a => a.url !== archivoAEliminar.url);
    setArchivos(nuevosArchivos);
    const nombreUsuario = session?.user?.email?.split('@')[0] || 'Usuario';
    const nuevoLog = { id: Date.now(), autor: nombreUsuario, texto: `Eliminó el archivo adjunto: "${archivoAEliminar.nombre}"`, fecha: new Date().toLocaleString() };
    const nuevaBitacora = [...bitacora, nuevoLog];
    setBitacora(nuevaBitacora);
    autoguardarEnBackend(datosGC, nuevaBitacora, nuevosArchivos, proyectoSeleccionado);
  };

  // --- LÓGICA DE API (CRUD) ---
  const cargarProyectos = async () => { try { const respuesta = await axios.get(`${API_URL}/v1/proyectos`); setProyectos(respuesta.data); } catch (error) { console.error(error); } };
  const cargarTodasLasTareas = async () => { if (!session?.user?.email) return; try { const res = await axios.get(`${API_URL}/v1/tareas/activas`); setTodasLasTareas(res.data); } catch (e) { console.error(e); } };
  const cargarTareasProyecto = async (id_proyecto) => { try { const res = await axios.get(`${API_URL}/v1/proyectos/${id_proyecto}/tareas`); setTareasProyecto(res.data); } catch (e) { console.error(e); } };
  const cerrarSesion = async () => { await supabase.auth.signOut(); };

  const handleCrearTarea = async () => {
    if (!datosNuevaTarea.descripcion || !datosNuevaTarea.asignado_a || !datosNuevaTarea.fecha_limite) return mostrarMensaje("Por favor, completa todos los campos.", "warning");
    setCreandoTarea(true);
    try {
      const payload = { descripcion: datosNuevaTarea.descripcion, asignado_a: datosNuevaTarea.asignado_a, asignado_por: session.user.email.split('@')[0], correo_asignador: session.user.email, fecha_limite: datosNuevaTarea.fecha_limite };
      await axios.post(`${API_URL}/v1/proyectos/${proyectoSeleccionado.id}/tareas`, payload);
      setDatosNuevaTarea({ descripcion: '', asignado_a: '', fecha_limite: '' });
      cargarTareasProyecto(proyectoSeleccionado.id); cargarProyectos();
      mostrarMensaje("Tarea asignada correctamente.");
    } catch (e) { mostrarMensaje("Error al crear tarea.", "error"); }
    setCreandoTarea(false);
  };

  const handleCompletarTarea = async (id_tarea) => {
    try {
      await axios.put(`${API_URL}/v1/tareas/${id_tarea}/completar`);
      cargarTodasLasTareas(); if (proyectoSeleccionado) cargarTareasProyecto(proyectoSeleccionado.id); cargarProyectos();
      mostrarMensaje("Tarea completada.");
    } catch (e) { mostrarMensaje("Error al completar.", "error"); }
  };

  const handleGuardarEdicionTarea = async () => {
    if (!datosEdicionTarea.descripcion || !datosEdicionTarea.asignado_a || !datosEdicionTarea.fecha_limite) return mostrarMensaje("Completa todos los campos.", "warning");
    try {
      await axios.put(`${API_URL}/v1/tareas/${tareaEditando.id}`, { ...datosEdicionTarea, modificado_por: session.user.email.split('@')[0] });
      setTareaEditando(null); cargarTodasLasTareas();
      if (proyectoSeleccionado) cargarTareasProyecto(proyectoSeleccionado.id); cargarProyectos();
      mostrarMensaje("Tarea editada.");
    } catch (e) { mostrarMensaje("Error al editar.", "error"); }
  };

  const abrirEdicionTarea = (tarea) => {
    setDatosEdicionTarea({ descripcion: tarea.descripcion, asignado_a: tarea.asignado_a, fecha_limite: tarea.fecha_limite });
    setTareaEditando(tarea);
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
    setProyectoSeleccionado(proyecto); cargarTareasProyecto(proyecto.id); setTabDerecha(0);

    let colabArray = Array.isArray(proyecto.datos_dinamicos?.colaboradores) ? proyecto.datos_dinamicos.colaboradores : (proyecto.datos_dinamicos?.colaboradores ? [proyecto.datos_dinamicos.colaboradores] : []);
    colabArray = colabArray.filter(c => typeof c === 'string' && c.trim() !== "");

    const datosIniciales = {
      tituloProyecto: proyecto.titulo_proyecto || '', empresaEncargada: proyecto.empresa_encargada || 'Proeléctrica', empresa_solicitante: proyecto.empresa_solicitante || '', correo_solicitante: proyecto.correo_solicitante || '', estado: proyecto.estado || 'Nueva Solicitud', montoCotizado: proyecto.monto_cotizado || '', inspector: proyecto.inspector || '', colaboradores: colabArray, fechaProgramacion: formatFechaInput(proyecto.fecha_programacion), fechaInicio: formatFechaInput(proyecto.fecha_inicio), fechaFin: formatFechaInput(proyecto.fecha_fin), fechaSolicitud: formatFechaInput(proyecto.datos_dinamicos?.fecha_solicitud), seguimiento: proyecto.datos_dinamicos?.seguimiento_inspeccion || '', pago: proyecto.pago || 'Pendiente', cancelacionPago: proyecto.datos_dinamicos?.cancelacion_pago || 'No', progreso: proyecto.progreso || 0, provincia: proyecto.datos_dinamicos?.ubicacion?.provincia || '', canton: proyecto.datos_dinamicos?.ubicacion?.canton || '', distrito: proyecto.datos_dinamicos?.ubicacion?.distrito || '', exacta: proyecto.datos_dinamicos?.ubicacion?.exacta || '', actividad: proyecto.datos_dinamicos?.detalles_tecnicos?.actividad || '', cantidad_permisos: proyecto.datos_dinamicos?.detalles_tecnicos?.cantidad_permisos || '', area_m2: proyecto.datos_dinamicos?.detalles_tecnicos?.area_m2 || '', contactoNombre: proyecto.datos_dinamicos?.contacto?.nombre || '', contactoTelefono: proyecto.datos_dinamicos?.contacto?.telefono || '', propietarioNombre: proyecto.datos_dinamicos?.propietario?.nombre || '', propietarioCedula: proyecto.datos_dinamicos?.propietario?.cedula || '', presupuestoGastos: proyecto.presupuesto_gastos || '', saludProyecto: proyecto.salud_proyecto || 'Saludable', monedaPresupuesto: proyecto.datos_dinamicos?.moneda_presupuesto || 'CRC', monedaCotizacion: proyecto.datos_dinamicos?.moneda_cotizacion || 'CRC', resultadosProyecto: proyecto.datos_dinamicos?.resultados_proyecto || '', talentoRequerido: proyecto.datos_dinamicos?.talento_requerido || [], otroTalento: proyecto.datos_dinamicos?.otro_talento || ''
    };
    setDatosGC(datosIniciales); setDatosGuardados(datosIniciales);
    setBitacora(proyecto.bitacora?.length > 0 ? proyecto.bitacora : [{ id: 1, autor: 'Sistema', texto: 'Registro inicial creado.', fecha: proyecto.datos_dinamicos?.fecha_solicitud || new Date().toLocaleString() }]);
    setArchivos(proyecto.archivos || []); setModalAbierto(true);
  };

  const cerrarFicha = () => {
    if (proyectoSeleccionado && JSON.stringify(datosGC) !== JSON.stringify(datosGuardados)) {
      autoguardarEnBackend(datosGC, bitacora, archivos, proyectoSeleccionado);
    }
    setModalAbierto(false);
    setProyectoSeleccionado(null);
  };

  const handleEliminarOArchivar = async () => {
    const esProy = proyectoSeleccionado && isProyectoApp(proyectoSeleccionado);
    if (esProy) {
      if (window.confirm("ATENCIÓN: ¿Estás seguro de que deseas ELIMINAR permanentemente este proyecto? Esta acción borrará todo el expediente y sus tareas. No se puede deshacer.")) {
        try {
          await axios.delete(`${API_URL}/v1/proyectos/${proyectoSeleccionado.id}`);
          mostrarMensaje("Proyecto eliminado exitosamente.", "success");
          cerrarFicha(); cargarProyectos();
        } catch (error) { mostrarMensaje("Error al eliminar el proyecto.", "error"); }
      }
    } else {
      if (window.confirm("¿Deseas ARCHIVAR esta verificación? (Quedará guardada con estado 'Archivado no adjudicado' para mantener la integridad de los registros).")) {
        const nuevosDatosGC = { ...datosGC, estado: 'Archivado no adjudicado' };
        const nombreUsuario = session?.user?.email?.split('@')[0] || 'Sistema';
        const nuevaBitacora = [...bitacora, { id: Date.now(), autor: nombreUsuario, texto: "Expediente archivado por la GC para mantener la integridad de los registros.", fecha: new Date().toLocaleString() }];
        setDatosGC(nuevosDatosGC); setBitacora(nuevaBitacora);
        autoguardarEnBackend(nuevosDatosGC, nuevaBitacora, archivos, proyectoSeleccionado);
        mostrarMensaje("Verificación archivada exitosamente.", "success"); cerrarFicha();
      }
    }
  };

  const autoguardarEnBackend = async (nuevosDatosGC, nuevaBitacora, nuevosArchivos, proyectoBase) => {
    if (!proyectoBase || !proyectoBase.id) return;
    setEstadoGuardado('Guardando...');
    try {
      const datosDinamicosActualizados = {
        ...(proyectoBase.datos_dinamicos || {}),
        seguimiento_inspeccion: nuevosDatosGC.seguimiento,
        fecha_solicitud: nuevosDatosGC.fechaSolicitud,
        cancelacion_pago: nuevosDatosGC.cancelacionPago,
        moneda_presupuesto: nuevosDatosGC.monedaPresupuesto,
        moneda_cotizacion: nuevosDatosGC.monedaCotizacion,
        resultados_proyecto: nuevosDatosGC.resultadosProyecto,
        talento_requerido: nuevosDatosGC.talentoRequerido,
        otro_talento: nuevosDatosGC.otroTalento,
        colaboradores: nuevosDatosGC.colaboradores,
        ubicacion: { ...(proyectoBase.datos_dinamicos?.ubicacion || {}), provincia: nuevosDatosGC.provincia, canton: nuevosDatosGC.canton, distrito: nuevosDatosGC.distrito, exacta: nuevosDatosGC.exacta },
        detalles_tecnicos: { ...(proyectoBase.datos_dinamicos?.detalles_tecnicos || {}), actividad: nuevosDatosGC.actividad, cantidad_permisos: nuevosDatosGC.cantidad_permisos, area_m2: nuevosDatosGC.area_m2 },
        contacto: { ...(proyectoBase.datos_dinamicos?.contacto || {}), nombre: nuevosDatosGC.contactoNombre, telefono: nuevosDatosGC.contactoTelefono },
        propietario: { ...(proyectoBase.datos_dinamicos?.propietario || {}), nombre: nuevosDatosGC.propietarioNombre, cedula: nuevosDatosGC.propietarioCedula }
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
        progreso: Number(nuevosDatosGC.progreso) || 0,
        presupuesto_gastos: nuevosDatosGC.presupuestoGastos,
        salud_proyecto: nuevosDatosGC.saludProyecto,
        bitacora: nuevaBitacora,
        archivos: nuevosArchivos,
        datos_dinamicos: datosDinamicosActualizados
      };
      const res = await axios.put(`${API_URL}/v1/proyectos/${proyectoBase.id}/gestion`, payload);
      
      const proyectoActualizado = {
        ...proyectoBase,
        ...payload,
        datos_dinamicos: datosDinamicosActualizados,
        ...(res.data?.proyecto || {})
      };
      setProyectoSeleccionado(proyectoActualizado);
      setProyectos(prevProyectos => prevProyectos.map(p => p.id === proyectoBase.id ? proyectoActualizado : p));

      setEstadoGuardado('Guardado');
      setTimeout(() => setEstadoGuardado(''), 2000);
    } catch (error) {
      console.error("Error al autoguardar:", error);
      setEstadoGuardado('Error al guardar');
      mostrarMensaje("Hubo un error de conexión al autoguardar.", "error");
    }
  };

  const verificarYGuardarCampo = (campo, valorNuevo) => {
    if (!proyectoSeleccionado) return;
    if (JSON.stringify(datosGuardados[campo]) === JSON.stringify(valorNuevo)) return;
    
    let progresoAjustado = datosGC.progreso;
    if (campo === 'progreso') {
      progresoAjustado = Number(valorNuevo) || 0;
    } else if (campo === 'estado' && ESTADOS_PROGRESO_BLOQUEADO.includes(valorNuevo)) {
      progresoAjustado = 0;
    }

    const nombresLegibles = { tituloProyecto: "Título del Proyecto", empresaEncargada: "Empresa Encargada", empresa_solicitante: "Cliente / Solicitante", correo_solicitante: "Contacto (Email)", estado: "Estado (Status)", seguimiento: "Seguimiento", montoCotizado: "Monto Cotizado", pago: "Estado de Pago", cancelacionPago: "Cancelación del pago", inspector: "Administrador / Inspector", colaboradores: "Colaboradores", fechaInicio: "Fecha Inicial", fechaFin: "Fecha Final", fechaSolicitud: "Fecha de Solicitud", progreso: "Progreso (%)", provincia: "Provincia", canton: "Cantón", distrito: "Distrito", exacta: "Dirección Exacta", actividad: "Actividad", cantidad_permisos: "Cantidad de Permisos", area_m2: "Área (m²)", contactoNombre: "Nombre Contacto", contactoTelefono: "Teléfono Contacto", propietarioNombre: "Nombre Propietario", propietarioCedula: "Cédula Propietario", presupuestoGastos: "Presupuesto de Gastos", monedaPresupuesto: "Moneda de Presupuesto", monedaCotizacion: "Moneda de Cotización", resultadosProyecto: "Resultados del Proyecto", talentoRequerido: "Talento Requerido", otroTalento: "Otro Talento", saludProyecto: "Salud del Proyecto" };

    let valorFormateado = valorNuevo === '' || valorNuevo === null ? 'Vacío' : valorNuevo;
    if (campo === 'progreso') valorFormateado = `${valorNuevo}%`;
    if (campo === 'talentoRequerido' || campo === 'colaboradores') valorFormateado = Array.isArray(valorNuevo) ? (valorNuevo.length > 0 ? valorNuevo.join(', ') : 'Ninguno') : valorNuevo;

    const nombreUsuario = session?.user?.email?.split('@')[0] || 'Sistema';
    const nuevaBitacora = [...bitacora, { id: Date.now(), autor: nombreUsuario, texto: `Cambió ${nombresLegibles[campo] || campo} a: "${valorFormateado}"`, fecha: new Date().toLocaleString() }];
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
    setBitacora(nuevaBitacora); setNuevoComentario(''); autoguardarEnBackend(datosGC, nuevaBitacora, archivos, proyectoSeleccionado);
  };

  const crearProyectoManual = async () => {
    try {
      const res = await axios.post(`${API_URL}/v1/proyectos/manual`);
      const respuestaLista = await axios.get(`${API_URL}/v1/proyectos`);
      setProyectos(respuestaLista.data);
      const nuevoProyecto = respuestaLista.data.find(p => p.id === res.data.id_proyecto);
      if (nuevoProyecto) { abrirFicha(nuevoProyecto); }
    } catch (error) { mostrarMensaje("Error creando proyecto.", "error"); }
  };

  if (authCargando) return <Box sx={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}><CircularProgress /></Box>;
  if (!session) return <LoginScreen setSession={setSession} supabase={supabase} />;

  // --- LÓGICA DE FILTRADO Y BÚSQUEDA ---
  const dataAplicacion = tabActual === 0 ? proyectos.filter(p => !isProyectoApp(p)) : proyectos.filter(p => isProyectoApp(p));
  let listaMostrar = dataAplicacion;

  if (filtroEstado !== 'Todos') {
    if (filtroEstado === 'Cotizaciones') listaMostrar = dataAplicacion.filter(p => p.estado && ["Nueva Solicitud", "Oferta Generada", "Cotización"].includes(p.estado));
    else if (filtroEstado === 'Activos') listaMostrar = dataAplicacion.filter(p => p.estado && ["Adjudicado", "En progreso", "Revisión por parte del cliente", "Asignado y programado", "Elaboración de informe", "En revisión del Verificador", "Adjudicado y pagado"].includes(p.estado));
    else if (filtroEstado === 'Facturación') listaMostrar = dataAplicacion.filter(p => p.estado && ["Completado y listo para facturar", "Facturado y pendiente de pago", "Pendiente de pago"].includes(p.estado));
    else if (filtroEstado === 'Archivados') listaMostrar = dataAplicacion.filter(p => p.estado && ["Pago recibido y proyecto archivado", "No se ejecutó. Proyecto archivado", "Archivado no adjudicado", "Finalizado y entregado"].includes(p.estado));
  }

  if (busqueda.trim() !== '') {
    const termino = busqueda.toLowerCase();
    listaMostrar = listaMostrar.filter(p => {
      const titulo = (p.titulo_proyecto || '').toLowerCase();
      const cliente = (p.empresa_solicitante || '').toLowerCase();
      const idDoc = (p.identificador_solicitud || '').toLowerCase();
      const estado = (p.estado || '').toLowerCase();
      const inspector = (p.inspector || '').toLowerCase();
      const actividad = (p.datos_dinamicos?.detalles_tecnicos?.actividad || '').toLowerCase();
      return titulo.includes(termino) || cliente.includes(termino) || idDoc.includes(termino) || estado.includes(termino) || inspector.includes(termino) || actividad.includes(termino);
    });
  }

  const listaMostrarOrdenada = [...listaMostrar].sort((a, b) => {
    const fechaA = new Date(getFechaOrdenamiento(a)).getTime();
    const fechaB = new Date(getFechaOrdenamiento(b)).getTime();
    if (fechaA !== fechaB) return fechaB - fechaA;
    return b.id - a.id;
  });

  const contarPorGrupo = (grupoEstados) => dataAplicacion.filter(p => p.estado && grupoEstados.some(est => p.estado.includes(est))).length;
  const renderizarEstado = (estadoBackend) => {
    let color = 'default'; const estadoSeguro = estadoBackend || '';
    if (["Nueva Solicitud", "Oferta Generada", "Cotización"].includes(estadoSeguro)) color = 'warning';
    if (["Adjudicado", "En progreso", "Revisión", "Asignado y programado", "Elaboración de informe", "En revisión del Verificador", "Adjudicado y pagado"].some(s => estadoSeguro.includes(s))) color = 'info';
    if (["Completado y listo para facturar", "Facturado y pendiente de pago", "Pendiente de pago"].includes(estadoSeguro)) color = 'primary';
    if (["Pago recibido y proyecto archivado", "No se ejecutó. Proyecto archivado", "Archivado no adjudicado", "Finalizado y entregado"].includes(estadoSeguro)) color = 'success';
    return <Chip label={estadoSeguro || 'Sin Estado'} color={color} size="small" sx={{ fontWeight: 'bold', fontSize: '0.75rem', height: '24px' }} />;
  };

  const tableCellSx = { fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '250px', py: 1.5 };
  const tableHeadSx = { ...tableCellSx, fontWeight: 'bold', color: '#475569' };

  // Derivados para el Modal
  const NOMBRES_EQUIPO = EQUIPO_PROELECTRICA.map(e => e.nombre);
  const inspectorOpciones = [...new Set([...NOMBRES_EQUIPO, datosGC.inspector])].filter(Boolean);
  const colabOpciones = [...new Set([...NOMBRES_EQUIPO, ...(datosGC.colaboradores || [])])].filter(Boolean);
  const esVistaProyecto = proyectoSeleccionado && isProyectoApp(proyectoSeleccionado);

  return (
    <Box sx={{ backgroundColor: '#f1f5f9', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" sx={{ backgroundColor: '#0284c7', boxShadow: 'none' }}>
        <Toolbar sx={{ minHeight: '60px !important', px: { xs: 2, md: 4, lg: 6 }, display: 'flex', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 4 }}>
              <img src="/logo.png" alt="Proeléctrica" style={{ height: '38px' }} onError={(e) => { e.target.style.display = 'none'; }} />
            </Box>
            <Tabs value={tabActual} onChange={(e, val) => { setTabActual(val); setBusqueda(''); setFiltroEstado('Activos'); }} textColor="inherit" indicatorColor="secondary" sx={{ minHeight: '60px' }}>
              <Tab icon={<FactCheckIcon sx={{ fontSize: 20 }} />} iconPosition="start" label="Verificaciones" sx={{ minHeight: '60px', fontWeight: 'bold', textTransform: 'none' }} />
              <Tab icon={<AccountTreeIcon sx={{ fontSize: 20 }} />} iconPosition="start" label="Proyectos" sx={{ minHeight: '60px', fontWeight: 'bold', textTransform: 'none' }} />
              <Tab icon={<DashboardIcon sx={{ fontSize: 20 }} />} iconPosition="start" label="Actividad Global" sx={{ minHeight: '60px', fontWeight: 'bold', textTransform: 'none' }} />
            </Tabs>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ mr: 2, fontWeight: 'bold', opacity: 0.9, display: { xs: 'none', md: 'block' } }}>{session.user.email}</Typography>
            <IconButton color="inherit" onClick={cerrarSesion} title="Cerrar Sesión"><LogoutIcon /></IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {tabActual === 2 ? (
        <DashboardTab proyectos={proyectos} vistaDashboard={vistaDashboard} setVistaDashboard={setVistaDashboard} abrirFicha={abrirFicha} todasLasTareas={todasLasTareas} completarTarea={handleCompletarTarea} usuarioActual={session?.user?.email} abrirEdicionTarea={abrirEdicionTarea} />
      ) : (
        <Box sx={{ flexGrow: 1, px: { xs: 2, md: 4, lg: 6 }, py: 3, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, alignItems: 'flex-start' }}>
          <Paper elevation={1} sx={{ width: { xs: '100%', md: '220px' }, flexShrink: 0, borderRadius: '8px', overflow: 'hidden' }}>
            <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#64748b', fontSize: '0.8rem' }}>VISTAS Y FILTROS</Typography></Box>
            <List dense disablePadding>
              <ListItemButton selected={filtroEstado === 'Todos'} onClick={() => setFiltroEstado('Todos')}>
                <ListItemText primary="Todos los registros" sx={{ '& .MuiListItemText-primary': { fontWeight: filtroEstado === 'Todos' ? 'bold' : 'normal', fontSize: '0.85rem' } }} />
                <Chip label={dataAplicacion.length} size="small" sx={{ height: '20px', fontSize: '0.7rem' }} />
              </ListItemButton>
              <Divider />

              <Box sx={{ px: 2, py: 1 }}><Typography variant="caption" sx={{ fontWeight: 'bold', color: '#8b5cf6', fontSize: '0.7rem' }}>COTIZACIONES</Typography></Box>
              <ListItemButton selected={filtroEstado === 'Cotizaciones'} onClick={() => setFiltroEstado('Cotizaciones')}>
                <ListItemText primary="Mostrar Cotizaciones" sx={{ '& .MuiListItemText-primary': { color: '#7c3aed', fontSize: '0.85rem' } }} />
                <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.8rem' }}>{contarPorGrupo(["Nueva Solicitud", "Oferta Generada", "Cotización"])}</Typography>
              </ListItemButton>
              <Divider />

              <Box sx={{ px: 2, py: 1 }}><Typography variant="caption" sx={{ fontWeight: 'bold', color: '#dc2626', fontSize: '0.7rem' }}>PROYECTOS ACTIVOS</Typography></Box>
              <ListItemButton selected={filtroEstado === 'Activos'} onClick={() => setFiltroEstado('Activos')}>
                <ListItemText primary="Mostrar Activos" sx={{ '& .MuiListItemText-primary': { color: '#dc2626', fontSize: '0.85rem' } }} />
                <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.8rem' }}>{contarPorGrupo(["Adjudicado", "En progreso", "Revisión por parte del cliente", "Asignado y programado", "Elaboración de informe", "En revisión del Verificador", "Adjudicado y pagado"])}</Typography>
              </ListItemButton>
              <Divider />

              <Box sx={{ px: 2, py: 1 }}><Typography variant="caption" sx={{ fontWeight: 'bold', color: '#f59e0b', fontSize: '0.7rem' }}>FACTURACIÓN Y COBRO</Typography></Box>
              <ListItemButton selected={filtroEstado === 'Facturación'} onClick={() => setFiltroEstado('Facturación')}>
                <ListItemText primary="Mostrar Pendientes" sx={{ '& .MuiListItemText-primary': { color: '#d97706', fontSize: '0.85rem' } }} />
                <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.8rem' }}>{contarPorGrupo(["Completado y listo para facturar", "Facturado y pendiente de pago", "Pendiente de pago"])}</Typography>
              </ListItemButton>
              <Divider />

              <Box sx={{ px: 2, py: 1 }}><Typography variant="caption" sx={{ fontWeight: 'bold', color: '#2563eb', fontSize: '0.7rem' }}>ARCHIVADOS</Typography></Box>
              <ListItemButton selected={filtroEstado === 'Archivados'} onClick={() => setFiltroEstado('Archivados')}>
                <ListItemText primary="Mostrar Archivados" sx={{ '& .MuiListItemText-primary': { color: '#2563eb', fontSize: '0.85rem' } }} />
                <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.8rem' }}>{contarPorGrupo(["Pago recibido y proyecto archivado", "No se ejecutó. Proyecto archivado", "Archivado no adjudicado", "Finalizado y entregado"])}</Typography>
              </ListItemButton>
            </List>
          </Paper>

          <Paper elevation={1} sx={{ flexGrow: 1, padding: '1.5rem', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1e293b' }}>
                {tabActual === 0 ? 'Verificaciones Eléctricas' : 'Portafolio de Proyectos'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexGrow: 1, justifyContent: 'flex-end' }}>
                <TextField size="small" placeholder="Buscar por cliente, proyecto, ID, estado..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon color="action" fontSize="small" /></InputAdornment>), }} sx={{ width: { xs: '100%', sm: '350px' }, backgroundColor: '#fff' }} />
                {tabActual === 1 && (
                  <Button variant="contained" color="primary" size="small" startIcon={<AddIcon />} onClick={crearProyectoManual} sx={{ fontWeight: 'bold', borderRadius: '20px', textTransform: 'none', whiteSpace: 'nowrap' }}>Añadir Proyecto</Button>
                )}
              </Box>
            </Box>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                  {tabActual === 0 ? (
                    <TableRow>
                      <TableCell sx={{ ...tableHeadSx, width: '25%' }}>Cliente / Empresa</TableCell>
                      <TableCell sx={{ ...tableHeadSx, width: '15%' }}>ID Documento</TableCell>
                      <TableCell sx={{ ...tableHeadSx, width: '20%' }}>Status</TableCell>
                      <TableCell sx={{ ...tableHeadSx, width: '15%' }}>Empresa Encargada</TableCell>
                      <TableCell sx={{ ...tableHeadSx, width: '10%' }}>Área (m²)</TableCell>
                      <TableCell sx={{ ...tableHeadSx, width: '15%' }}>Prevista Entrega</TableCell>
                    </TableRow>
                  ) : (
                    <TableRow><TableCell sx={{ ...tableHeadSx, width: '25%' }}>Título del Proyecto</TableCell><TableCell sx={{ ...tableHeadSx, width: '20%' }}>Cliente</TableCell><TableCell sx={{ ...tableHeadSx, width: '20%' }}>Status</TableCell><TableCell sx={{ ...tableHeadSx, width: '15%' }}>Progreso</TableCell><TableCell sx={{ ...tableHeadSx, width: '10%' }}>Pago</TableCell><TableCell sx={{ ...tableHeadSx, width: '10%' }}>Admin</TableCell></TableRow>
                  )}
                </TableHead>
                <TableBody>
                  {listaMostrarOrdenada.length === 0 ? <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'gray', fontSize: '0.85rem' }}>No hay registros para esta búsqueda/filtro.</TableCell></TableRow> :
                    listaMostrarOrdenada.map((proyecto) => (
                      <TableRow key={proyecto.id} hover style={{ cursor: 'pointer' }} onClick={() => abrirFicha(proyecto)}>
                        {tabActual === 0 ? (
                          <>
                            <TableCell sx={{ ...tableCellSx, fontWeight: 600, color: '#0ea5e9' }}>{proyecto.empresa_solicitante || 'Sin Nombre'}</TableCell>
                            <TableCell sx={tableCellSx}>{proyecto.identificador_solicitud || 'Pendiente'}</TableCell>
                            <TableCell sx={tableCellSx}>{renderizarEstado(proyecto.estado)}</TableCell>
                            <TableCell sx={tableCellSx}>{proyecto.empresa_encargada || 'UVIE Proeléctrica'}</TableCell>
                            <TableCell sx={{ ...tableCellSx, overflow: 'visible' }}>{proyecto.datos_dinamicos?.detalles_tecnicos?.area_m2 || '---'}</TableCell>
                            <TableCell sx={tableCellSx}>{proyecto.fecha_fin ? formatFechaInput(proyecto.fecha_fin) : '---'}</TableCell>
                          </>
                        ) : (
                          <><TableCell sx={{ ...tableCellSx, fontWeight: 'bold', color: '#8b5cf6' }}>{proyecto.titulo_proyecto || 'Sin Título'}</TableCell><TableCell sx={{ ...tableCellSx, fontWeight: 500, color: '#0ea5e9' }}>{proyecto.empresa_solicitante || 'Sin Nombre'}</TableCell><TableCell sx={tableCellSx}>{renderizarEstado(proyecto.estado)}</TableCell><TableCell sx={tableCellSx}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ width: '100%', minWidth: '80px', bgcolor: '#e2e8f0', borderRadius: '4px', height: '6px' }}><Box sx={{ bgcolor: '#0ea5e9', height: '6px', borderRadius: '4px', width: `${proyecto.progreso || 0}%` }} /></Box><Typography variant="caption" fontWeight="bold" sx={{ fontSize: '0.7rem' }}>{proyecto.progreso || 0}%</Typography></Box></TableCell><TableCell sx={tableCellSx}>{proyecto.pago || 'Pendiente'}</TableCell><TableCell sx={tableCellSx}>{proyecto.inspector || 'Sin asignar'}</TableCell></>
                        )}
                      </TableRow>
                    ))
                  }
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}

      {/* MODAL PRINCIPAL: EXPEDIENTE AISLADO */}
      <ExpedienteModal
        modalAbierto={modalAbierto} cerrarFicha={cerrarFicha} proyectoSeleccionado={proyectoSeleccionado} esVistaProyecto={esVistaProyecto} estadoGuardado={estadoGuardado} handleEliminarOArchivar={handleEliminarOArchivar} datosGC={datosGC} handleTeclado={handleTeclado} verificarYGuardarCampo={verificarYGuardarCampo} archivos={archivos} eliminarArchivo={eliminarArchivo} abrirGoogleDrivePicker={abrirGoogleDrivePicker} tabDerecha={tabDerecha} setTabDerecha={setTabDerecha} setTareasExpandidas={setTareasExpandidas} setBitacoraExpandida={setBitacoraExpandida} datosNuevaTarea={datosNuevaTarea} setDatosNuevaTarea={setDatosNuevaTarea} handleCrearTarea={handleCrearTarea} creandoTarea={creandoTarea} tareasProyecto={tareasProyecto} abrirEdicionTarea={abrirEdicionTarea} handleCompletarTarea={handleCompletarTarea} bitacora={bitacora} chatEndRef={chatEndRef} nuevoComentario={nuevoComentario} setNuevoComentario={setNuevoComentario} agregarComentario={agregarComentario} inspectorOpciones={inspectorOpciones} colabOpciones={colabOpciones}
      />

      {/* MODALES SECUNDARIOS Y SNACKBAR GLOBAL */}
      <Dialog open={Boolean(tareaEditando)} onClose={() => setTareaEditando(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', color: '#1e293b', py: 1 }}>Editar Tarea</DialogTitle>
        <DialogContent dividers sx={{ py: 1 }}>
          <TextField fullWidth size="small" label="Descripción" value={datosEdicionTarea.descripcion} onChange={(e) => setDatosEdicionTarea({ ...datosEdicionTarea, descripcion: e.target.value })} sx={{ mb: 2, mt: 1, ...comunInputSx }} />
          <TextField select fullWidth size="small" label="Asignado a" value={datosEdicionTarea.asignado_a} onChange={(e) => setDatosEdicionTarea({ ...datosEdicionTarea, asignado_a: e.target.value })} sx={{ mb: 2, ...comunInputSx }}>
            {EQUIPO_PROELECTRICA.map(miembro => <MenuItem key={miembro.correo} value={miembro.correo} sx={comunMenuSx}>{miembro.nombre}</MenuItem>)}
          </TextField>
          <TextField fullWidth type="date" size="small" label="Fecha Límite" InputLabelProps={{ shrink: true }} value={datosEdicionTarea.fecha_limite} onChange={(e) => setDatosEdicionTarea({ ...datosEdicionTarea, fecha_limite: e.target.value })} sx={comunInputSx} />
        </DialogContent>
        <Box sx={{ py: 1, px: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button onClick={() => setTareaEditando(null)} color="inherit" sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button onClick={handleGuardarEdicionTarea} variant="contained" color="primary" sx={{ textTransform: 'none' }}>Guardar Cambios</Button>
        </Box>
      </Dialog>

      <Dialog open={bitacoraExpandida} onClose={() => setBitacoraExpandida(false)} maxWidth="md" fullWidth sx={{ '& .MuiDialog-paper': { height: '80vh', maxHeight: '80vh' }, zIndex: 1300 }}>
        <DialogTitle sx={{ borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', py: 1, px: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#8b5cf6' }}>Bitácora Completa del Expediente</Typography>
          <IconButton onClick={() => setBitacoraExpandida(false)}><Typography variant="body2" fontWeight="bold" color="textSecondary">CERRAR ✕</Typography></IconButton>
        </DialogTitle>
        <DialogContent sx={{ py: 1, px: 3, backgroundColor: '#f1f5f9' }}>
          <List disablePadding>
            {bitacora.map((comentario) => {
              const esSistema = comentario.texto.match(/^(Cambió|Adjuntó|Eliminó|Registro migrado|Asignó una nueva|Se marcó como|Editó la tarea)/) || comentario.autor === 'Sistema';
              return (
                <ListItem key={comentario.id} alignItems="flex-start" sx={{ px: 0, mb: 1, py: 0 }}>
                  <ListItemAvatar sx={{ minWidth: '50px' }}><Avatar sx={{ width: 40, height: 40, bgcolor: esSistema ? '#e2e8f0' : '#cbd5e1' }}><PersonIcon sx={{ color: esSistema ? '#94a3b8' : '#fff' }} /></Avatar></ListItemAvatar>
                  <ListItemText
                    primary={<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}><Typography variant="subtitle2" fontWeight="bold" color={esSistema ? "textSecondary" : "textPrimary"}>{comentario.autor}</Typography><Typography variant="caption" color="textSecondary">{comentario.fecha}</Typography></Box>}
                    secondaryTypographyProps={{ component: 'div' }}
                    secondary={<Typography component="div" variant="body1" sx={{ mt: 0.5, color: esSistema ? '#6b7280' : '#1e293b', fontStyle: esSistema ? 'italic' : 'normal', backgroundColor: esSistema ? 'transparent' : '#fff', py: esSistema ? 0 : 1, px: esSistema ? 0 : 2, border: esSistema ? 'none' : '1px solid #e2e8f0', borderRadius: '8px', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{comentario.texto}</Typography>}
                  />
                </ListItem>
              );
            })}
            <div ref={chatExpandedEndRef} />
          </List>
        </DialogContent>
      </Dialog>

      <Dialog open={tareasExpandidas} onClose={() => setTareasExpandidas(false)} maxWidth="md" fullWidth sx={{ '& .MuiDialog-paper': { height: '80vh', maxHeight: '80vh' }, zIndex: 1300 }}>
        <DialogTitle sx={{ borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', py: 1, px: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#0ea5e9' }}>Panel Completo de Tareas</Typography>
          <IconButton onClick={() => setTareasExpandidas(false)}><Typography variant="body2" fontWeight="bold" color="textSecondary">CERRAR ✕</Typography></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, backgroundColor: '#f1f5f9', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ py: 1.5, px: 3, borderBottom: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
            <Typography variant="subtitle2" sx={{ color: '#64748b', mb: 1, fontWeight: 'bold' }}>NUEVA TAREA O INSPECCIÓN</Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <TextField fullWidth size="small" label="Descripción detallada..." value={datosNuevaTarea.descripcion} onChange={(e) => setDatosNuevaTarea({ ...datosNuevaTarea, descripcion: e.target.value })} sx={{ flexGrow: 1, minWidth: '250px' }} />
              <TextField select size="small" label="Asignar a" value={datosNuevaTarea.asignado_a} onChange={(e) => setDatosNuevaTarea({ ...datosNuevaTarea, asignado_a: e.target.value })} sx={{ minWidth: '200px' }}>
                {EQUIPO_PROELECTRICA.map(miembro => <MenuItem key={miembro.correo} value={miembro.correo}>{miembro.nombre}</MenuItem>)}
              </TextField>
              <TextField type="date" size="small" value={datosNuevaTarea.fecha_limite} onChange={(e) => setDatosNuevaTarea({ ...datosNuevaTarea, fecha_limite: e.target.value })} sx={{ minWidth: '150px' }} />
              <Button variant="contained" size="large" onClick={handleCrearTarea} disabled={creandoTarea} sx={{ textTransform: 'none', height: '40px', px: 4 }}>
                {creandoTarea ? 'Guardando...' : 'Asignar Tarea'}
              </Button>
            </Box>
          </Box>
          <Box sx={{ flexGrow: 1, overflowY: 'auto', py: 1, px: 3 }}>
            {tareasProyecto.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center', backgroundColor: '#fff', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                <AssignmentTurnedInIcon sx={{ fontSize: 40, color: '#94a3b8', mb: 1 }} />
                <Typography variant="body1" color="textSecondary">No hay tareas pendientes ni completadas en este proyecto.</Typography>
              </Box>
            ) : (
              <List disablePadding>
                {tareasProyecto.map(t => (
                  <ListItem key={t.id} sx={{ px: 2, py: 1, mb: 1, backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', opacity: t.estado === 'Completada' ? 0.7 : 1 }}>
                    <ListItemText
                      primary={<Typography variant="subtitle1" fontWeight="bold" sx={{ color: t.estado === 'Completada' ? '#64748b' : '#1e293b', textDecoration: t.estado === 'Completada' ? 'line-through' : 'none' }}>{t.descripcion}</Typography>}
                      secondaryTypographyProps={{ component: 'div' }}
                      secondary={
                        <Box sx={{ mt: 1, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                          <Chip icon={<PersonIcon />} label={`Responsable: ${t.asignado_a.split('@')[0]}`} size="small" variant="outlined" />
                          <Chip icon={<EventBusyIcon />} label={`Límite: ${t.fecha_limite}`} size="small" variant="outlined" color={t.estado === 'Pendiente' ? 'warning' : 'default'} />
                          <Chip label={`Asignado por: ${t.asignado_por}`} size="small" sx={{ bgcolor: '#f1f5f9' }} />
                        </Box>
                      }
                    />
                    {t.estado === 'Pendiente' && (
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', ml: 2 }}>
                        {t.enlace_calendario && <Button variant="outlined" size="small" color="info" onClick={() => window.open(t.enlace_calendario, '_blank')} sx={{ textTransform: 'none' }}>Calendario</Button>}
                        <Tooltip title="Editar Tarea">
                          <Button variant="outlined" size="small" color="primary" onClick={() => abrirEdicionTarea(t)} sx={{ minWidth: 'auto', p: 1 }}><EditIcon fontSize="small" /></Button>
                        </Tooltip>
                        <Tooltip title="Marcar como Completada">
                          <Button variant="contained" size="small" color="success" onClick={() => handleCompletarTarea(t.id)} sx={{ textTransform: 'none', fontWeight: 'bold', px: 2 }}>Completar</Button>
                        </Tooltip>
                      </Box>
                    )}
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </DialogContent>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%', fontWeight: 'bold' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default App;