/**
 * Epic #60 - Task #64: Middleware de Rate Limiting
 * 
 * Middleware para limitar la cantidad de requests por IP/usuario.
 * Previene abuso y protege el sistema de sobrecarga.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { RateLimitConfig, RateLimitInfo } from '../interfaces/chat.interface';

/**
 * Store para tracking de rate limits por IP
 */
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

/**
 * Clase para gestionar rate limiting
 */
class RateLimiter {
  private store: RateLimitStore = {};
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      windowMs: config.windowMs || 60000, // 1 minuto por defecto
      maxRequests: config.maxRequests || 30,
      message: config.message || 'Demasiadas solicitudes, intenta de nuevo más tarde',
      skipSuccessfulRequests: config.skipSuccessfulRequests || false,
      skipFailedRequests: config.skipFailedRequests || false,
    };

    // Limpiar store periódicamente
    setInterval(() => this.cleanup(), this.config.windowMs);
  }

  /**
   * Limpia entradas expiradas del store
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    Object.keys(this.store).forEach((key) => {
      if (this.store[key].resetTime < now) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => delete this.store[key]);

    if (keysToDelete.length > 0) {
      logger.trace(`Rate limit store cleaned: ${keysToDelete.length} keys removed`);
    }
  }

  /**
   * Genera key para el store basado en IP
   */
  private getKey(req: Request): string {
    // Intentar obtener IP real detrás de proxy
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded 
      ? (typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0])
      : req.socket.remoteAddress || 'unknown';
    
    return `ratelimit:${ip}`;
  }

  /**
   * Verifica si el request excede el rate limit
   */
  check(req: Request): { allowed: boolean; info: RateLimitInfo } {
    const key = this.getKey(req);
    const now = Date.now();

    // Si no existe, crear nueva entrada
    if (!this.store[key] || this.store[key].resetTime < now) {
      this.store[key] = {
        count: 1,
        resetTime: now + this.config.windowMs,
      };

      return {
        allowed: true,
        info: {
          limit: this.config.maxRequests,
          remaining: this.config.maxRequests - 1,
          resetTime: new Date(this.store[key].resetTime),
        },
      };
    }

    // Incrementar contador
    this.store[key].count++;

    const allowed = this.store[key].count <= this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - this.store[key].count);

    return {
      allowed,
      info: {
        limit: this.config.maxRequests,
        remaining,
        resetTime: new Date(this.store[key].resetTime),
      },
    };
  }

  /**
   * Resetea el contador para una IP específica
   */
  reset(req: Request): void {
    const key = this.getKey(req);
    delete this.store[key];
  }

  /**
   * Obtiene información del rate limit sin incrementar contador
   */
  getInfo(req: Request): RateLimitInfo {
    const key = this.getKey(req);
    const now = Date.now();

    if (!this.store[key] || this.store[key].resetTime < now) {
      return {
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests,
        resetTime: new Date(now + this.config.windowMs),
      };
    }

    return {
      limit: this.config.maxRequests,
      remaining: Math.max(0, this.config.maxRequests - this.store[key].count),
      resetTime: new Date(this.store[key].resetTime),
    };
  }
}

/**
 * Factory para crear middleware de rate limiting
 */
export function createRateLimiter(config: Partial<RateLimitConfig> = {}) {
  const limiter = new RateLimiter({
    windowMs: config.windowMs || 60000,
    maxRequests: config.maxRequests || 30,
    message: config.message,
    skipSuccessfulRequests: config.skipSuccessfulRequests,
    skipFailedRequests: config.skipFailedRequests,
  });

  return (req: Request, res: Response, next: NextFunction) => {
    const { allowed, info } = limiter.check(req);

    // Agregar headers de rate limit a la respuesta
    res.setHeader('X-RateLimit-Limit', info.limit.toString());
    res.setHeader('X-RateLimit-Remaining', info.remaining.toString());
    res.setHeader('X-RateLimit-Reset', info.resetTime.toISOString());

    if (!allowed) {
      logger.warn('Rate limit excedido', {
        endpoint: req.path,
        method: req.method,
        ip: req.socket.remoteAddress,
        limit: info.limit,
        resetTime: info.resetTime,
      });

      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: config.message || 'Demasiadas solicitudes, intenta de nuevo más tarde',
          details: {
            limit: info.limit,
            retryAfter: Math.ceil((info.resetTime.getTime() - Date.now()) / 1000),
            resetTime: info.resetTime.toISOString(),
          },
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Log si está cerca del límite (80%)
    if (info.remaining < info.limit * 0.2) {
      logger.debug('Rate limit cerca del máximo', {
        endpoint: req.path,
        method: req.method,
        remaining: info.remaining,
        limit: info.limit,
      });
    }

    next();
  };
}

/**
 * Rate limiter para endpoint /api/chat (30 requests por minuto)
 */
export const chatRateLimiter = createRateLimiter({
  windowMs: 60000,           // 1 minuto
  maxRequests: 30,           // 30 requests
  message: 'Demasiados mensajes enviados. Por favor, espera un momento antes de continuar.',
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

/**
 * Rate limiter más estricto para operaciones sensibles (10 requests por minuto)
 */
export const strictRateLimiter = createRateLimiter({
  windowMs: 60000,           // 1 minuto
  maxRequests: 10,           // 10 requests
  message: 'Límite de solicitudes excedido. Por favor, espera antes de reintentar.',
  skipSuccessfulRequests: false,
  skipFailedRequests: true,  // No contar requests fallidos
});

/**
 * Rate limiter permisivo para health checks (100 requests por minuto)
 */
export const healthCheckRateLimiter = createRateLimiter({
  windowMs: 60000,           // 1 minuto
  maxRequests: 100,          // 100 requests
  message: 'Demasiados health checks',
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

/**
 * Export default
 */
export default {
  createRateLimiter,
  chatRateLimiter,
  strictRateLimiter,
  healthCheckRateLimiter,
};
