/**
 * Epic #60 - Task #64: Middleware de Validación
 * 
 * Middleware para validar requests del endpoint /api/chat usando Zod.
 * Garantiza que todos los datos de entrada cumplan con los schemas definidos.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ChatRequestSchema } from '../interfaces/chat.interface';
import { logger } from '../utils/logger';

/**
 * Resultado de validación
 */
interface ValidationResult {
  success: boolean;
  data?: any;
  errors?: Array<{
    path: string;
    message: string;
  }>;
}

/**
 * Formatea errores de Zod para respuesta HTTP
 */
function formatZodErrors(error: ZodError): ValidationResult['errors'] {
  return error.errors.map((err) => ({
    path: err.path.join('.'),
    message: err.message,
  }));
}

/**
 * Middleware genérico para validar con un schema Zod
 */
export function validateSchema(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validar el body del request
      const validatedData = schema.parse(req.body);
      
      // Reemplazar req.body con datos validados
      req.body = validatedData;
      
      logger.trace('Request validado exitosamente', {
        endpoint: req.path,
        method: req.method,
      });
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = formatZodErrors(error);
        
        logger.warn('Error de validación en request', {
          endpoint: req.path,
          method: req.method,
          errors,
        });
        
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Los datos enviados no son válidos',
            details: errors,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      // Error inesperado
      logger.error('Error inesperado en validación', {
        endpoint: req.path,
        method: req.method,
      }, error as Error);
      
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error interno del servidor',
        },
        timestamp: new Date().toISOString(),
      });
    }
  };
}

/**
 * Middleware específico para validar ChatRequest
 */
export const validateChatRequest = validateSchema(ChatRequestSchema);

/**
 * Middleware para sanitizar input (prevenir XSS básico)
 */
export function sanitizeInput(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    // Sanitizar campos de texto
    Object.keys(req.body).forEach((key) => {
      if (typeof req.body[key] === 'string') {
        // Remover HTML tags básicos
        req.body[key] = req.body[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<[^>]+>/g, '')
          .trim();
      }
    });
  }
  
  next();
}

/**
 * Middleware para validar headers requeridos
 */
export function validateHeaders(requiredHeaders: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const missingHeaders: string[] = [];
    
    requiredHeaders.forEach((header) => {
      if (!req.headers[header.toLowerCase()]) {
        missingHeaders.push(header);
      }
    });
    
    if (missingHeaders.length > 0) {
      logger.warn('Headers faltantes en request', {
        endpoint: req.path,
        method: req.method,
        missingHeaders,
      });
      
      res.status(400).json({
        error: {
          code: 'MISSING_HEADERS',
          message: 'Headers requeridos faltantes',
          details: {
            missing: missingHeaders,
          },
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    next();
  };
}

/**
 * Middleware para validar Content-Type
 */
export function validateContentType(allowedTypes: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.headers['content-type'];
    
    if (!contentType) {
      res.status(400).json({
        error: {
          code: 'MISSING_CONTENT_TYPE',
          message: 'Content-Type header es requerido',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    const isAllowed = allowedTypes.some((type) => 
      contentType.toLowerCase().includes(type.toLowerCase())
    );
    
    if (!isAllowed) {
      res.status(415).json({
        error: {
          code: 'UNSUPPORTED_MEDIA_TYPE',
          message: 'Content-Type no soportado',
          details: {
            received: contentType,
            allowed: allowedTypes,
          },
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    next();
  };
}

/**
 * Middleware para validar tamaño del body
 */
export function validateBodySize(maxSizeKB: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.headers['content-length'];
    
    if (contentLength) {
      const sizeKB = parseInt(contentLength, 10) / 1024;
      
      if (sizeKB > maxSizeKB) {
        logger.warn('Request body demasiado grande', {
          endpoint: req.path,
          method: req.method,
          sizeKB,
          maxSizeKB,
        });
        
        res.status(413).json({
          error: {
            code: 'PAYLOAD_TOO_LARGE',
            message: 'El tamaño del request es demasiado grande',
            details: {
              size: `${sizeKB.toFixed(2)} KB`,
              maxSize: `${maxSizeKB} KB`,
            },
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }
    }
    
    next();
  };
}

/**
 * Export all validators
 */
export default {
  validateSchema,
  validateChatRequest,
  sanitizeInput,
  validateHeaders,
  validateContentType,
  validateBodySize,
};
