/**
 * useProyectos.js
 *
 * Custom hooks para fetching de datos usando React Query.
 * Reemplaza el setInterval de 60s y el manejo manual de estado de carga.
 *
 * Criterio de caché: cuando el servidor ya devuelve el dato actualizado (PATCH de proyecto, nueva
 * entrada de bitácora, proyecto creado) se escribe directo en la caché con setQueryData; solo se
 * invalida (y por tanto se vuelve a descargar) lo que cambia en el servidor sin devolverse.
 * Descargar la lista completa de proyectos tras cada autoguardado dispararía el egress de Supabase.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';

// =====================================================================
// QUERY KEYS — constantes centralizadas para evitar strings dispersos
// =====================================================================
export const QUERY_KEYS = {
  proyectos: ['proyectos'],
  tareasActivas: ['tareas', 'activas'],
  tareasProyecto: (idProyecto) => ['tareas', 'proyecto', idProyecto],
};

// =====================================================================
// HOOKS DE LECTURA (Queries)
// =====================================================================

// El parámetro `enabled` es "hay sesión iniciada": sin token la API responde 401, y el interceptor de
// apiClient cerraría la sesión. Al pasar a true (login) las consultas se ejecutan solas.

/**
 * Lista todos los proyectos.
 * Se considera fresco por 60 segundos (equivalente al setInterval anterior).
 * React Query revalida automáticamente al recuperar el foco de la ventana.
 */
export function useProyectos(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.proyectos,
    queryFn: async () => {
      const res = await apiClient.get('/v1/proyectos');
      return res.data;
    },
    enabled,
    staleTime: 60_000,       // 60s — igual que el setInterval anterior
    refetchOnWindowFocus: true,
  });
}

/**
 * Lista todas las tareas activas (para el Dashboard y vista global).
 */
export function useTareasActivas(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.tareasActivas,
    queryFn: async () => {
      const res = await apiClient.get('/v1/tareas/activas');
      return res.data;
    },
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Lista las tareas de un proyecto específico.
 * Solo ejecuta la query cuando hay sesión y un proyecto seleccionado (idProyecto != null).
 */
export function useTareasProyecto(idProyecto, enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.tareasProyecto(idProyecto),
    queryFn: async () => {
      const res = await apiClient.get(`/v1/proyectos/${idProyecto}/tareas`);
      return res.data;
    },
    enabled: enabled && !!idProyecto,   // No ejecutar si no hay sesión ni proyecto seleccionado
    staleTime: 30_000,
  });
}

// =====================================================================
// HOOKS DE ESCRITURA (Mutations)
// =====================================================================

/**
 * Actualiza parcialmente un proyecto (PATCH).
 * El servidor devuelve el proyecto ya actualizado: se refleja en la lista sin volver a descargarla.
 */
export function useActualizarProyecto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ idProyecto, payload }) =>
      apiClient.patch(`/v1/proyectos/${idProyecto}/gestion`, payload).then(r => r.data),
    onSuccess: (data, { idProyecto }) => {
      queryClient.setQueryData(QUERY_KEYS.proyectos, (lista) =>
        lista?.map(p => (p.id === idProyecto ? data.proyecto : p)));
    },
  });
}

/**
 * Crea un proyecto manualmente. El servidor devuelve el proyecto completo:
 * se agrega a la lista en caché, sin volver a descargarla.
 */
export function useCrearProyecto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post('/v1/proyectos/manual').then(r => r.data),
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.proyectos, (lista) =>
        lista ? [data.proyecto, ...lista] : lista);
    },
  });
}

/**
 * Elimina un proyecto (y, en cascada, sus tareas).
 */
export function useEliminarProyecto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (idProyecto) =>
      apiClient.delete(`/v1/proyectos/${idProyecto}`).then(r => r.data),
    onSuccess: (_data, idProyecto) => {
      queryClient.setQueryData(QUERY_KEYS.proyectos, (lista) =>
        lista?.filter(p => p.id !== idProyecto));
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tareasActivas });
    },
  });
}

/**
 * Crea una tarea en un proyecto.
 * Invalida las tareas del proyecto y la lista de proyectos (el servidor agrega una entrada a la bitácora).
 */
export function useCrearTarea(idProyecto) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) =>
      apiClient.post(`/v1/proyectos/${idProyecto}/tareas`, payload).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tareasProyecto(idProyecto) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.proyectos });
    },
  });
}

/**
 * Edita una tarea (PATCH).
 */
export function useEditarTarea(idProyecto) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ idTarea, payload }) =>
      apiClient.patch(`/v1/tareas/${idTarea}`, payload).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tareasActivas });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tareasProyecto(idProyecto) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.proyectos });
    },
  });
}

/**
 * Completa una tarea (PATCH).
 */
export function useCompletarTarea(idProyecto) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (idTarea) =>
      apiClient.patch(`/v1/tareas/${idTarea}/completar`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tareasActivas });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tareasProyecto(idProyecto) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.proyectos });
    },
  });
}

/**
 * Agrega una entrada a la bitácora (endpoint aislado, append-only).
 * El servidor pone el autor (desde el JWT) y la fecha; la entrada devuelta se agrega a la caché.
 */
export function useAgregarBitacora() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ idProyecto, texto }) =>
      apiClient.post(`/v1/proyectos/${idProyecto}/bitacora`, { texto }).then(r => r.data),
    onSuccess: (data, { idProyecto }) => {
      queryClient.setQueryData(QUERY_KEYS.proyectos, (lista) =>
        lista?.map(p => (p.id === idProyecto ? { ...p, bitacora: [...(p.bitacora || []), data.entrada] } : p)));
    },
  });
}
