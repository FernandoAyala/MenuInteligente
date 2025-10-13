import { getFirestore } from '../config/firebase.config';
import {
  ConversationSession,
  CreateSessionDto,
  UpdateSessionDto,
} from '../models/session.model';

const COLLECTION_NAME = 'conversationSessions';

/**
 * Repository para gestionar sesiones de conversación en Firestore
 */
export class SessionRepository {
  private db: FirebaseFirestore.Firestore;
  private collection: FirebaseFirestore.CollectionReference;

  constructor() {
    this.db = getFirestore();
    this.collection = this.db.collection(COLLECTION_NAME);
  }

  /**
   * Crear una nueva sesión de conversación
   */
  async create(data: CreateSessionDto): Promise<ConversationSession> {
    const now = new Date();
    const docRef = await this.collection.add({
      ...data,
      startedAt: now,
      updatedAt: now,
    });

    const doc = await docRef.get();
    return this.mapToSession(doc);
  }

  /**
   * Obtener una sesión por ID
   */
  async findById(id: string): Promise<ConversationSession | null> {
    const doc = await this.collection.doc(id).get();

    if (!doc.exists) {
      return null;
    }

    return this.mapToSession(doc);
  }

  /**
   * Actualizar una sesión existente
   */
  async update(id: string, data: UpdateSessionDto): Promise<ConversationSession | null> {
    const docRef = this.collection.doc(id);
    
    await docRef.update({
      ...data,
      updatedAt: new Date(),
    });

    const doc = await docRef.get();
    if (!doc.exists) {
      return null;
    }

    return this.mapToSession(doc);
  }

  /**
   * Agregar un mensaje a la sesión
   */
  async addMessage(sessionId: string, message: any): Promise<ConversationSession | null> {
    const docRef = this.collection.doc(sessionId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    const currentData = doc.data();
    const messages = currentData?.messages || [];

    await docRef.update({
      messages: [...messages, { ...message, timestamp: new Date() }],
      updatedAt: new Date(),
    });

    const updatedDoc = await docRef.get();
    return this.mapToSession(updatedDoc);
  }

  /**
   * Eliminar una sesión
   */
  async delete(id: string): Promise<boolean> {
    await this.collection.doc(id).delete();
    return true;
  }

  /**
   * Mapear documento de Firestore a ConversationSession
   */
  private mapToSession(doc: FirebaseFirestore.DocumentSnapshot): ConversationSession {
    const data = doc.data();
    if (!data) {
      throw new Error(`No se encontraron datos para el documento ${doc.id}`);
    }

    return {
      id: doc.id,
      startedAt: data.startedAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      slots: data.slots || {},
      messages: data.messages || [],
      cart: data.cart || [],
    };
  }
}
