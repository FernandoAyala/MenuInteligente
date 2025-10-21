/**
 * Cliente HTTP configurado para comunicación con la API
 * @module services/api/client
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

/**
 * URL base de la API obtenida de las variables de entorno
 * En desarrollo: http://localhost:3000
 * En producción: se debe configurar con la URL del servidor desplegado
 * @updated 2025-10-21
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
console.log('📡 API Base URL configured:', API_BASE_URL);

/**
 * Timeout para requests HTTP (20 segundos)
 * Aumentado para soportar llamadas LLM que pueden tardar más
 */
const REQUEST_TIMEOUT = 20000;

/**
 * Instancia de axios configurada como cliente HTTP principal
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false, // Cambiar a true si se requiere enviar cookies
});

/**
 * Interceptor de request: se ejecuta antes de enviar cada solicitud
 * Útil para agregar tokens de autenticación, logging, etc.
 */
apiClient.interceptors.request.use(
  (config) => {
    // Agregar timestamp para debugging
    config.metadata = { startTime: new Date().getTime() };
    
    // Logging en desarrollo
    if (import.meta.env.DEV) {
      console.log(`🚀 [HTTP] ${config.method?.toUpperCase()} ${config.url}`, {
        data: config.data,
        params: config.params,
      });
    }

    // TODO: Agregar token de autenticación cuando se implemente
    // const token = localStorage.getItem('authToken');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }

    return config;
  },
  (error) => {
    console.error('❌ [HTTP] Error en request:', error);
    return Promise.reject(error);
  }
);

/**
 * Interceptor de response: se ejecuta al recibir cada respuesta
 * Útil para manejo global de errores, logging de tiempos, etc.
 */
apiClient.interceptors.response.use(
  (response) => {
    // Calcular tiempo de respuesta
    const endTime = new Date().getTime();
    const duration = endTime - (response.config.metadata?.startTime || endTime);

    // Logging en desarrollo
    if (import.meta.env.DEV) {
      console.log(`✅ [HTTP] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        duration: `${duration}ms`,
        data: response.data,
      });
    }

    return response;
  },
  (error: AxiosError) => {
    // Logging de errores
    const config = error.config;
    const endTime = new Date().getTime();
    const duration = config?.metadata?.startTime 
      ? endTime - config.metadata.startTime 
      : 0;

    console.error(`❌ [HTTP] ${config?.method?.toUpperCase()} ${config?.url}`, {
      status: error.response?.status,
      duration: `${duration}ms`,
      message: error.message,
      data: error.response?.data,
    });

    // Manejo específico de errores HTTP
    if (error.response) {
      // El servidor respondió con un código de estado fuera del rango 2xx
      const status = error.response.status;
      const data: any = error.response.data;

      switch (status) {
        case 400:
          console.error('⚠️ Bad Request:', data.message || 'Solicitud inválida');
          break;
        case 401:
          console.error('🔒 Unauthorized:', data.message || 'No autorizado');
          // TODO: Redirigir al login cuando se implemente autenticación
          // window.location.href = '/login';
          break;
        case 403:
          console.error('🚫 Forbidden:', data.message || 'Acceso prohibido');
          break;
        case 404:
          console.error('🔍 Not Found:', data.message || 'Recurso no encontrado');
          break;
        case 429:
          console.error('⏱️ Rate Limited:', data.message || 'Demasiadas solicitudes');
          break;
        case 500:
          console.error('💥 Server Error:', data.message || 'Error interno del servidor');
          break;
        case 503:
          console.error('⛔ Service Unavailable:', data.message || 'Servicio no disponible');
          break;
        default:
          console.error(`❓ HTTP Error ${status}:`, data.message || error.message);
      }
    } else if (error.request) {
      // La solicitud se hizo pero no se recibió respuesta
      console.error('📡 No Response:', 'No se pudo conectar con el servidor');
    } else {
      // Algo sucedió al configurar la solicitud
      console.error('⚙️ Request Setup Error:', error.message);
    }

    return Promise.reject(error);
  }
);

/**
 * Tipo para metadata de requests (usado en interceptores)
 */
declare module 'axios' {
  export interface AxiosRequestConfig {
    metadata?: {
      startTime: number;
    };
  }
}

export default apiClient;
