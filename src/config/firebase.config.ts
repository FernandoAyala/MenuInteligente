import admin from 'firebase-admin';
import { config } from './env.config';

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
    if (config.firebase.credentialsPath) {
      // Usar service account credentials
      const serviceAccount = require(`../../${config.firebase.credentialsPath}`);
      
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
