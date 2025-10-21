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
import { SessionRepository } from '../repositories/session.repository';
import {
  ChatRequest,
  ChatResponse,
  ChatAction,
  ChatActionType,
  PipelineStage,
  ChatResponseMetadata,
  createChatAction
} from '../interfaces/chat.interface';
import { Recommendation } from '../interfaces/recommendation.interface';
import { withTimeout } from '../middleware/error-handler.middleware';
import { SpicyLevel } from '../models/menuItem.model';
import { MessageRole, ConversationSlots } from '../models/session.model';

/**
 * Controller para el endpoint de chat
 */
export class ChatController {
  private llmService: EnhancedLLMService;
  private recommendationService: RecommendationService;
  private sessionRepository: SessionRepository;

  constructor() {
    this.llmService = new EnhancedLLMService();
    this.sessionRepository = new SessionRepository();
    
    // Desactivar semantic scoring para evitar rate limit de OpenAI
    // (cada recomendación haría N llamadas al LLM, una por cada plato)
    this.recommendationService = new RecommendationService({
      maxRecommendations: 3,
      minRecommendations: 2,
      enableSemanticScoring: false, // CRÍTICO: evita múltiples llamadas LLM
      llmTimeout: 10000,
      enableAuditLogs: false, // Reducir logs en dev
      ensureDiversity: true,
      categoryRepetitionPenalty: 0.3,
      defaultWeights: {
        safety: 1.0,
        dietaryMatch: 0.30,
        budgetFit: 0.15,
        preferencesMatch: 0.35, // Más peso en preferencias
        semanticScore: 0.0, // Desactivado
        availability: 0.20
      }
    });
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
      // 1. Cargar o crear sesión
      let session = await this.sessionRepository.findById(sessionId);
      
      if (!session) {
        logger.info('Creating new session', { sessionId });
        session = await this.sessionRepository.create({
          slots: {},
          messages: [],
          cart: []
        });
      }

      logger.debug('Session loaded', { 
        sessionId: session.id, 
        messageCount: session.messages.length,
        slots: session.slots 
      });

      // 2. Procesar con LLM - Extracción de intenciones CON contexto de historial
      const llmStartTime = Date.now();
      
      // Construir contexto con historial (últimos 5 mensajes para no saturar)
      const recentMessages = session.messages.slice(-5);
      const contextForLLM = recentMessages.length > 0 
        ? `\n\nHistorial reciente:\n${recentMessages.map(m => `${m.role}: ${m.content}`).join('\n')}\n\nPreferencias guardadas: ${JSON.stringify(session.slots)}\n\n`
        : '';
      
      const messageWithContext = contextForLLM + chatRequest.message;
      
      const intents = await withTimeout(
        this.llmService.extractDetailedIntents(messageWithContext),
        8000,
        'llm-intent-extraction'
      );

      if (metricsService) {
        metricsService.recordLLMCall();
        metricsService.recordLatency(MetricType.LLM_CALL, Date.now() - llmStartTime);
      }

      logger.debug('Intents extracted from LLM', { intents });

      // 3. Actualizar slots con nueva información extraída
      const updatedSlots = this.updateSessionSlots(session.slots, intents.entities);
      
      logger.debug('Slots updated', { 
        sessionId,
        oldSlots: session.slots, 
        newEntities: intents.entities,
        updatedSlots
      });

      // 4. Convertir intenciones a acciones
      const actions = this.convertIntentsToActions(intents);

      logger.info('Actions converted', { 
        sessionId,
        actionsCount: actions.length,
        actionTypes: actions.map(a => a.type)
      });

      // 4. Generar recomendaciones si se requieren (VIEW_MENU o REQUEST_RECOMMENDATION)
      let recommendations: Recommendation[] | undefined = undefined;
      const needsRecommendations = actions.some(
        action => action.type === ChatActionType.REQUEST_RECOMMENDATION || action.type === ChatActionType.VIEW_MENU
      );

      if (needsRecommendations) {
        try {
          const recStartTime = Date.now();
          logger.info('Generating recommendations...', { sessionId });
          
          const recs = await withTimeout(
            this.recommendationService.generateRecommendations({
              allergies: updatedSlots.allergens || [],
              dietaryRestrictions: updatedSlots.dietaryRestrictions || [],
              preferences: {
                spicyLevel: updatedSlots.spicyPreference,
                mealType: intents.entities.mealType ? [intents.entities.mealType] : undefined,
                preferredCategories: updatedSlots.preferredCategories || [],
                additionalNotes: chatRequest.message
              }
            }),
            5000, // 5 segundos sin semantic scoring (antes 15s)
            'recommendations'
          );
          
          const loadTime = Date.now() - recStartTime;
          logger.info('Recommendations generated successfully', { 
            sessionId, 
            count: recs?.length || 0,
            loadTime 
          });
          
          metricsService.recordLatency(MetricType.DB_QUERY, loadTime);
          recommendations = recs;
        } catch (error) {
          logger.error('Failed to generate recommendations', {
            sessionId,
            error: error instanceof Error ? error.message : 'Unknown'
          });
          // Continuar sin recomendaciones
        }
      }

      // 5. Construir respuesta con contexto del mensaje y slots acumulados
      const responseMessage = await this.buildResponseMessage(
        chatRequest.message, 
        intents, 
        actions, 
        recommendations,
        updatedSlots
      );

      const metadata: ChatResponseMetadata = {
        processingTime: Date.now() - startTime,
        llmProvider: this.llmService.getCurrentProvider(),
        fromCache: false,
        stage: PipelineStage.COMPLETE,
        sessionCreated: !chatRequest.sessionId
      };

      const response: ChatResponse = {
        response: responseMessage,
        sessionId: session.id, // Usar el ID real de la sesión
        actions,
        recommendations, // 2-3 platos recomendados con justificaciones
        metadata
      };

      // 6. Guardar mensajes en la sesión
      try {
        // Guardar mensaje del usuario
        await this.sessionRepository.addMessage(session.id, {
          role: MessageRole.USER,
          content: chatRequest.message
        });

        // Guardar respuesta del bot
        await this.sessionRepository.addMessage(session.id, {
          role: MessageRole.ASSISTANT,
          content: responseMessage
        });

        // Actualizar slots
        await this.sessionRepository.update(session.id, {
          slots: updatedSlots
        });

        logger.debug('Session updated', { 
          sessionId: session.id, 
          newMessageCount: session.messages.length + 2 
        });
      } catch (error) {
        logger.error('Failed to update session', {
          sessionId: session.id,
          error: error instanceof Error ? error.message : 'Unknown'
        });
      }

      // 7. Guardar en cache (opcional)
      try {
        cacheService.setChatResponse(chatRequest, response);
      } catch (error) {
        logger.error('Failed to cache response', {
          sessionId: session.id,
          error: error instanceof Error ? error.message : 'Unknown'
        });
      }

      // 8. Registrar métricas
      if (metricsService) {
        metricsService.recordRequest(true, false);
        metricsService.recordLatency(MetricType.REQUEST, Date.now() - startTime);
      }

      logger.info('Chat request processed', {
        sessionId: session.id,
        processingTime: metadata.processingTime,
        actionsCount: actions.length,
        hasRecommendations: !!recommendations,
        recommendationsCount: recommendations?.length || 0
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
   * Actualiza los slots de la sesión fusionando las entidades extraídas de la última interacción
   * con las preferencias acumuladas previamente.
   */
  private updateSessionSlots(oldSlots: ConversationSlots, newEntities: any): ConversationSlots {
    // Función auxiliar para eliminar duplicados
    const unique = <T>(arr: T[]): T[] => Array.from(new Set(arr));

    // Fusionar dietaryRestrictions (ej: "vegetariano", "vegano")
    const dietaryRestrictions = unique([
      ...(oldSlots.dietaryRestrictions || []),
      ...(newEntities.dietaryRestrictions || [])
    ]);

    // Fusionar allergens (ej: "gluten", "lácteos")
    const allergens = unique([
      ...(oldSlots.allergens || []),
      ...(newEntities.allergens || [])
    ]);

    // Fusionar preferredCategories (ej: "pasta", "ensaladas", "carnes")
    const preferredCategories = unique([
      ...(oldSlots.preferredCategories || []),
      ...(newEntities.preferences || [])
    ]);

    // Budget: usar el nuevo si existe, sino mantener el anterior
    const budget = newEntities.budget?.max !== undefined 
      ? newEntities.budget.max 
      : oldSlots.budget;

    // SpicyPreference: usar el nuevo si existe, sino mantener el anterior
    const spicyPreference = newEntities.spicyLevel 
      ? this.convertSpicyLevel(newEntities.spicyLevel)
      : oldSlots.spicyPreference;

    // Construir objeto de slots, omitiendo valores undefined para Firestore
    const slots: ConversationSlots = {
      dietaryRestrictions,
      allergens,
      preferredCategories
    };

    // Solo agregar campos opcionales si tienen valor definido
    if (budget !== undefined) {
      slots.budget = budget;
    }
    if (spicyPreference !== undefined) {
      slots.spicyPreference = spicyPreference;
    }

    return slots;
  }

  /**
   * Construye el mensaje de respuesta basado en intenciones y acciones
   */
  private async buildResponseMessage(
    userMessage: string, 
    intents: any, 
    actions: ChatAction[],
    recommendations?: any[],
    slots?: ConversationSlots
  ): Promise<string> {
    const hasRecommendations = recommendations && recommendations.length > 0;
    const actionTypes = actions.map(a => a.type);
    const msgLower = userMessage.toLowerCase();
    
    // 1. SALUDOS - Primera interacción
    if (msgLower.match(/\b(hola|hey|buenos|buenas|saludos|hi|hello)\b/) && actions.length === 0) {
      const greetings = [
        '¡Hola! 👋 Bienvenido a nuestro restaurante. Estoy aquí para ayudarte a elegir tu comida favorita.\n\n¿Qué te apetece hoy? Puedo recomendarte platos según tus preferencias, restricciones dietarias o presupuesto.',
        '¡Buenas! 😊 Soy tu asistente virtual. ¿En qué puedo ayudarte?\n\n¿Buscas algo en particular? (vegetariano, sin gluten, picante, etc.)',
        '¡Hola! ¿Tienes hambre? Déjame ayudarte a encontrar algo delicioso.\n\n¿Tienes alguna preferencia o restricción alimentaria?',
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    }
    
    // 2. CONSULTAS GENERALES - Extraer información antes de recomendar
    if (actions.length === 0) {
      const entities = intents.entities || {};
      
      // Verificar si hay preferencias en slots acumulados o en entities recién extraídos
      const hasStoredPreferences = slots && (
        (slots.dietaryRestrictions && slots.dietaryRestrictions.length > 0) ||
        (slots.allergens && slots.allergens.length > 0) ||
        (slots.preferredCategories && slots.preferredCategories.length > 0) ||
        slots.spicyPreference ||
        slots.budget
      );
      
      const hasNewPreferences = entities.dietaryRestrictions?.length > 0 || 
                            entities.allergens?.length > 0 ||
                            entities.preferences?.length > 0 ||
                            entities.spicyLevel ||
                            entities.budget;
      
      if (hasNewPreferences || hasStoredPreferences) {
        // Usuario dio información útil, ofrecer recomendaciones
        const prefs = [];
        
        // Usar preferencias acumuladas de slots
        if (slots?.dietaryRestrictions?.length) prefs.push(slots.dietaryRestrictions.join(', '));
        if (slots?.allergens?.length) prefs.push(`sin ${slots.allergens.join(', ')}`);
        if (slots?.spicyPreference) prefs.push(`nivel de picante: ${slots.spicyPreference}`);
        
        // O usar preferencias nuevas de entities
        if (!prefs.length) {
          if (entities.dietaryRestrictions?.length) prefs.push(entities.dietaryRestrictions.join(', '));
          if (entities.allergens?.length) prefs.push(`sin ${entities.allergens.join(', ')}`);
          if (entities.spicyLevel) prefs.push(`nivel de picante: ${entities.spicyLevel}`);
        }
        
        return `Perfecto, entiendo que buscas algo ${prefs.join(' y ')}. ¿Te gustaría que te recomiende algunos platos que se ajusten a tus preferencias?`;
      }
      
      // Respuesta conversacional genérica que invita a dar más información
      const conversationalResponses = [
        'Cuéntame más sobre lo que buscas. ¿Tienes alguna preferencia? (vegetariano, sin gluten, picante, etc.)',
        '¿Qué tipo de comida te apetece? ¿Algo ligero, abundante, tradicional?',
        'Estoy aquí para ayudarte. ¿Buscas algo en particular o quieres que te recomiende opciones?',
        '¿Tienes alguna restricción alimentaria o alergia que deba considerar?',
      ];
      return conversationalResponses[Math.floor(Math.random() * conversationalResponses.length)];
    }
    
    // 3. RECOMENDACIONES - Solo cuando explícitamente lo piden
    if (actionTypes.includes(ChatActionType.REQUEST_RECOMMENDATION) || actionTypes.includes(ChatActionType.VIEW_MENU)) {
      if (hasRecommendations) {
        const count = recommendations.length;
        return `¡Perfecto! Te recomiendo ${count === 1 ? 'este plato' : `estos ${count} platos`} basándome en tus preferencias. ¿Te gusta alguno?`;
      }
      
      // No hay recomendaciones, pedir más información
      const entities = intents.entities || {};
      const missingInfo = [];
      
      if (!entities.dietaryRestrictions?.length && !entities.preferences?.length) {
        missingInfo.push('¿Tienes alguna preferencia? (vegetariano, vegano, etc.)');
      }
      if (!entities.allergens?.length) {
        missingInfo.push('¿Alguna alergia que deba considerar?');
      }
      if (!entities.budget) {
        missingInfo.push('¿Tienes un presupuesto en mente?');
      }
      
      if (missingInfo.length > 0) {
        return `¡Claro! Para recomendarte mejor, déjame preguntarte:\n${missingInfo[0]}`;
      }
      
      return 'Déjame buscar las mejores opciones para ti...';
    }

    // 4. AGREGAR AL CARRITO
    if (actionTypes.includes(ChatActionType.ADD_TO_CART)) {
      return '¡Excelente elección! Lo agregaré a tu pedido. ¿Algo más que te gustaría añadir?';
    }

    // 5. VER CARRITO
    if (actionTypes.includes(ChatActionType.VIEW_CART)) {
      return 'Aquí está tu pedido actual. ¿Deseas modificar algo o estás listo para confirmar?';
    }

    // 6. REALIZAR PEDIDO
    if (actionTypes.includes(ChatActionType.PLACE_ORDER)) {
      return '¡Perfecto! Voy a procesar tu pedido. ¿Confirmas que todo está correcto?';
    }

    // 7. RESPUESTA POR DEFECTO
    return 'Entiendo. ¿En qué más puedo ayudarte? Puedo recomendarte platos, mostrarte el menú o ayudarte con tu pedido.';
  }

  /**
   * Convierte intenciones del LLM a acciones del chat
   */
  private convertIntentsToActions(intents: any): ChatAction[] {
    const actions: ChatAction[] = [];

    logger.debug('Converting intents to actions', { intents });

    if (!intents.intent && !intents.intents) {
      logger.debug('No intent detected, returning empty actions for conversational flow');
      return []; // No forzar VIEW_MENU, permitir respuesta conversacional
    }

    // Manejar formato singular (intent)
    const intentList = intents.intents || (intents.intent ? [{ type: intents.intent }] : []);
    const primaryIntent = intents.intent?.toLowerCase() || '';

    // FILTRO DE SALUDOS: Si el intent principal es un saludo, no generar acciones
    if (primaryIntent.includes('salud') || primaryIntent.includes('greet') || primaryIntent.includes('bienven')) {
      logger.debug('Greeting intent detected, returning empty actions to allow conversational greeting');
      return [];
    }

    logger.debug('Processing intents', { intentList, primaryIntent });

    // Mapeo directo de intenciones del NLU prompt
    if (primaryIntent.includes('consultar_menu') || primaryIntent.includes('ver_menu')) {
      actions.push(createChatAction(ChatActionType.VIEW_MENU, 'Ver menú'));
    }
    
    if (primaryIntent.includes('recomendar') || primaryIntent.includes('suger')) {
      actions.push(createChatAction(ChatActionType.REQUEST_RECOMMENDATION, 'Obtener recomendaciones'));
    }
    
    if (primaryIntent.includes('agregar_al_pedido') || primaryIntent.includes('ordenar')) {
      actions.push(createChatAction(ChatActionType.ADD_TO_CART, 'Agregar al carrito'));
    }
    
    if (primaryIntent.includes('finalizar_pedido') || primaryIntent.includes('confirmar')) {
      actions.push(createChatAction(ChatActionType.PLACE_ORDER, 'Realizar pedido'));
    }

    // Procesar lista de intents adicionales
    for (const intent of intentList) {
      const type = intent.type?.toLowerCase() || intent.toLowerCase();

      if (type.includes('consultar_menu') || type.includes('menu') && (type.includes('ver') || type.includes('mostrar'))) {
        if (!actions.some(a => a.type === ChatActionType.VIEW_MENU)) {
          actions.push(createChatAction(ChatActionType.VIEW_MENU, 'Ver menú'));
        }
      } else if (type.includes('recomendar') || type.includes('suger')) {
        if (!actions.some(a => a.type === ChatActionType.REQUEST_RECOMMENDATION)) {
          actions.push(createChatAction(ChatActionType.REQUEST_RECOMMENDATION, 'Obtener recomendaciones'));
        }
      } else if (type.includes('agregar_al_pedido') || type.includes('order') || type.includes('add') || type.includes('quiero')) {
        if (!actions.some(a => a.type === ChatActionType.ADD_TO_CART)) {
          actions.push(createChatAction(ChatActionType.ADD_TO_CART, 'Agregar al carrito'));
        }
      } else if (type.includes('cart') || type.includes('carrito')) {
        if (!actions.some(a => a.type === ChatActionType.VIEW_CART)) {
          actions.push(createChatAction(ChatActionType.VIEW_CART, 'Ver carrito'));
        }
      } else if (type.includes('finalizar_pedido') || type.includes('place') || type.includes('confirm') || type.includes('finaliz')) {
        if (!actions.some(a => a.type === ChatActionType.PLACE_ORDER)) {
          actions.push(createChatAction(ChatActionType.PLACE_ORDER, 'Realizar pedido'));
        }
      }
    }

    // NO agregar acción por defecto - permitir flujo conversacional
    logger.debug('Actions generated', { actions: actions.map(a => a.type) });

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
