/**
 * Epic #60: API Conversacional y Orquestación
 * Task #63: Endpoint /api/chat - Controller
 * 
 * Controller para manejar las peticiones del endpoint de chat.
 * Implementación simplificada que llama directamente a los servicios.
 */

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  ChatAction,
  ChatActionType,
  ChatRequest,
  ChatResponse,
  ChatResponseMetadata,
  createChatAction,
  PipelineStage
} from '../interfaces/chat.interface';
import { Recommendation } from '../interfaces/recommendation.interface';
import { withTimeout } from '../middleware/error-handler.middleware';
import { SpicyLevel } from '../models/menuItem.model';
import { ConversationSlots, MessageRole } from '../models/session.model';
import { SessionRepository } from '../repositories/session.repository';
import { cacheService } from '../services/cache.service';
import { EnhancedLLMService } from '../services/enhanced-llm.service';
import { metricsService, MetricType } from '../services/metrics.service';
import { OrderService } from '../services/order.service';
import { RecommendationService } from '../services/recommendation.service';
import { logger } from '../utils/logger';

/**
 * Controller para el endpoint de chat
 */
export class ChatController {
  private llmService: EnhancedLLMService;
  private recommendationService: RecommendationService;
  private sessionRepository: SessionRepository;
  private orderService: OrderService;

  constructor() {
    this.llmService = new EnhancedLLMService();
    this.sessionRepository = new SessionRepository();
    this.orderService = new OrderService();
    
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
                tags: intents.entities.preferences || [], // Agregar tags de preferencias del intent
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

    // 7. VER DETALLES DE PLATO (precio, ingredientes)
    if (actionTypes.includes(ChatActionType.VIEW_ITEM_DETAILS)) {
      const action = actions.find(a => a.type === ChatActionType.VIEW_ITEM_DETAILS);
      const dishes = action?.data?.dishes || intents.entities?.dishesMetioned || [];
      const infoType = action?.data?.infoType || 'details';
      
      if (dishes.length === 0) {
        return '¿Sobre qué plato te gustaría saber más? Puedo darte información sobre precios, ingredientes y detalles de preparación.';
      }
      
      if (infoType === 'price') {
        return `Claro, déjame consultar el precio de ${dishes.join(', ')}. Los precios de nuestros platos varían según los ingredientes y el tamaño. ¿Te gustaría que te recomiende algo en un rango de precio específico?`;
      }
      
      if (infoType === 'ingredients') {
        return `Por supuesto, te cuento sobre los ingredientes de ${dishes.join(', ')}. Este plato se prepara con ingredientes frescos seleccionados. ¿Tienes alguna alergia o restricción que deba considerar?`;
      }
      
      return `Te puedo dar información detallada sobre ${dishes.join(', ')}. ¿Qué te gustaría saber específicamente?`;
    }

    // 8. VERIFICAR DISPONIBILIDAD
    if (actionTypes.includes(ChatActionType.CHECK_AVAILABILITY)) {
      const action = actions.find(a => a.type === ChatActionType.CHECK_AVAILABILITY);
      const dishes = action?.data?.dishes || intents.entities?.dishesMetioned || [];
      
      if (dishes.length === 0) {
        return '¿Qué plato te gustaría saber si está disponible?';
      }
      
      return `Déjame verificar si ${dishes.join(', ')} está disponible. Un momento...`;
    }

    // 9. VER ALÉRGENOS
    if (actionTypes.includes(ChatActionType.VIEW_ALLERGENS)) {
      const action = actions.find(a => a.type === ChatActionType.VIEW_ALLERGENS);
      const dishes = action?.data?.dishes || intents.entities?.dishesMetioned || [];
      const allergens = action?.data?.allergens || intents.entities?.allergens || [];
      
      if (dishes.length === 0 && allergens.length === 0) {
        return '¿Sobre qué plato necesitas información de alérgenos? O si tienes alguna alergia específica, puedo recomendarte platos seguros.';
      }
      
      if (allergens.length > 0) {
        return `Entiendo que eres alérgico a ${allergens.join(', ')}. Te recomendaré solo platos que no contengan estos ingredientes. ¿Hay algo más que deba saber?`;
      }
      
      return `Claro, te muestro los alérgenos que contiene ${dishes.join(', ')}. La seguridad alimentaria es nuestra prioridad.`;
    }

    // 10. MODIFICAR PEDIDO
    if (actionTypes.includes(ChatActionType.MODIFY_ORDER)) {
      return '¿Qué te gustaría modificar de tu pedido? Puedo cambiar cantidades, agregar o quitar platos.';
    }

    // 11. CANCELAR PEDIDO
    if (actionTypes.includes(ChatActionType.CANCEL_ORDER)) {
      return '¿Estás seguro de que deseas cancelar tu pedido? Si hay algún problema, puedo ayudarte a modificarlo en lugar de cancelarlo.';
    }

    // 12. CONFIRMAR PEDIDO
    if (actionTypes.includes(ChatActionType.CONFIRM_ORDER)) {
      return '¡Perfecto! Voy a confirmar tu pedido. Una vez confirmado, comenzaremos a prepararlo. ¿Todo está correcto?';
    }

    // 13. RESPUESTA POR DEFECTO
    return 'Entiendo. ¿En qué más puedo ayudarte? Puedo recomendarte platos, mostrarte el menú o ayudarte con tu pedido.';
  }  /**
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

    // FILTRO DE INTENCIONES CONVERSACIONALES: saludo y agradecer no generan acciones
    if (primaryIntent === 'saludo' || primaryIntent === 'agradecer') {
      logger.debug('Conversational intent detected (saludo/agradecer), returning empty actions');
      return [];
    }

    logger.debug('Processing intents', { intentList, primaryIntent });

    // ============================================================================
    // MAPEO DIRECTO DE INTENCIONES PRINCIPALES DEL INTENT_EXTRACTION_PROMPT
    // ============================================================================
    
    // CONVERSACIONALES (no generan acciones, se manejan arriba)
    // - saludo
    // - agradecer
    
    // CONSULTAS
    if (primaryIntent === 'consultar_menu') {
      actions.push(createChatAction(ChatActionType.VIEW_MENU, 'Ver menú'));
    }
    
    if (primaryIntent === 'recomendar') {
      actions.push(createChatAction(ChatActionType.REQUEST_RECOMMENDATION, 'Obtener recomendaciones'));
    }
    
    if (primaryIntent === 'preguntar_precio') {
      actions.push(createChatAction(ChatActionType.VIEW_ITEM_DETAILS, 'Ver detalles de precio', {
        infoType: 'price',
        dishes: intents.entities?.dishesMetioned || []
      }));
    }

    if (primaryIntent === 'preguntar_ingredientes') {
      actions.push(createChatAction(ChatActionType.VIEW_ITEM_DETAILS, 'Ver ingredientes', {
        infoType: 'ingredients',
        dishes: intents.entities?.dishesMetioned || []
      }));
    }

    if (primaryIntent === 'preguntar_disponibilidad') {
      actions.push(createChatAction(ChatActionType.CHECK_AVAILABILITY, 'Verificar disponibilidad', {
        dishes: intents.entities?.dishesMetioned || []
      }));
    }

    if (primaryIntent === 'consultar_alergenos') {
      actions.push(createChatAction(ChatActionType.VIEW_ALLERGENS, 'Ver alérgenos', {
        dishes: intents.entities?.dishesMetioned || [],
        allergens: intents.entities?.allergens || []
      }));
    }
    
    // ACCIONES DE PEDIDO
    if (primaryIntent === 'agregar_al_pedido') {
      actions.push(createChatAction(ChatActionType.ADD_TO_CART, 'Agregar al carrito'));
    }
    
    if (primaryIntent === 'modificar_pedido') {
      actions.push(createChatAction(ChatActionType.MODIFY_ORDER, 'Modificar pedido'));
    }

    if (primaryIntent === 'cancelar_pedido') {
      actions.push(createChatAction(ChatActionType.CANCEL_ORDER, 'Cancelar pedido'));
    }

    if (primaryIntent === 'confirmar_pedido') {
      actions.push(createChatAction(ChatActionType.PLACE_ORDER, 'Realizar pedido'));
    }
    
    // OTRAS: intención "otro" no genera acciones específicas (respuesta conversacional)

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

  /**
   * Confirmar y crear una comanda desde el carrito de la sesión
   * POST /api/chat/:sessionId/confirm-order
   */
  confirmOrder = async (req: Request, res: Response): Promise<void> => {
    const { sessionId } = req.params;
    const { tableNumber, customerNotes } = req.body;

    try {
      logger.info('Confirm order request', { sessionId, tableNumber });

      if (!tableNumber) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: tableNumber'
        });
        return;
      }

      // Obtener la sesión
      const session = await this.sessionRepository.findById(sessionId);

      if (!session) {
        res.status(404).json({
          success: false,
          error: 'Session not found'
        });
        return;
      }

      // Verificar que haya items en el carrito
      if (!session.cart || session.cart.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Cart is empty. Add items before confirming order.'
        });
        return;
      }

      // Crear la comanda
      const order = await this.orderService.createFromCart(
        tableNumber,
        sessionId,
        session.cart,
        customerNotes
      );

      // Limpiar el carrito después de crear la comanda
      await this.sessionRepository.update(sessionId, {
        cart: []
      });

      logger.info('Order created successfully', {
        sessionId,
        orderId: order.id,
        tableNumber: order.tableNumber,
        totalAmount: order.totalAmount
      });

      res.status(201).json({
        success: true,
        data: {
          order,
          message: `¡Pedido confirmado para la mesa ${tableNumber}! Tu comanda está en camino a la cocina.`
        }
      });
    } catch (error) {
      logger.error('Failed to confirm order', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown'
      });

      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message
        });
        return;
      }

      if (error instanceof Error && error.message.includes('not available')) {
        res.status(400).json({
          success: false,
          error: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  };
}

/**
 * Instancia singleton del controller
 */
export const chatController = new ChatController();
