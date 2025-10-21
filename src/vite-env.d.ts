/// <reference types="vite/client" />

/**
 * Definición de tipos para las variables de entorno de Vite
 */
interface ImportMetaEnv {
  /** URL base de la API backend */
  readonly VITE_API_URL: string;
  
  /** URL del servidor WebSocket */
  readonly VITE_WS_URL: string;
  
  /** Modo de ejecución (development, production, test) */
  readonly MODE: string;
  
  /** Flag para desarrollo */
  readonly DEV: boolean;
  
  /** Flag para producción */
  readonly PROD: boolean;
  
  /** Flag para SSR */
  readonly SSR: boolean;
}

/**
 * Extensión de la interfaz ImportMeta para incluir env
 */
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
