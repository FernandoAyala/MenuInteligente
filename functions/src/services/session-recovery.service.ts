/**
 * User Story #74: Experiencia fluida y confiable sin errores técnicos
 * Task #77: Manejo de errores y recuperación
 * 
 * Servicio de recuperación automática de sesiones:
 * - Validación y reparación de sesiones corruptas
 * - Recuperación desde Firestore
 * - Limpieza de datos inconsistentes
 * - Fallback a nueva sesión si es necesario
 */

import { ConversationSession } from '../models/session.model';
import { SessionRepository } from '../repositories/session.repository';
import { logger } from '../utils/logger';
import { ResilienceService } from './resilience.service';

/**
 * Resultado de validación de sesión
 */
interface SessionValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  canRecover: boolean;
}

/**
 * Servicio de recuperación de sesiones
 */
export class SessionRecoveryService {
  private sessionRepository: SessionRepository;

  constructor() {
    this.sessionRepository = new SessionRepository();
  }

  /**
   * Recupera una sesión con manejo de errores robusto
   */
  async recoverSession(sessionId: string): Promise<ConversationSession | null> {
    try {
      // Intentar recuperar con resiliencia
      const session = await ResilienceService.withRetry(
        () => this.sessionRepository.findById(sessionId),
        {
          maxAttempts: 3,
          initialDelayMs: 200,
          retryableErrors: ResilienceService.isRetryableError,
        }
      );

      if (!session) {
        logger.warn(`Session not found: ${sessionId}`);
        return null;
      }

      // Validar la sesión recuperada
      const validation = this.validateSession(session);

      if (!validation.isValid) {
        if (validation.canRecover) {
          logger.info(`Attempting to repair corrupted session: ${sessionId}`, {
            errors: validation.errors,
          });
          return this.repairSession(session, validation);
        } else {
          logger.error(`Session cannot be recovered: ${sessionId}`, {
            errors: validation.errors,
          });
          return null;
        }
      }

      // Sesión válida
      if (validation.warnings.length > 0) {
        logger.warn(`Session has warnings: ${sessionId}`, {
          warnings: validation.warnings,
        });
      }

      return session;
    } catch (error) {
      logger.error(`Failed to recover session: ${sessionId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Valida la integridad de una sesión
   */
  private validateSession(session: ConversationSession): SessionValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar campos requeridos
    if (!session.id) {
      errors.push('Missing session ID');
    }

    if (!session.startedAt) {
      errors.push('Missing startedAt timestamp');
    }

    if (!session.updatedAt) {
      errors.push('Missing updatedAt timestamp');
    }

    // Validar estructura de slots
    if (!session.slots) {
      errors.push('Missing slots object');
    } else {
      // Validar tipos de datos en slots
      if (session.slots.dietaryRestrictions && !Array.isArray(session.slots.dietaryRestrictions)) {
        errors.push('Invalid dietaryRestrictions format (not an array)');
      }

      if (session.slots.allergens && !Array.isArray(session.slots.allergens)) {
        errors.push('Invalid allergens format (not an array)');
      }

      if (session.slots.budget && typeof session.slots.budget !== 'object') {
        errors.push('Invalid budget format (not an object)');
      }
    }

    // Validar mensajes
    if (!session.messages) {
      warnings.push('Missing messages array (will initialize empty)');
    } else if (!Array.isArray(session.messages)) {
      errors.push('Invalid messages format (not an array)');
    } else {
      // Validar cada mensaje
      session.messages.forEach((msg, index) => {
        if (!msg.role || !msg.content) {
          warnings.push(`Message ${index} missing role or content`);
        }
      });
    }

    // Validar carrito
    if (!session.cart) {
      warnings.push('Missing cart object (will initialize empty)');
    } else if (!Array.isArray(session.cart)) {
      errors.push('cart must be an array');
    }

    // Validar fechas
    if (session.startedAt && session.updatedAt) {
      const started = new Date(session.startedAt).getTime();
      const updated = new Date(session.updatedAt).getTime();

      if (updated < started) {
        errors.push('updatedAt is before startedAt (time inconsistency)');
      }

      // Advertir si la sesión es muy antigua
      const now = Date.now();
      const ageHours = (now - updated) / (1000 * 60 * 60);
      if (ageHours > 24) {
        warnings.push(`Session is ${Math.floor(ageHours)} hours old`);
      }
    }

    const isValid = errors.length === 0;
    const canRecover = errors.length > 0 && errors.length <= 3; // Recuperable si hay pocos errores

    return {
      isValid,
      errors,
      warnings,
      canRecover,
    };
  }

  /**
   * Intenta reparar una sesión corrupta
   */
  private async repairSession(
    session: ConversationSession,
    validation: SessionValidationResult
  ): Promise<ConversationSession | null> {
    const repaired = { ...session };

    try {
      // Reparar timestamps
      if (!repaired.startedAt) {
        repaired.startedAt = new Date();
        logger.info('Repaired missing startedAt');
      }

      if (!repaired.updatedAt) {
        repaired.updatedAt = new Date();
        logger.info('Repaired missing updatedAt');
      }

      // Reparar slots
      if (!repaired.slots) {
        repaired.slots = {
          dietaryRestrictions: [],
          allergens: [],
          budget: undefined,
          dishesMetioned: [],
          quantity: null,
          spicyLevel: null,
          mealType: null,
          preferences: [],
        };
        logger.info('Initialized missing slots');
      } else {
        // Reparar arrays corruptos
        if (!Array.isArray(repaired.slots.dietaryRestrictions)) {
          repaired.slots.dietaryRestrictions = [];
        }
        if (!Array.isArray(repaired.slots.allergens)) {
          repaired.slots.allergens = [];
        }
        if (!Array.isArray(repaired.slots.dishesMetioned)) {
          repaired.slots.dishesMetioned = [];
        }
        if (!Array.isArray(repaired.slots.preferences)) {
          repaired.slots.preferences = [];
        }
      }

      // Reparar mensajes
      if (!Array.isArray(repaired.messages)) {
        repaired.messages = [];
        logger.info('Initialized missing messages array');
      }

      // Reparar carrito
      if (!repaired.cart) {
        repaired.cart = [];
        logger.info('Initialized missing cart');
      } else if (!Array.isArray(repaired.cart)) {
        repaired.cart = [];
      }

      // Guardar sesión reparada
      await this.sessionRepository.update(repaired.id, repaired);
      logger.info(`Successfully repaired session: ${session.id}`);

      return repaired;
    } catch (error) {
      logger.error(`Failed to repair session: ${session.id}`, {
        error: error instanceof Error ? error.message : String(error),
        validationErrors: validation.errors,
      });
      return null;
    }
  }

  /**
   * Crea una nueva sesión como fallback
   */
  async createFallbackSession(userId?: string): Promise<ConversationSession> {
    logger.info('Creating fallback session', { userId });

    const newSession = {
      slots: {
        dietaryRestrictions: [],
        allergens: [],
        preferredCategories: [],
      },
      messages: [],
      cart: [],
    };

    const session = await this.sessionRepository.create(newSession);
    logger.info(`Fallback session created: ${session.id}`);

    return session;
  }

  /**
   * Limpia sesiones antiguas o corruptas
   * NOTA: Requiere implementar método getAll() en SessionRepository
   */
  async cleanupOrphanedSessions(_maxAgeHours = 48): Promise<number> {
    logger.warn('cleanupOrphanedSessions not implemented - requires SessionRepository.getAll()');
    return 0;
    /*
    try {
      logger.info(`Starting cleanup of sessions older than ${maxAgeHours} hours`);

      const allSessions = await this.sessionRepository.getAll();
      const now = Date.now();
      const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
      let deletedCount = 0;

      for (const session of allSessions) {
        const validation = this.validateSession(session);
        const age = now - new Date(session.updatedAt).getTime();

        // Eliminar si es muy antigua o no se puede recuperar
        if (age > maxAgeMs || (!validation.isValid && !validation.canRecover)) {
          await this.sessionRepository.delete(session.id);
          deletedCount++;
          logger.info(`Deleted orphaned session: ${session.id}`, {
            age: Math.floor(age / (1000 * 60 * 60)),
            reason: age > maxAgeMs ? 'too old' : 'unrecoverable',
          });
        }
      }

      logger.info(`Cleanup completed: ${deletedCount} sessions deleted`);
      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup orphaned sessions', {
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
    */
  }
}
