import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const parseNumberFromEnv = (value: string | undefined, fallback: number): number => {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

/**
 * Configuración centralizada de variables de entorno
 */
export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
    emulatorHost: process.env.FIREBASE_EMULATOR_HOST,
  },
  
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
  },

  llm: {
    defaultProvider: process.env.LLM_DEFAULT_PROVIDER || 'openai',
    fallbackProvider: process.env.LLM_FALLBACK_PROVIDER,
    breaker: {
      failureThreshold: Math.max(1, parseNumberFromEnv(process.env.LLM_BREAKER_FAILURE_THRESHOLD, 3)),
      cooldownMs: Math.max(1000, parseNumberFromEnv(process.env.LLM_BREAKER_COOLDOWN_MS, 60000)),
    },
  },
  
  allowedOrigins: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:5173', 'http://localhost:3000'],
} as const;

/**
 * Validar que las variables de entorno críticas estén configuradas
 */
export function validateEnvConfig(): void {
  const requiredVars = [
    'FIREBASE_PROJECT_ID',
  ];

  // Al menos uno de los proveedores de LLM debe estar configurado
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasGemini = !!process.env.GEMINI_API_KEY;

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Faltan variables de entorno requeridas: ${missingVars.join(', ')}\n` +
      'Por favor, configura tu archivo .env basándote en .env.example'
    );
  }

  if (!hasOpenAI && !hasGemini) {
    throw new Error(
      'Debes configurar al menos un proveedor de LLM (OPENAI_API_KEY o GEMINI_API_KEY)\n' +
      'Por favor, agrega al menos una API key en tu archivo .env'
    );
  }
}
