/**
 * apiClient.js
 *
 * Instancia centralizada de axios con interceptor de autenticación.
 * Inyecta automáticamente el Bearer token de Supabase en cada petición,
 * eliminando la necesidad de gestionar el token manualmente en cada llamada.
 */
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Instancia de Supabase compartida para el interceptor
// (La misma que se usa en App.jsx para auth)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_URL,
});

// Interceptor de solicitud: adjunta el JWT de Supabase como Bearer token
apiClient.interceptors.request.use(
  async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de respuesta: manejo global de errores de autenticación
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido — forzar cierre de sesión
      console.warn('Sesión expirada. Cerrando sesión...');
      await supabase.auth.signOut();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
