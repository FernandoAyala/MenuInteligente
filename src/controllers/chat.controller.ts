/**
 * Epic #60: API Conversacional y Orquestación
 * Task #63: Endpoint /api/chat - Controller
 * 
 * Controller para manejar las peticiones del endpoint de chat.
 * Implementación simplificada que llama directamente a los servicios.
 */

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { cacheService } from '../services/cache.service';
import { metricsService, MetricType } from '../services/metrics.service';
import { EnhancedLLMService } from '../services/enhanced-llm.service';
import { RecommendationService } from '../services/recommendation.service';
import {
  ChatRequest,
  ChatResponse,
  ChatAction,
  ChatActionType,
  PipelineStage,
  ChatResponseMetadata,
  createChatAction
} from '../interfaces/chat.interface';
import { withTimeout } from '../middleware/error-handler.middleware';
import { SpicyLevel } from '../models/menuItem.model';

/**
 * Controller para el endpoint de chat
 */
export class ChatController {
  private llmService: EnhancedLLMService;
  private recommendationService: RecommendationService;

  constructor() {
    this.llmService = new EnhancedLLMService();
    this.recommendationService = new RecommendationService();
  }

  /**
   * Maneja las peticiones POST /api/chat
   */
  handleMessage = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const chatRequest: ChatRequest = req.body;
    const sessionId = chatRequest.sessionId || uuidv4();

    logger.info('Chat request received', {
      sessionId,
      messageLength: chatRequest.message.length,
      hasContext: !!chatRequest.context
    });

    try {
      // 1. Verificar cache
      const cachedResponse = cacheService.getChatResponse(chatRequest);
      if (cachedResponse) {
        logger.info('Cache hit', { sessionId });
        
        if (metricsService) {
          metricsService.recordRequest(true, true);
          metricsService.recordLatency(MetricType.REQUEST, Date.now() - startTime);
        }

        res.json(cachedResponse);
        return;
      }

      // 2. Procesar con LLM (con timeout de 5 segundos)
      const llmStartTime = Date.now();
      const intents = await withTimeout(
        this.llmService.extractDetailedIntents(chatRequest.message),
        5000,
        'llm-processing'
      );

      if (metricsService) {
        metricsService.recordLLMCall();
        metricsService.recordLatency(MetricType.LLM_CALL, Date.now() - llmStartTime);
      }

      // 3. Convertir intenciones a acciones
      const actions = this.convertIntentsToActions(intents);

      // 4. Generar recomendaciones si se requieren
      let recommendations = undefined;
      const needsRecommendations = actions.some(
        action => action.type === ChatActionType.REQUEST_RECOMMENDATION
      );

      if (needsRecommendations) {
        try {
          const recStartTime = Date.now();
          const recs = await withTimeout(
            this.recommendationService.generateRecommendations({
              allergies: intents.entities.allergens || [],
              dietaryRestrictions: intents.entities.dietaryRestrictions || [],
              preferences: {
                spicyLevel: this.convertSpicyLevel(intents.entities.spicyLevel),
                mealType: intents.entities.mealType ? [intents.entities.mealType] : undefined,
                preferredCategories: intents.entities.preferences || [],
                additionalNotes: chatRequest.message
              }
            }),
            2000,
            'recommendations'
          );
          
          metricsService.recordLatency(MetricType.DB_QUERY, Date.now() - recStartTime);
          recommendations = recs;
        } catch (error) {
          logger.error('Failed to generate recommendations', {
            sessionId,
            error: error instanceof Error ? error.message : 'Unknown'
          });
          // Continuar sin recomendaciones
        }
      }

      // 5. Construir respuesta
      const responseMessage = this.buildResponseMessage(intents, actions);

      const metadata: ChatResponseMetadata = {
        processingTime: Date.now() - startTime,
        llmProvider: this.llmService.getCurrentProvider(),
        fromCache: false,
        stage: PipelineStage.COMPLETE,
        sessionCreated: !chatRequest.sessionId
      };

      const response: ChatResponse = {
        response: responseMessage,
        sessionId,
        actions,
        recommendations,
        metadata
      };

      // 6. Guardar en cache
      try {
        cacheService.setChatResponse(chatRequest, response);
      } catch (error) {
        logger.error('Failed to cache response', {
          sessionId,
          error: error instanceof Error ? error.message : 'Unknown'
        });
      }

      // 7. Registrar métricas
      if (metricsService) {
        metricsService.recordRequest(true, false);
        metricsService.recordLatency(MetricType.REQUEST, Date.now() - startTime);
      }

      logger.info('Chat request processed', {
        sessionId,
        processingTime: metadata.processingTime,
        actionsCount: actions.length,
        hasRecommendations: !!recommendations
      });

      res.json(response);
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (metricsService) {
        metricsService.recordRequest(false, false);
        metricsService.recordLatency(MetricType.REQUEST, duration);
        metricsService.recordError(error instanceof Error ? error.name : 'UnknownError');
      }

      logger.error('Chat request failed', {
        sessionId,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Re-lanzar el error para que lo maneje el error handler middleware
      throw error;
    }
  };

  /**
   * Convierte el nivel de picante del formato de intents al enum SpicyLevel
   */
  private convertSpicyLevel(level: string | null): SpicyLevel | undefined {
    if (!level) return undefined;

    const mapping: Record<string, SpicyLevel> = {
      'none': SpicyLevel.NONE,
      'low': SpicyLevel.MILD,
      'medium': SpicyLevel.MEDIUM,
      'high': SpicyLevel.HOT
    };

    return mapping[level] || undefined;
  }

  /**
   * Construye el mensaje de respuesta basado en intenciones y acciones
   */
  private buildResponseMessage(intents: any, actions: ChatAction[]): string {
    // Si hay una respuesta específica del LLM, usarla
    if (intents.response) {
      return intents.response;
    }

    // Construir respuesta basada en las acciones detectadas
    const actionTypes = actions.map(a => a.type);

    if (actionTypes.includes(ChatActionType.REQUEST_RECOMMENDATION)) {
      return 'Te he preparado algunas recomendaciones especiales basadas en tus preferencias. ¿Te gustaría ver el menú completo?';
    }

    if (actionTypes.includes(ChatActionType.ADD_TO_CART)) {
      return '¡Perfecto! Te ayudaré a agregar eso a tu pedido. ¿Algo más que te gustaría añadir?';
    }

    if (actionTypes.includes(ChatActionType.VIEW_MENU)) {
      return 'Aquí está nuestro menú. ¿Te gustaría que te recomiende algo especial?';
    }

    if (actionTypes.includes(ChatActionType.VIEW_CART)) {
      return 'Aquí está tu carrito actual. ¿Deseas modificar algo o proceder con tu pedido?';
    }

    if (actionTypes.includes(ChatActionType.PLACE_ORDER)) {
      return '¡Excelente! Estoy procesando tu pedido. ¿Confirmas que todo está correcto?';
    }

    // Respuesta por defecto
    return 'Entiendo. ¿Hay algo más en lo que pueda ayudarte?';
  }

  /**
   * Convierte intenciones del LLM a acciones del chat
   */
  private convertIntentsToActions(intents: any): ChatAction[] {
    const actions: ChatAction[] = [];

    if (!intents.intent && !intents.intents) {
      return [
        createChatAction(ChatActionType.VIEW_MENU, 'Ver menú completo')
      ];
    }

    // Manejar formato singular (intent)
    const intentList = intents.intents || (intents.intent ? [{ type: intents.intent }] : []);

    for (const intent of intentList) {
      const type = intent.type?.toLowerCase() || intent.toLowerCase();

      if (type.includes('order') || type.includes('add') || type.includes('quiero')) {
        actions.push(
          createChatAction(ChatActionType.ADD_TO_CART, 'Agregar al carrito')
        );
      } else if (type.includes('menu') || type.includes('ver') || type.includes('mostrar')) {
        actions.push(
          createChatAction(ChatActionType.VIEW_MENU, 'Ver menú')
        );
      } else if (type.includes('cart') || type.includes('carrito')) {
        actions.push(
          createChatAction(ChatActionType.VIEW_CART, 'Ver carrito')
        );
      } else if (type.includes('recommend') || type.includes('suger') || type.includes('recomiend')) {
        actions.push(
          createChatAction(ChatActionType.REQUEST_RECOMMENDATION, 'Obtener recomendaciones')
        );
      } else if (type.includes('place') || type.includes('confirm') || type.includes('finaliz')) {
        actions.push(
          createChatAction(ChatActionType.PLACE_ORDER, 'Realizar pedido')
        );
      }
    }

    // Si no se detectaron acciones específicas, ofrecer ver menú
    if (actions.length === 0) {
      actions.push(
        createChatAction(ChatActionType.VIEW_MENU, 'Ver menú completo')
      );
    }

    return actions;
  }

  /**
   * Obtiene métricas del sistema
   */
  getMetrics = async (_req: Request, res: Response): Promise<void> => {
    try {
      const metrics = metricsService.getSystemMetrics();
      const cacheStats = cacheService.getStats();

      res.json({
        success: true,
        data: {
          system: metrics,
          cache: cacheStats,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Failed to get metrics', {
        error: error instanceof Error ? error.message : 'Unknown'
      });
      throw error;
    }
  };

  /**
   * Health check endpoint
   */
  healthCheck = async (_req: Request, res: Response): Promise<void> => {
    res.json({
      status: 'ok',
      service: 'chat-api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  };
}

/**
 * Instancia singleton del controller
 */
export const chatController = new ChatController();
