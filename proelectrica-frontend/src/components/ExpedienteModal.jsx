// src/components/ExpedienteModal.jsx

import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, Box, Typography, IconButton, Tooltip,
    TextField, Chip, MenuItem, Slider, Autocomplete, Button, Tabs, Tab, List, ListItem,
    ListItemText, ListItemAvatar, Avatar
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import PersonIcon from '@mui/icons-material/Person';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import EditIcon from '@mui/icons-material/Edit';
import SendIcon from '@mui/icons-material/Send';

// Importamos las constantes centralizadas
import {
    comunInputSx, comunMenuSx, EMPRESAS_ENCARGADAS, PROVINCIAS, TALENTO_OPCIONES,
    ESTADOS_PROYECTO, ESTADOS_VERIFICACION, OPCIONES_PAGO, SALUD_OPCIONES,
    OPCIONES_SINO, SEGUIMIENTO_VERIFICACION, EQUIPO_PROELECTRICA, ESTADOS_PROGRESO_BLOQUEADO
} from '../utils/constants';

// --- SUB-COMPONENTES UI INTERNOS ---
const FilaDato = ({ etiqueta, valor, colorValor = 'textPrimary' }) => (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1.5 }}><Box sx={{ width: '180px', flexShrink: 0 }}><Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>{etiqueta}</Typography></Box><Box sx={{ flexGrow: 1 }}><Typography variant="body2" color={colorValor} sx={{ fontWeight: colorValor === 'primary' ? 'bold' : 'normal', color: colorValor === 'textPrimary' ? '#334155' : undefined }}>{valor || '---'}</Typography></Box></Box>
);

const FilaEditable = ({ etiqueta, children }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}><Box sx={{ width: '180px', flexShrink: 0 }}><Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>{etiqueta}</Typography></Box><Box sx={{ flexGrow: 1, maxWidth: '500px' }}>{children}</Box></Box>
);

export const ExpedienteModal = ({
    modalAbierto, cerrarFicha, proyectoSeleccionado, esVistaProyecto, estadoGuardado, handleEliminarOArchivar,
    datosGC, handleTeclado, verificarYGuardarCampo, archivos, eliminarArchivo, abrirGoogleDrivePicker,
    tabDerecha, setTabDerecha, setTareasExpandidas, setBitacoraExpandida,
    datosNuevaTarea, setDatosNuevaTarea, handleCrearTarea, creandoTarea,
    tareasProyecto, abrirEdicionTarea, handleCompletarTarea,
    bitacora, chatEndRef, nuevoComentario, setNuevoComentario, agregarComentario,
    inspectorOpciones, colabOpciones
}) => {
    const esProgresoBloqueado = ESTADOS_PROGRESO_BLOQUEADO.includes(datosGC.estado);

    if (!proyectoSeleccionado) return null;

    return (
        <Dialog open={modalAbierto} onClose={cerrarFicha} maxWidth="xl" fullWidth sx={{ '& .MuiDialog-paper': { height: '85vh', maxHeight: '85vh', borderRadius: '8px', display: 'flex', flexDirection: 'column' }, zIndex: 1200 }}>
            <DialogTitle sx={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, flexShrink: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1e293b' }}>{esVistaProyecto ? 'Expediente de Proyecto' : 'Expediente de Verificación'}</Typography>
                    {estadoGuardado && <Typography variant="caption" color={estadoGuardado.includes('Error') ? 'error' : 'textSecondary'} sx={{ fontStyle: 'italic', fontWeight: 'bold' }}>{estadoGuardado}</Typography>}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Tooltip title={esVistaProyecto ? "Eliminar Proyecto Permanentemente" : "Archivar Verificación"}>
                        <IconButton color="error" onClick={handleEliminarOArchivar}>
                            <DeleteIcon />
                        </IconButton>
                    </Tooltip>
                    <IconButton onClick={cerrarFicha}><Typography variant="body2" fontWeight="bold" color="textSecondary">CERRAR ✕</Typography></IconButton>
                </Box>
            </DialogTitle>
            <DialogContent sx={{ padding: 0, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
                {/* COLUMNA IZQUIERDA: FORMULARIO */}
                <Box sx={{ flexGrow: 1, overflowY: 'auto', py: '0.5rem', px: '3rem', backgroundColor: '#fff', minHeight: 0 }}>
                    <Box sx={{ mb: 2 }}><Typography variant="subtitle1" sx={{ color: '#0ea5e9', fontWeight: 'bold', textTransform: 'uppercase', mb: 2, letterSpacing: '0.5px', mt: 1 }}>Información del Cliente y Ubicación</Typography><Box sx={{ pl: 1 }}>
                        {esVistaProyecto && <FilaEditable etiqueta="Título del Proyecto"><TextField fullWidth size="small" variant="standard" name="tituloProyecto" value={datosGC.tituloProyecto} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('tituloProyecto', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} InputProps={{ disableUnderline: true }} sx={{ '& .MuiInputBase-input': { fontWeight: 'bold', color: '#8b5cf6', fontSize: '1rem' } }} /></FilaEditable>}
                        {esVistaProyecto ? <FilaEditable etiqueta="Empresa Encargada"><Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, py: 0.5 }}>{EMPRESAS_ENCARGADAS.map(empresa => (<Chip key={empresa} label={empresa} onClick={() => verificarYGuardarCampo('empresaEncargada', empresa)} color={datosGC.empresaEncargada === empresa ? "primary" : "default"} variant={datosGC.empresaEncargada === empresa ? "filled" : "outlined"} sx={{ borderRadius: '4px', fontWeight: datosGC.empresaEncargada === empresa ? 'bold' : 'normal', cursor: 'pointer' }} />))}</Box></FilaEditable> : <FilaDato etiqueta="Empresa Encargada" valor="UVIE Proeléctrica" colorValor="primary" />}
                        <FilaEditable etiqueta="Cliente / Solicitante"><TextField fullWidth size="small" variant="standard" name="empresa_solicitante" value={datosGC.empresa_solicitante} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('empresa_solicitante', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} InputProps={{ disableUnderline: true }} sx={{ '& .MuiInputBase-input': { fontWeight: 'bold', color: '#0ea5e9', fontSize: '0.875rem' } }} /></FilaEditable>
                        {!esVistaProyecto && <FilaDato etiqueta="Identificador (VBA)" valor={proyectoSeleccionado.identificador_solicitud} colorValor="primary" />}
                        <FilaEditable etiqueta="Provincia / Cantón"><Box sx={{ display: 'flex', gap: 1 }}><TextField select fullWidth size="small" name="provincia" value={datosGC.provincia} onChange={(e) => verificarYGuardarCampo('provincia', e.target.value)} sx={comunInputSx}><MenuItem value="" sx={comunMenuSx}><em>Ninguno</em></MenuItem>{PROVINCIAS.map(prov => <MenuItem key={prov} value={prov} sx={comunMenuSx}>{prov}</MenuItem>)}</TextField><TextField fullWidth size="small" name="canton" placeholder="Cantón" value={datosGC.canton} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('canton', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} sx={comunInputSx} /></Box></FilaEditable>
                        <FilaEditable etiqueta="Distrito"><TextField fullWidth size="small" name="distrito" value={datosGC.distrito} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('distrito', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} sx={comunInputSx} /></FilaEditable>
                        <FilaEditable etiqueta="Dirección Exacta"><TextField fullWidth size="small" name="exacta" value={datosGC.exacta} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('exacta', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} sx={comunInputSx} /></FilaEditable>
                    </Box></Box>

                    <Box sx={{ mb: 2 }}><Typography variant="subtitle1" sx={{ color: '#0ea5e9', fontWeight: 'bold', textTransform: 'uppercase', mb: 2, letterSpacing: '0.5px' }}>Detalles Técnicos</Typography><Box sx={{ pl: 1 }}>
                        <FilaEditable etiqueta="Actividad"><TextField fullWidth size="small" name="actividad" value={datosGC.actividad} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('actividad', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} sx={comunInputSx} /></FilaEditable>
                        {!esVistaProyecto && <FilaEditable etiqueta="Permisos (Cantidad)"><TextField fullWidth size="small" name="cantidad_permisos" value={datosGC.cantidad_permisos} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('cantidad_permisos', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} sx={comunInputSx} /></FilaEditable>}
                        <FilaEditable etiqueta="Área (m²)"><TextField fullWidth size="small" name="area_m2" value={datosGC.area_m2} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('area_m2', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} sx={comunInputSx} /></FilaEditable>
                        <FilaEditable etiqueta="Contacto (Nombre)"><TextField fullWidth size="small" name="contactoNombre" value={datosGC.contactoNombre} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('contactoNombre', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} sx={comunInputSx} /></FilaEditable>
                        <FilaEditable etiqueta="Contacto (Teléfono)"><TextField fullWidth size="small" name="contactoTelefono" value={datosGC.contactoTelefono} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('contactoTelefono', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} sx={comunInputSx} /></FilaEditable>
                        <FilaEditable etiqueta="Contacto (Email)"><TextField fullWidth size="small" name="correo_solicitante" value={datosGC.correo_solicitante} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('correo_solicitante', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} sx={comunInputSx} /></FilaEditable>
                        {!esVistaProyecto && <><FilaEditable etiqueta="Propietario (Nombre)"><TextField fullWidth size="small" name="propietarioNombre" value={datosGC.propietarioNombre} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('propietarioNombre', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} sx={comunInputSx} /></FilaEditable><FilaEditable etiqueta="Propietario (Cédula)"><TextField fullWidth size="small" name="propietarioCedula" value={datosGC.propietarioCedula} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('propietarioCedula', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} sx={comunInputSx} /></FilaEditable></>}
                        {esVistaProyecto && <><FilaEditable etiqueta="Resultados del Proyecto"><TextField fullWidth multiline rows={4} size="small" name="resultadosProyecto" value={datosGC.resultadosProyecto} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('resultadosProyecto', e.target.value)} placeholder="Resultados esperados..." sx={comunInputSx} /></FilaEditable><FilaEditable etiqueta="Talento Requerido"><Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, py: 0.5 }}>{TALENTO_OPCIONES.map(talento => { const isSelected = Array.isArray(datosGC.talentoRequerido) && datosGC.talentoRequerido.includes(talento); return (<Chip key={talento} label={talento} onClick={() => { const current = Array.isArray(datosGC.talentoRequerido) ? datosGC.talentoRequerido : []; const newValue = isSelected ? current.filter(t => t !== talento) : [...current, talento]; verificarYGuardarCampo('talentoRequerido', newValue); }} color={isSelected ? "primary" : "default"} variant={isSelected ? "filled" : "outlined"} sx={{ borderRadius: '4px', fontWeight: isSelected ? 'bold' : 'normal', cursor: 'pointer' }} />); })}</Box></FilaEditable><FilaEditable etiqueta="Otro Talento Requerido"><TextField fullWidth size="small" name="otroTalento" value={datosGC.otroTalento} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('otroTalento', e.target.value)} placeholder="Subcontratos y otros" sx={comunInputSx} /></FilaEditable></>}
                    </Box></Box>

                    <Box sx={{ mb: 2 }}><Typography variant="subtitle1" sx={{ color: '#8b5cf6', fontWeight: 'bold', textTransform: 'uppercase', mb: 2, mt: 3, letterSpacing: '0.5px' }}>Gestión Operativa</Typography><Box sx={{ pl: 1 }}>
                        {!esVistaProyecto && <FilaEditable etiqueta="Fecha de Solicitud"><TextField fullWidth type="date" size="small" name="fechaSolicitud" value={datosGC.fechaSolicitud} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('fechaSolicitud', e.target.value)} sx={comunInputSx} /></FilaEditable>}
                        <FilaEditable etiqueta="Status"><Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, py: 0.5 }}>{(esVistaProyecto ? ESTADOS_PROYECTO : ESTADOS_VERIFICACION).map(est => (<Chip key={est} label={est} onClick={() => verificarYGuardarCampo('estado', est)} color={datosGC.estado === est ? "primary" : "default"} variant={datosGC.estado === est ? "filled" : "outlined"} sx={{ borderRadius: '4px', fontWeight: datosGC.estado === est ? 'bold' : 'normal', cursor: 'pointer' }} />))}</Box></FilaEditable>
                        <FilaEditable etiqueta="Monto Cotizado"><Box sx={{ display: 'flex', gap: 1, width: '100%' }}><TextField select size="small" name="monedaCotizacion" value={datosGC.monedaCotizacion} onChange={(e) => verificarYGuardarCampo('monedaCotizacion', e.target.value)} sx={{ width: '100px', ...comunInputSx }}><MenuItem value="CRC" sx={comunMenuSx}>CRC</MenuItem><MenuItem value="USD" sx={comunMenuSx}>USD</MenuItem></TextField><TextField fullWidth size="small" name="montoCotizado" value={datosGC.montoCotizado} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('montoCotizado', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} placeholder="Monto total" sx={comunInputSx} /></Box></FilaEditable>
                        {esVistaProyecto ? <><FilaEditable etiqueta="Presupuesto de Gastos"><Box sx={{ display: 'flex', gap: 1, width: '100%' }}><TextField select size="small" name="monedaPresupuesto" value={datosGC.monedaPresupuesto} onChange={(e) => verificarYGuardarCampo('monedaPresupuesto', e.target.value)} sx={{ width: '100px', ...comunInputSx }}><MenuItem value="CRC" sx={comunMenuSx}>CRC</MenuItem><MenuItem value="USD" sx={comunMenuSx}>USD</MenuItem></TextField><TextField fullWidth size="small" name="presupuestoGastos" value={datosGC.presupuestoGastos} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('presupuestoGastos', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} placeholder="Monto total" sx={comunInputSx} /></Box></FilaEditable><FilaEditable etiqueta="Estado de Pago"><TextField select fullWidth size="small" name="pago" value={datosGC.pago} onChange={(e) => verificarYGuardarCampo('pago', e.target.value)} sx={comunInputSx}>{OPCIONES_PAGO.map(opt => <MenuItem key={opt} value={opt} sx={comunMenuSx}>{opt}</MenuItem>)}</TextField></FilaEditable><FilaEditable etiqueta="Salud del Proyecto"><Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, py: 0.5 }}>{SALUD_OPCIONES.map(salud => (<Chip key={salud} label={salud} onClick={() => verificarYGuardarCampo('saludProyecto', salud)} color={datosGC.saludProyecto === salud ? "primary" : "default"} variant={datosGC.saludProyecto === salud ? "filled" : "outlined"} sx={{ borderRadius: '4px', fontWeight: datosGC.saludProyecto === salud ? 'bold' : 'normal', cursor: 'pointer' }} />))}</Box></FilaEditable><FilaEditable etiqueta="Progreso del Proyecto"><Box sx={{ display: 'flex', alignItems: 'center', gap: 3, width: '100%', px: 1 }}><Tooltip title={esProgresoBloqueado ? "Bloqueado en esta etapa" : ""} placement="top"><Slider disabled={esProgresoBloqueado} value={Number(datosGC.progreso) || 0} onChange={(e, val) => handleTeclado({ target: { name: 'progreso', value: val } })} onChangeCommitted={(e, val) => verificarYGuardarCampo('progreso', val)} valueLabelDisplay="auto" step={5} marks min={0} max={100} sx={{ color: esProgresoBloqueado ? 'text.disabled' : 'primary.main' }} /></Tooltip><Typography variant="body2" fontWeight="bold" sx={{ minWidth: '40px', color: esProgresoBloqueado ? 'text.disabled' : 'inherit' }}>{datosGC.progreso || 0}%</Typography></Box></FilaEditable><FilaEditable etiqueta="Administrador"><TextField select fullWidth size="small" name="inspector" value={datosGC.inspector} onChange={(e) => verificarYGuardarCampo('inspector', e.target.value)} sx={comunInputSx}><MenuItem value="" sx={comunMenuSx}><em>Sin Asignar</em></MenuItem>{inspectorOpciones.map(nombre => <MenuItem key={nombre} value={nombre} sx={comunMenuSx}>{nombre}</MenuItem>)}</TextField></FilaEditable>
                            <FilaEditable etiqueta="Colaboradores">
                                <Autocomplete multiple freeSolo options={colabOpciones} value={Array.isArray(datosGC.colaboradores) ? datosGC.colaboradores : []} onChange={(event, newValue) => verificarYGuardarCampo('colaboradores', newValue)} renderInput={(params) => (<TextField {...params} size="small" placeholder="Añadir colaborador..." sx={comunInputSx} />)} sx={{ width: '100%' }} />
                            </FilaEditable>
                            <FilaEditable etiqueta="Fechas (Inicio - Fin)"><Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}><TextField fullWidth type="date" size="small" name="fechaInicio" value={datosGC.fechaInicio} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('fechaInicio', e.target.value)} sx={comunInputSx} /><Typography>-</Typography><TextField fullWidth type="date" size="small" name="fechaFin" value={datosGC.fechaFin} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('fechaFin', e.target.value)} sx={comunInputSx} /></Box></FilaEditable></> : <><FilaEditable etiqueta="Cancelación del pago"><Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, py: 0.5 }}>{OPCIONES_SINO.map(opt => (<Chip key={opt} label={opt} onClick={() => verificarYGuardarCampo('cancelacionPago', opt)} color={datosGC.cancelacionPago === opt ? "primary" : "default"} variant={datosGC.cancelacionPago === opt ? "filled" : "outlined"} sx={{ borderRadius: '4px', fontWeight: datosGC.cancelacionPago === opt ? 'bold' : 'normal', cursor: 'pointer' }} />))}</Box></FilaEditable><FilaEditable etiqueta="Seguimiento"><Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, py: 0.5 }}>{SEGUIMIENTO_VERIFICACION.map(seg => (<Chip key={seg} label={seg} onClick={() => verificarYGuardarCampo('seguimiento', seg)} color={datosGC.seguimiento === seg ? "primary" : "default"} variant={datosGC.seguimiento === seg ? "filled" : "outlined"} sx={{ borderRadius: '4px', fontWeight: datosGC.seguimiento === seg ? 'bold' : 'normal', cursor: 'pointer' }} />))}</Box></FilaEditable><FilaEditable etiqueta="Inspector Asignado"><TextField select fullWidth size="small" name="inspector" value={datosGC.inspector} onChange={(e) => verificarYGuardarCampo('inspector', e.target.value)} sx={comunInputSx}><MenuItem value="" sx={comunMenuSx}><em>Sin Asignar</em></MenuItem>{inspectorOpciones.map(nombre => <MenuItem key={nombre} value={nombre} sx={comunMenuSx}>{nombre}</MenuItem>)}</TextField></FilaEditable>
                            <FilaEditable etiqueta="Fechas (Insp. - Entrega)"><Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}><TextField fullWidth type="date" size="small" name="fechaInicio" value={datosGC.fechaInicio} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('fechaInicio', e.target.value)} sx={comunInputSx} /><Typography>-</Typography><TextField fullWidth type="date" size="small" name="fechaFin" value={datosGC.fechaFin} onChange={handleTeclado} onBlur={(e) => verificarYGuardarCampo('fechaFin', e.target.value)} sx={comunInputSx} /></Box></FilaEditable></>}
                        <FilaEditable etiqueta="Archivos (Drive)"><Box sx={{ width: '100%' }}>{archivos.map((archivo, i) => (<Box key={archivo.id || archivo.url || i} sx={{ display: 'flex', alignItems: 'center', p: 1, border: '1px solid #e2e8f0', borderRadius: '4px', mb: 1 }}><InsertDriveFileIcon color="primary" sx={{ mr: 1 }} /><Typography variant="body2" sx={{ flexGrow: 1, cursor: 'pointer', textDecoration: 'underline', color: '#0ea5e9' }} onClick={() => window.open(archivo.url, '_blank')}>{archivo.nombre}</Typography><IconButton size="small" color="error" onClick={() => eliminarArchivo(archivo)}><DeleteIcon fontSize="small" /></IconButton></Box>))}<Button variant="outlined" onClick={abrirGoogleDrivePicker} startIcon={<AttachFileIcon />} sx={{ textTransform: 'none', borderRadius: '20px', mt: 1, color: '#00838f', borderColor: '#00838f' }}>Adjuntar desde Google Drive</Button></Box></FilaEditable>
                    </Box></Box>
                </Box>

                {/* COLUMNA DERECHA: PESTAÑAS Y CONTENIDO (TAREAS Y BITÁCORA) */}
                <Box sx={{ width: '500px', flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                    <Tabs value={tabDerecha} onChange={(e, val) => setTabDerecha(val)} variant="fullWidth" sx={{ minHeight: '48px', borderBottom: '1px solid #e2e8f0', bgcolor: '#fff' }}>
                        <Tab label="Bitácora y Actividad" sx={{ fontWeight: 'bold', textTransform: 'none', color: tabDerecha === 0 ? '#8b5cf6 !important' : 'text.secondary' }} />
                        <Tab label="Tareas del Proyecto" sx={{ fontWeight: 'bold', textTransform: 'none', color: tabDerecha === 1 ? '#0ea5e9 !important' : 'text.secondary' }} />
                    </Tabs>

                    {/* CONTENIDO PESTAÑA 1: TAREAS */}
                    {tabDerecha === 1 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
                            <Box sx={{ flexShrink: 0, py: 1, px: 2, borderBottom: '1px solid #e2e8f0', backgroundColor: '#f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="subtitle1" sx={{ color: '#0ea5e9', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gestión de Tareas</Typography>
                                <Tooltip title="Expandir Tareas">
                                    <IconButton size="small" onClick={() => setTareasExpandidas(true)} sx={{ color: '#0ea5e9', padding: 0.5 }}>
                                        <OpenInFullIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                            <Box sx={{ py: 1, px: 2, borderBottom: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
                                <TextField fullWidth size="small" label="Describir tarea o inspección..." value={datosNuevaTarea.descripcion} onChange={(e) => setDatosNuevaTarea({ ...datosNuevaTarea, descripcion: e.target.value })} sx={{ mb: 1, ...comunInputSx }} />
                                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                                    <TextField select fullWidth size="small" label="Asignar a" value={datosNuevaTarea.asignado_a} onChange={(e) => setDatosNuevaTarea({ ...datosNuevaTarea, asignado_a: e.target.value })} sx={comunInputSx}>
                                        {EQUIPO_PROELECTRICA.map(miembro => <MenuItem key={miembro.correo} value={miembro.correo} sx={comunMenuSx}>{miembro.nombre}</MenuItem>)}
                                    </TextField>
                                    <TextField fullWidth type="date" size="small" value={datosNuevaTarea.fecha_limite} onChange={(e) => setDatosNuevaTarea({ ...datosNuevaTarea, fecha_limite: e.target.value })} sx={comunInputSx} />
                                </Box>
                                <Button fullWidth variant="contained" size="small" onClick={handleCrearTarea} disabled={creandoTarea} sx={{ textTransform: 'none' }}>
                                    {creandoTarea ? 'Guardando...' : 'Asignar Tarea'}
                                </Button>
                            </Box>

                            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, minHeight: 0 }}>
                                {tareasProyecto.length === 0 ? (
                                    <Typography variant="body2" color="textSecondary" align="center" sx={{ mt: 2 }}>No hay tareas asignadas a este proyecto.</Typography>
                                ) : (
                                    <List disablePadding>
                                        {tareasProyecto.map(t => (
                                            <ListItem key={t.id} sx={{ px: 0, mb: 0.5, py: 0, opacity: t.estado === 'Completada' ? 0.6 : 1 }}>
                                                <ListItemText
                                                    primary={<Typography variant="body2" fontWeight="bold" sx={{ textDecoration: t.estado === 'Completada' ? 'line-through' : 'none' }}>{t.descripcion}</Typography>}
                                                    secondaryTypographyProps={{ component: 'div' }}
                                                    secondary={<Typography component="div" variant="caption" color="textSecondary">{t.asignado_a.split('@')[0]} | {t.fecha_limite}</Typography>}
                                                />
                                                {t.estado === 'Pendiente' && (
                                                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                                        <Tooltip title="Editar Tarea">
                                                            <Button variant="outlined" size="small" color="primary" onClick={() => abrirEdicionTarea(t)} sx={{ minWidth: 'auto', p: 0.5 }}><EditIcon fontSize="small" /></Button>
                                                        </Tooltip>
                                                        <Tooltip title="Marcar como Completada">
                                                            <Button variant="contained" size="small" color="success" onClick={() => handleCompletarTarea(t.id)} sx={{ minWidth: 'auto', p: 0.5, px: 1, textTransform: 'none', fontWeight: 'bold' }}>Completar</Button>
                                                        </Tooltip>
                                                    </Box>
                                                )}
                                            </ListItem>
                                        ))}
                                    </List>
                                )}
                            </Box>
                        </Box>
                    )}

                    {/* CONTENIDO PESTAÑA 0: BITÁCORA */}
                    {tabDerecha === 0 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
                            <Box sx={{ flexShrink: 0, py: 1, px: 2, borderBottom: '1px solid #e2e8f0', backgroundColor: '#f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="subtitle1" sx={{ color: '#8b5cf6', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Historial del Expediente</Typography>
                                <Tooltip title="Expandir Bitácora">
                                    <IconButton size="small" onClick={() => setBitacoraExpandida(true)} sx={{ color: '#8b5cf6', padding: 0.5 }}>
                                        <OpenInFullIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, minHeight: 0 }}>
                                <List disablePadding>
                                    {bitacora.map((comentario) => {
                                        const esSistema = comentario.texto.match(/^(Cambió|Adjuntó|Eliminó|Registro migrado|Asignó una nueva|Se marcó como|Editó la tarea)/) || comentario.autor === 'Sistema';
                                        return (
                                            <ListItem key={comentario.id} alignItems="flex-start" sx={{ px: 0, mb: 0.5, py: 0 }}>
                                                <ListItemAvatar sx={{ minWidth: '36px' }}><Avatar sx={{ width: 28, height: 28, bgcolor: esSistema ? '#e2e8f0' : '#cbd5e1' }}><PersonIcon sx={{ fontSize: 18, color: esSistema ? '#94a3b8' : '#fff' }} /></Avatar></ListItemAvatar>
                                                <ListItemText
                                                    primary={<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><Typography variant="caption" fontWeight="bold" color={esSistema ? "textSecondary" : "textPrimary"}>{comentario.autor}</Typography><Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.65rem' }}>{comentario.fecha}</Typography></Box>}
                                                    secondaryTypographyProps={{ component: 'div' }}
                                                    secondary={<Typography component="div" variant="body2" sx={{ mt: 0.25, color: esSistema ? '#6b7280' : '#111827', fontStyle: esSistema ? 'italic' : 'normal', backgroundColor: esSistema ? 'transparent' : '#fff', py: esSistema ? 0 : 0.5, px: esSistema ? 0 : 1, border: esSistema ? 'none' : '1px solid #e2e8f0', borderRadius: '4px', fontSize: '0.8rem', wordBreak: 'break-word' }}>{comentario.texto}</Typography>}
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
                    )}
                </Box>
            </DialogContent>
        </Dialog>
    );
};