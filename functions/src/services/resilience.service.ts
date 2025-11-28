/**
 * User Story #74: Experiencia fluida y confiable sin errores técnicos
 * Task #77: Manejo de errores y recuperación
 * 
 * Servicio de resiliencia con estrategias de recuperación automática:
 * - Retry con exponential backoff
 * - Circuit breaker
 * - Timeout configurable
 * - Fallback strategies
 */

import { logger } from '../utils/logger';

/**
 * Opciones para estrategia de retry
 */
export interface RetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: (error: unknown) => boolean;
}

/**
 * Opciones para circuit breaker
 */
export interface CircuitBreakerOptions {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeoutMs: number;
}

/**
 * Estados del circuit breaker
 */
export enum CircuitState {
  CLOSED = 'CLOSED',     // Funcionamiento normal
  OPEN = 'OPEN',         // Circuito abierto, rechaza requests
  HALF_OPEN = 'HALF_OPEN' // Probando si el servicio se recuperó
}

/**
 * Estadísticas del circuit breaker
 */
interface CircuitStats {
  failures: number;
  successes: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
}

/**
 * Servicio de resiliencia con múltiples estrategias
 */
export class ResilienceService {
  private static readonly DEFAULT_RETRY_OPTIONS: RetryOptions = {
    maxAttempts: 3,
    initialDelayMs: 100,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
  };

  private static readonly DEFAULT_CIRCUIT_OPTIONS: CircuitBreakerOptions = {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000,
    resetTimeoutMs: 60000,
  };

  /**
   * Ejecuta una función con retry y exponential backoff
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const opts = { ...this.DEFAULT_RETRY_OPTIONS, ...options };
    let lastError: unknown;
    let delay = opts.initialDelayMs;

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
      try {
        const result = await fn();
        
        if (attempt > 1) {
          logger.info(`Operation succeeded on attempt ${attempt}/${opts.maxAttempts}`);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        // Verificar si el error es recuperable
        if (opts.retryableErrors && !opts.retryableErrors(error)) {
          logger.warn('Non-retryable error detected, aborting retry');
          throw error;
        }

        if (attempt === opts.maxAttempts) {
          logger.error(`All ${opts.maxAttempts} retry attempts failed`, {
            error: error instanceof Error ? error.message : String(error),
          });
          break;
        }

        logger.warn(`Attempt ${attempt}/${opts.maxAttempts} failed, retrying in ${delay}ms`, {
          error: error instanceof Error ? error.message : String(error),
        });

        // Esperar antes del siguiente intento
        await this.delay(delay);
        
        // Incrementar delay con backoff exponencial
        delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
      }
    }

    throw lastError;
  }

  /**
   * Ejecuta una función con timeout
   */
  static async withTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    operationName = 'operation'
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([fn(), timeoutPromise]);
    } catch (error) {
      if (error instanceof Error && error.message.includes('timed out')) {
        logger.error(`Timeout exceeded for ${operationName}`, {
          timeoutMs,
          operation: operationName,
        });
      }
      throw error;
    }
  }

  /**
   * Crea un circuit breaker para proteger servicios externos
   */
  static createCircuitBreaker<T extends unknown[], R>(
    fn: (...args: T) => Promise<R>,
    name: string,
    options: Partial<CircuitBreakerOptions> = {}
  ): (...args: T) => Promise<R> {
    const opts = { ...this.DEFAULT_CIRCUIT_OPTIONS, ...options };
    let state: CircuitState = CircuitState.CLOSED;
    let stats: CircuitStats = {
      failures: 0,
      successes: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
    };
    let nextAttemptTime = 0;

    return async (...args: T): Promise<R> => {
      // Si el circuito está abierto, verificar si es tiempo de reintentar
      if (state === CircuitState.OPEN) {
        const now = Date.now();
        if (now < nextAttemptTime) {
          const waitTime = Math.ceil((nextAttemptTime - now) / 1000);
          throw new Error(
            `Circuit breaker '${name}' is OPEN. Retry in ${waitTime}s`
          );
        }
        
        // Cambiar a HALF_OPEN para probar
        state = CircuitState.HALF_OPEN;
        logger.info(`Circuit breaker '${name}' entering HALF_OPEN state`);
      }

      try {
        // Ejecutar con timeout
        const result = await this.withTimeout(
          () => fn(...args),
          opts.timeout,
          name
        );

        // Éxito - actualizar estadísticas
        stats.successes++;
        stats.consecutiveSuccesses++;
        stats.consecutiveFailures = 0;
        stats.lastSuccessTime = Date.now();

        // Si estamos en HALF_OPEN y alcanzamos el umbral de éxitos, cerrar el circuito
        if (state === CircuitState.HALF_OPEN) {
          if (stats.consecutiveSuccesses >= opts.successThreshold) {
            state = CircuitState.CLOSED;
            stats = {
              failures: 0,
              successes: 0,
              consecutiveFailures: 0,
              consecutiveSuccesses: 0,
            };
            logger.info(`Circuit breaker '${name}' CLOSED (service recovered)`);
          }
        }

        return result;
      } catch (error) {
        // Fallo - actualizar estadísticas
        stats.failures++;
        stats.consecutiveFailures++;
        stats.consecutiveSuccesses = 0;
        stats.lastFailureTime = Date.now();

        logger.error(`Circuit breaker '${name}' recorded failure`, {
          error: error instanceof Error ? error.message : String(error),
          consecutiveFailures: stats.consecutiveFailures,
          state,
        });

        // Si alcanzamos el umbral de fallos, abrir el circuito
        if (
          state === CircuitState.CLOSED &&
          stats.consecutiveFailures >= opts.failureThreshold
        ) {
          state = CircuitState.OPEN;
          nextAttemptTime = Date.now() + opts.resetTimeoutMs;
          
          logger.error(`Circuit breaker '${name}' OPENED`, {
            consecutiveFailures: stats.consecutiveFailures,
            nextAttemptTime: new Date(nextAttemptTime).toISOString(),
          });
        } else if (state === CircuitState.HALF_OPEN) {
          // Si falla en HALF_OPEN, volver a OPEN
          state = CircuitState.OPEN;
          nextAttemptTime = Date.now() + opts.resetTimeoutMs;
          
          logger.warn(`Circuit breaker '${name}' back to OPEN state`);
        }

        throw error;
      }
    };
  }

  /**
   * Ejecuta una función con fallback si falla
   */
  static async withFallback<T>(
    primaryFn: () => Promise<T>,
    fallbackFn: () => Promise<T>,
    operationName = 'operation'
  ): Promise<T> {
    try {
      return await primaryFn();
    } catch (primaryError) {
      logger.warn(`Primary ${operationName} failed, trying fallback`, {
        error: primaryError instanceof Error ? primaryError.message : String(primaryError),
      });

      try {
        const result = await fallbackFn();
        logger.info(`Fallback ${operationName} succeeded`);
        return result;
      } catch (fallbackError) {
        logger.error(`Both primary and fallback ${operationName} failed`, {
          primaryError: primaryError instanceof Error ? primaryError.message : String(primaryError),
          fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
        });
        throw fallbackError;
      }
    }
  }

  /**
   * Combina retry + timeout + circuit breaker
   */
  static async withFullResilience<T>(
    fn: () => Promise<T>,
    options: {
      retryOptions?: Partial<RetryOptions>;
      timeoutMs?: number;
      circuitBreakerName?: string;
      circuitBreakerOptions?: Partial<CircuitBreakerOptions>;
      operationName?: string;
    } = {}
  ): Promise<T> {
    const { retryOptions, timeoutMs, circuitBreakerName, circuitBreakerOptions, operationName = 'operation' } = options;

    // Crear función con todas las capas de resiliencia
    let resilientFn = fn;

    // Capa 1: Timeout (más interna)
    if (timeoutMs) {
      const baseFn = resilientFn;
      resilientFn = () => this.withTimeout(baseFn, timeoutMs, operationName);
    }

    // Capa 2: Circuit breaker
    if (circuitBreakerName) {
      resilientFn = this.createCircuitBreaker(
        resilientFn,
        circuitBreakerName,
        circuitBreakerOptions
      );
    }

    // Capa 3: Retry (más externa)
    if (retryOptions) {
      return this.withRetry(resilientFn, retryOptions);
    }

    return resilientFn();
  }

  /**
   * Utilidad para delay asíncrono
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Verifica si un error es recuperable (transient)
   */
  static isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    const message = error.message.toLowerCase();
    const retryablePatterns = [
      'timeout',
      'econnreset',
      'econnrefused',
      'etimedout',
      'network',
      'temporary',
      'unavailable',
      '429', // Rate limit
      '502', // Bad gateway
      '503', // Service unavailable
      '504', // Gateway timeout
    ];

    return retryablePatterns.some(pattern => message.includes(pattern));
  }
}
