/**
 * Epic #60: API Conversacional y Orquestación
 * Task #66: Middleware de Manejo de Errores
 * 
 * Sistema de manejo centralizado de errores con clases personalizadas
 * y respuestas estructuradas para el cliente.
 * 
 * Características:
 * - Clases de error tipadas por categoría
 * - Códigos de error consistentes
 * - Logging automático de errores
 * - Respuestas HTTP apropiadas
 * - Sanitización de errores en producción
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';
import { ChatErrorCode } from '../interfaces/chat.interface';

/**
 * Clase base para errores del sistema de chat
 */
export class ChatError extends Error {
  public readonly statusCode: number;
  public readonly code: ChatErrorCode;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    code: ChatErrorCode,
    isOperational = true,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    // Mantiene el stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error de validación de entrada
 */
export class ValidationError extends ChatError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(
      message,
      400,
      ChatErrorCode.VALIDATION_ERROR,
      true,
      details
    );
  }
}

/**
 * Error de sesión no encontrada
 */
export class SessionNotFoundError extends ChatError {
  constructor(sessionId: string) {
    super(
      `Session not found: ${sessionId}`,
      404,
      ChatErrorCode.SESSION_NOT_FOUND,
      true,
      { sessionId }
    );
  }
}

/**
 * Error de timeout del LLM
 */
export class LLMTimeoutError extends ChatError {
  constructor(timeoutMs: number) {
    super(
      `LLM request timed out after ${timeoutMs}ms`,
      504,
      ChatErrorCode.LLM_TIMEOUT,
      true,
      { timeoutMs }
    );
  }
}

/**
 * Error genérico del LLM
 */
export class LLMError extends ChatError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(
      message,
      502,
      ChatErrorCode.LLM_ERROR,
      true,
      details
    );
  }
}

/**
 * Error de rate limiting
 */
export class RateLimitError extends ChatError {
  constructor(retryAfter?: number) {
    super(
      'Too many requests. Please try again later.',
      429,
      ChatErrorCode.RATE_LIMIT_EXCEEDED,
      true,
      { retryAfter }
    );
  }
}

/**
 * Error de caché
 */
export class CacheError extends ChatError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(
      message,
      500,
      ChatErrorCode.CACHE_ERROR,
      true,
      details
    );
  }
}

/**
 * Error de base de datos
 */
export class DatabaseError extends ChatError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(
      message,
      500,
      ChatErrorCode.DB_ERROR,
      true,
      details
    );
  }
}

/**
 * Error de timeout general
 */
export class TimeoutError extends ChatError {
  constructor(operation: string, timeoutMs: number) {
    super(
      `Operation '${operation}' timed out after ${timeoutMs}ms`,
      504,
      ChatErrorCode.STAGE_TIMEOUT,
      true,
      { operation, timeoutMs }
    );
  }
}

/**
 * Error de configuración
 */
export class ConfigurationError extends ChatError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(
      message,
      500,
      ChatErrorCode.INTERNAL_ERROR,
      false,
      details
    );
  }
}

/**
 * Error de servicio no disponible
 */
export class ServiceUnavailableError extends ChatError {
  constructor(service: string) {
    super(
      `Service unavailable: ${service}`,
      503,
      ChatErrorCode.LLM_UNAVAILABLE,
      true,
      { service }
    );
  }
}

/**
 * Error de contenido inapropiado
 */
export class InappropriateContentError extends ChatError {
  constructor(message: string) {
    super(
      message,
      400,
      ChatErrorCode.INVALID_MESSAGE,
      true
    );
  }
}

/**
 * Error de autenticación
 */
export class AuthenticationError extends ChatError {
  constructor(message = 'Authentication required') {
    super(
      message,
      401,
      ChatErrorCode.VALIDATION_ERROR,
      true
    );
  }
}

/**
 * Error de autorización
 */
export class AuthorizationError extends ChatError {
  constructor(message = 'Insufficient permissions') {
    super(
      message,
      403,
      ChatErrorCode.VALIDATION_ERROR,
      true
    );
  }
}

/**
 * Error de recurso no encontrado
 */
export class NotFoundError extends ChatError {
  constructor(resource: string, id?: string) {
    super(
      `${resource} not found${id ? `: ${id}` : ''}`,
      404,
      ChatErrorCode.SESSION_NOT_FOUND,
      true,
      { resource, id }
    );
  }
}

/**
 * Interfaz para respuestas de error estructuradas
 */
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    stack?: string;
  };
  timestamp: string;
  path?: string;
  requestId?: string;
}

/**
 * Determina si un error es operacional (esperado) o de programación (bug)
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof ChatError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Formatea errores de Zod en un formato legible
 */
function formatZodError(error: ZodError): Record<string, unknown> {
  return {
    validationErrors: error.errors.map(err => ({
      path: err.path.join('.'),
      message: err.message,
      code: err.code
    }))
  };
}

/**
 * Middleware de manejo de errores global
 * Debe ser el último middleware registrado en Express
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Generar ID de request si no existe
  const requestId = (req.headers['x-request-id'] as string) || `req_${Date.now()}`;

  // Determinar status code y error code
  let statusCode = 500;
  let errorCode = ChatErrorCode.INTERNAL_ERROR;
  let details: Record<string, unknown> | undefined;
  let message = 'An unexpected error occurred';

  // Procesar según el tipo de error
  if (err instanceof ChatError) {
    statusCode = err.statusCode;
    errorCode = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    errorCode = ChatErrorCode.VALIDATION_ERROR;
    message = 'Validation failed';
    details = formatZodError(err);
  } else if (err.name === 'SyntaxError' && 'body' in err) {
    statusCode = 400;
    errorCode = ChatErrorCode.VALIDATION_ERROR;
    message = 'Invalid JSON format';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    errorCode = ChatErrorCode.VALIDATION_ERROR;
    message = 'Invalid or expired token';
  }

  // Logging del error
  const errorContext = {
    requestId,
    path: req.path,
    method: req.method,
    statusCode,
    errorCode,
    message: err.message,
    stack: err.stack,
    details,
    isOperational: isOperationalError(err)
  };

  if (statusCode >= 500) {
    logger.error('Internal server error', errorContext);
  } else if (statusCode >= 400) {
    logger.warn('Client error', errorContext);
  }

  // Preparar respuesta de error
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: errorCode,
      message,
      details
    },
    timestamp: new Date().toISOString(),
    path: req.path,
    requestId
  };

  // En desarrollo, incluir stack trace
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack;
  }

  // Enviar respuesta
  res.status(statusCode).json(errorResponse);
};

/**
 * Middleware para manejar rutas no encontradas (404)
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const error = new NotFoundError('Route', req.path);
  
  logger.warn('Route not found', {
    path: req.path,
    method: req.method
  });

  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: { path: req.path, method: req.method }
    },
    timestamp: new Date().toISOString(),
    path: req.path
  };

  res.status(404).json(errorResponse);
};

/**
 * Wrapper para funciones async que automáticamente captura errores
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Helper para crear timeouts en operaciones async
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new TimeoutError(operation, timeoutMs));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutHandle!);
    return result;
  } catch (error) {
    clearTimeout(timeoutHandle!);
    throw error;
  }
}

/**
 * Helper para validar que un valor no sea null/undefined
 */
export function assertExists<T>(
  value: T | null | undefined,
  errorMessage: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new ValidationError(errorMessage);
  }
}

/**
 * Helper para validar condiciones
 */
export function assert(
  condition: boolean,
  errorMessage: string,
  errorCode: ChatErrorCode = ChatErrorCode.VALIDATION_ERROR
): asserts condition {
  if (!condition) {
    throw new ChatError(errorMessage, 400, errorCode);
  }
}
