/**
 * Epic #60: API Conversacional y Orquestación
 * Task #63: Endpoint /api/chat - Routes
 * 
 * Define las rutas del endpoint de chat con su middleware chain
 */

import express from 'express';
import { chatController } from '../controllers/chat.controller';
import { asyncHandler } from '../middleware/error-handler.middleware';
import { chatRateLimiter } from '../middleware/rate-limit.middleware';
import { validateChatRequest } from '../middleware/validation.middleware';

const router: express.Router = express.Router();

/**
 * POST /api/chat
 * Endpoint principal para enviar mensajes de chat
 * 
 * Middleware chain:
 * 1. validateChatRequest - Valida el body contra ChatRequestSchema
 * 2. chatRateLimiter - Limita a 30 peticiones por minuto por IP
 * 3. asyncHandler - Envuelve el controller para manejo de errores
 */
router.post(
  '/',
  validateChatRequest,
  chatRateLimiter,
  asyncHandler(chatController.handleMessage)
);

/**
 * GET /api/chat/metrics
 * Obtiene métricas del sistema de chat
 */
router.get(
  '/metrics',
  asyncHandler(chatController.getMetrics)
);

/**
 * GET /api/chat/health
 * Health check del servicio de chat
 */
router.get(
  '/health',
  asyncHandler(chatController.healthCheck)
);

/**
 * POST /api/chat/:sessionId/confirm-order
 * Confirmar y crear una comanda desde el carrito de la sesión
 * 
 * Body: { tableNumber: number, customerNotes?: string }
 */
router.post(
  '/:sessionId/confirm-order',
  chatRateLimiter,
  asyncHandler(chatController.confirmOrder)
);

export default router;
