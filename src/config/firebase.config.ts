import admin from 'firebase-admin';
import { config } from './env.config';
import { readFileSync } from 'fs';
import { join } from 'path';

let isInitialized = false;

/**
 * Inicializa la conexión con Firebase Admin SDK
 */
export function initializeFirebase(): void {
  if (isInitialized) {
    console.log('⚠️ Firebase ya está inicializado');
    return;
  }

  try {
    // Si estamos en desarrollo con emulador
    if (config.nodeEnv === 'development' && config.firebase.emulatorHost) {
      console.log(`🔧 Usando Firebase Emulator: ${config.firebase.emulatorHost}`);
      process.env.FIRESTORE_EMULATOR_HOST = config.firebase.emulatorHost;
    }

    // Inicializar Firebase Admin
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      // Usar credenciales desde variable de entorno JSON (producción)
      console.log('🔐 Usando credenciales de GOOGLE_APPLICATION_CREDENTIALS_JSON');
      const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: config.firebase.projectId,
      });
    } else if (config.firebase.credentialsPath) {
      // Usar service account credentials desde archivo (desarrollo)
      const serviceAccountPath = join(__dirname, '../../', config.firebase.credentialsPath);
      const serviceAccountContent = readFileSync(serviceAccountPath, 'utf8');
      const serviceAccount = JSON.parse(serviceAccountContent);
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: config.firebase.projectId,
      });
    } else {
      // Usar credenciales por defecto (útil en cloud environments)
      admin.initializeApp({
        projectId: config.firebase.projectId,
      });
    }

    isInitialized = true;
    console.log('✅ Firebase inicializado correctamente');
  } catch (error) {
    console.error('❌ Error al inicializar Firebase:', error);
    throw error;
  }
}

/**
 * Obtiene la instancia de Firestore
 */
export function getFirestore(): admin.firestore.Firestore {
  if (!isInitialized) {
    throw new Error('Firebase no ha sido inicializado. Llama a initializeFirebase() primero.');
  }
  return admin.firestore();
}

/**
 * Obtiene la instancia de Firebase Admin
 */
export function getFirebaseAdmin(): typeof admin {
  if (!isInitialized) {
    throw new Error('Firebase no ha sido inicializado. Llama a initializeFirebase() primero.');
  }
  return admin;
}
