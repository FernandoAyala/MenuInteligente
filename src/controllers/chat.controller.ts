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
import { MenuItem, SpicyLevel } from '../models/menuItem.model';
import { ConversationSlots, MessageRole } from '../models/session.model';
import { MenuItemRepository } from '../repositories/menuItem.repository';
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
  private menuItemRepository: MenuItemRepository;

  constructor() {
    this.llmService = new EnhancedLLMService();
    this.sessionRepository = new SessionRepository();
    this.orderService = new OrderService();
    this.menuItemRepository = new MenuItemRepository();
    
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
      
      // Extraer intenciones con timeout aumentado para proveedores LLM lentos
      const intents = await withTimeout(
        this.llmService.extractDetailedIntents(messageWithContext),
        15000, // Aumentado de 8s a 15s para evitar timeouts en respuestas lentas
        'llm-intent-extraction'
      );

      if (metricsService) {
        metricsService.recordLLMCall();
        metricsService.recordLatency(MetricType.LLM_CALL, Date.now() - llmStartTime);
      }

      logger.debug('Intents extracted from LLM', { 
        intents,
        specialInstructions: intents.entities?.specialInstructions,
        dishesMetioned: intents.entities?.dishesMetioned
      });

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

      // 4.1 Si detecta ADD_TO_CART con platos mencionados, buscarlos y agregarlos
      const hasAddToCartAction = actions.some(a => a.type === ChatActionType.ADD_TO_CART);
      const needsDirectAddToCart = hasAddToCartAction
        && intents.entities?.dishesMetioned 
        && intents.entities.dishesMetioned.length > 0;

      // FALLBACK: Si detecta ADD_TO_CART pero no hay dishesMetioned, generar recomendaciones
      if (hasAddToCartAction && !needsDirectAddToCart && !recommendations) {
        logger.warn('ADD_TO_CART detected but no dishes mentioned, generating recommendations as fallback', {
          sessionId,
          userMessage: chatRequest.message
        });
        
        try {
          const recs = await withTimeout(
            this.recommendationService.generateRecommendations({
              allergies: updatedSlots.allergens || [],
              dietaryRestrictions: updatedSlots.dietaryRestrictions || [],
              preferences: {
                spicyLevel: updatedSlots.spicyPreference,
                mealType: intents.entities.mealType ? [intents.entities.mealType] : undefined,
                preferredCategories: updatedSlots.preferredCategories || [],
                tags: intents.entities.preferences || [],
                additionalNotes: chatRequest.message // Usar el mensaje completo para buscar
              }
            }),
            5000,
            'recommendations-fallback'
          );
          recommendations = recs;
          logger.info('Fallback recommendations generated', {
            sessionId,
            count: recs?.length || 0
          });
        } catch (error) {
          logger.error('Failed to generate fallback recommendations', {
            sessionId,
            error: error instanceof Error ? error.message : 'Unknown'
          });
        }
      }

      if (needsDirectAddToCart) {
        try {
          logger.info('Detecting direct add to cart request', { 
            sessionId, 
            dishes: intents.entities.dishesMetioned 
          });

          // Buscar los platos mencionados en Firestore
          const { found, notFound } = await this.checkDishAvailability(intents.entities.dishesMetioned);
          
          if (found.length > 0) {
            // Convertir MenuItem a Recommendation format para reutilizar lógica existente
            recommendations = found.map((dish, index) => ({
              dish: {
                id: dish.id,
                name: dish.name,
                description: dish.description,
                price: dish.price,
                currency: dish.currency,
                category: dish.category,
                spicyLevel: dish.spicyLevel,
                isVegan: dish.isVegan,
                isVegetarian: dish.isVegetarian,
                isGlutenFree: dish.isGlutenFree,
                allergens: dish.allergens,
                available: dish.available
              },
              score: 100, // Score máximo porque es solicitud directa
              rank: index + 1,
              justification: `Plato solicitado directamente: ${dish.name}`,
              matchReasons: ['Solicitud directa del usuario'],
              scoreBreakdown: {
                safety: 100,
                dietaryMatch: 100,
                budgetFit: 100,
                preferencesMatch: 100,
                semanticScore: 0,
                availability: dish.available ? 100 : 0,
                total: 100,
                weights: {
                  safety: 1.0,
                  dietaryMatch: 0.0,
                  budgetFit: 0.0,
                  preferencesMatch: 0.0,
                  semanticScore: 0.0,
                  availability: 0.0
                }
              },
              safetyChecks: [
                {
                  type: 'dietary_restriction' as const,
                  passed: true,
                  details: 'Solicitud directa del usuario',
                  severity: 'low' as const,
                  checkedAt: new Date()
                }
              ]
            }));

            logger.info('Found dishes for direct add', { 
              sessionId, 
              foundCount: found.length,
              notFoundCount: notFound.length 
            });

            // AGREGAR AUTOMÁTICAMENTE AL CARRITO EN EL BACKEND
            try {
              const specialInstructions = intents.entities?.specialInstructions || '';
              
              for (const dish of found) {
                // Construir el item del carrito
                const cartItem = {
                  menuItemId: dish.id,
                  name: dish.name,
                  price: dish.price,
                  currency: dish.currency,
                  quantity: 1,
                  specifications: [] as string[],
                  specialInstructions: specialInstructions || undefined,
                };

                // Agregar al carrito de la sesión
                const currentSession = await this.sessionRepository.findById(session.id);
                if (currentSession) {
                  const updatedCart = [...(currentSession.cart || []), cartItem];
                  await this.sessionRepository.update(session.id, {
                    cart: updatedCart,
                    updatedAt: new Date(),
                  });

                  logger.info('Item added to cart automatically', {
                    sessionId: session.id,
                    dish: dish.name,
                    specialInstructions: specialInstructions || 'none',
                  });
                }
              }
            } catch (cartError) {
              logger.error('Failed to add items to cart automatically', {
                sessionId: session.id,
                error: cartError instanceof Error ? cartError.message : 'Unknown',
              });
            }
          } else {
            logger.warn('No dishes found for add to cart', { 
              sessionId, 
              requestedDishes: intents.entities.dishesMetioned 
            });
          }
        } catch (error) {
          logger.error('Failed to find dishes for add to cart', {
            sessionId,
            error: error instanceof Error ? error.message : 'Unknown'
          });
        }
      }

      // 4.5 PROCESAR PLACE_ORDER - Confirmar pedido y vaciar carrito
      const hasPlaceOrder = actions.some(a => a.type === ChatActionType.PLACE_ORDER);
      let orderId: string | undefined = undefined;

      if (hasPlaceOrder) {
        try {
          logger.info('Processing PLACE_ORDER action', { sessionId: session.id });

          // Obtener carrito actual
          const currentSession = await this.sessionRepository.findById(session.id);
          const currentCart = currentSession?.cart || [];

          // Filtrar solo items NO confirmados (pendientes)
          const pendingItems = currentCart.filter(item => !item.confirmed);

          if (pendingItems.length === 0) {
            logger.warn('Cannot place order: no pending items in cart', { sessionId: session.id });
          } else {
            // Crear el pedido SOLO con items pendientes
            // TODO: Obtener tableNumber de alguna parte (por ahora usar 1 por defecto)
            const tableNumber = 1; // Podría venir del sessionId o de un prompt previo
            
            const order = await this.orderService.createFromCart(
              tableNumber,
              session.id,
              pendingItems,
              intents.entities?.specialInstructions || undefined // Notas adicionales del cliente
            );

            orderId = order.id;

            logger.info('Order created successfully', {
              sessionId: session.id,
              orderId: order.id,
              itemCount: pendingItems.length,
            });

            // MARCAR items como confirmados (en lugar de vaciar)
            const updatedCart = currentCart.map(item => {
              // Si el item estaba pendiente, marcarlo como confirmado
              if (!item.confirmed) {
                return {
                  ...item,
                  confirmed: true,
                  orderId: order.id,
                  confirmedAt: new Date(),
                };
              }
              // Si ya estaba confirmado, mantenerlo igual
              return item;
            });

            await this.sessionRepository.update(session.id, {
              cart: updatedCart,
              updatedAt: new Date(),
            });

            logger.info('Cart items marked as confirmed', { 
              sessionId: session.id,
              confirmedCount: pendingItems.length,
              totalInCart: updatedCart.length
            });
          }
        } catch (orderError) {
          logger.error('Failed to place order', {
            sessionId: session.id,
            error: orderError instanceof Error ? orderError.message : 'Unknown',
          });
        }
      }

      // 5. Construir respuesta con contexto del mensaje y slots acumulados
      let responseMessage = await this.buildResponseMessage(
        chatRequest.message, 
        intents, 
        actions, 
        recommendations,
        updatedSlots
      );

      // Si se creó un pedido, modificar el mensaje para incluir el ID
      if (orderId) {
        responseMessage = `¡Pedido confirmado! 🎉\n\nTu pedido #${orderId.substring(0, 8)} ha sido enviado a la cocina.\nTe avisaremos cuando esté listo.\n\n¿Deseas ordenar algo más?`;
      }

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

        // Guardar respuesta del agente IA
        await this.sessionRepository.addMessage(session.id, {
          role: MessageRole.ASSISTANT,
          content: responseMessage
        });

        // Actualizar slots
        await this.sessionRepository.update(session.id, {
          slots: updatedSlots
        });

        // 6.1 Agregar items al carrito si se detectó acción ADD_TO_CART
        if (actions.some(a => a.type === ChatActionType.ADD_TO_CART) && recommendations && recommendations.length > 0) {
          try {
            // Obtener el carrito actual
            const currentCart = session.cart || [];
            
            // Agregar el primer item recomendado al carrito (el más relevante)
            const itemToAdd = recommendations[0];
            
            // Extraer instrucciones especiales del mensaje del usuario
            const specialInstructions = intents.entities?.specialInstructions || '';
            
            logger.info('Adding item to cart with special instructions', {
              sessionId: session.id,
              itemName: itemToAdd.dish.name,
              specialInstructions: specialInstructions,
              rawMessage: chatRequest.message
            });
            
            // Verificar si ya existe en el carrito
            const existingItemIndex = currentCart.findIndex(
              item => item.menuItemId === itemToAdd.dish.id
            );

            if (existingItemIndex >= 0) {
              // Si ya existe, incrementar cantidad y actualizar instrucciones si hay nuevas
              currentCart[existingItemIndex].quantity += 1;
              if (specialInstructions) {
                // Combinar instrucciones existentes con las nuevas
                const existingInstructions = currentCart[existingItemIndex].specialInstructions || '';
                currentCart[existingItemIndex].specialInstructions = existingInstructions 
                  ? `${existingInstructions}; ${specialInstructions}`
                  : specialInstructions;
              }
              logger.info('Item quantity increased in cart', {
                sessionId: session.id,
                menuItemId: itemToAdd.dish.id,
                newQuantity: currentCart[existingItemIndex].quantity,
                specialInstructions: currentCart[existingItemIndex].specialInstructions
              });
            } else {
              // Si no existe, agregar nuevo item con instrucciones
              currentCart.push({
                menuItemId: itemToAdd.dish.id,
                quantity: 1,
                specialInstructions: specialInstructions
              });
              logger.info('New item added to cart', {
                sessionId: session.id,
                menuItemId: itemToAdd.dish.id,
                menuItemName: itemToAdd.dish.name,
                specialInstructions: specialInstructions
              });
            }

            // Actualizar el carrito en la sesión
            await this.sessionRepository.update(session.id, {
              cart: currentCart
            });

            logger.info('Cart updated successfully', {
              sessionId: session.id,
              cartSize: currentCart.length,
              totalItems: currentCart.reduce((sum, item) => sum + item.quantity, 0)
            });
          } catch (cartError) {
            logger.error('Failed to update cart', {
              sessionId: session.id,
              error: cartError instanceof Error ? cartError.message : 'Unknown'
            });
            // No lanzar error, continuar con la respuesta
          }
        }

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
   * Verifica si los platos mencionados existen en el menú
   * Retorna un objeto con platos encontrados y no encontrados
   */
  private async checkDishAvailability(dishNames: string[]): Promise<{
    found: MenuItem[];
    notFound: string[];
  }> {
    if (!dishNames || dishNames.length === 0) {
      return { found: [], notFound: [] };
    }

    try {
      // Obtener todos los platos disponibles
      const availableItems = await this.menuItemRepository.findAllAvailable();
      
      const found: MenuItem[] = [];
      const notFound: string[] = [];

      // Normalizar nombres para comparación
      const normalize = (str: string) => str.toLowerCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Remover acentos

      for (const dishName of dishNames) {
        const normalizedDish = normalize(dishName);
        
        // Buscar coincidencia exacta o parcial
        const match = availableItems.find(item => {
          const normalizedItemName = normalize(item.name);
          return normalizedItemName.includes(normalizedDish) || 
                 normalizedDish.includes(normalizedItemName);
        });

        if (match) {
          found.push(match);
        } else {
          notFound.push(dishName);
        }
      }

      return { found, notFound };
    } catch (error) {
      logger.error('Error checking dish availability', { error, dishNames });
      return { found: [], notFound: dishNames };
    }
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
      // Si hay recomendaciones, mencionar el plato específico que se agregó
      if (hasRecommendations && recommendations.length > 0) {
        const addedDish = recommendations[0].dish;
        const specialInstructions = intents.entities?.specialInstructions;
        
        let message = `¡Excelente elección! He agregado **${addedDish.name}** ($${addedDish.price.toLocaleString()}) a tu carrito. 🛒`;
        
        // Si hay instrucciones especiales, mencionarlas en la respuesta
        if (specialInstructions) {
          message += `\n\n📝 Nota especial: ${specialInstructions}`;
        }
        
        message += `\n\n¿Quieres agregar algo más o prefieres ver tu carrito?`;
        
        return message;
      }
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
      
      // Verificar disponibilidad real en Firestore
      const { found, notFound } = await this.checkDishAvailability(dishes);
      
      if (found.length === 0) {
        return `Lo siento, no tenemos ${dishes.join(', ')} en nuestro menú en este momento. ¿Te gustaría que te recomiende opciones similares?`;
      }
      
      if (infoType === 'price') {
        const priceInfo = found.map(d => `**${d.name}**: $${d.price}`).join('\n');
        let response = `Claro, aquí están los precios:\n\n${priceInfo}`;
        if (notFound.length > 0) {
          response += `\n\nNo encontré: ${notFound.join(', ')}`;
        }
        response += '\n\n¿Te gustaría ordenar alguno?';
        return response;
      }
      
      if (infoType === 'ingredients') {
        const ingredientsInfo = found.map(d => {
          // Usar descripción como información de ingredientes
          const info = d.description || 'Plato preparado con ingredientes frescos seleccionados';
          const allergenInfo = d.allergens && d.allergens.length > 0 
            ? `\n⚠️ Contiene: ${d.allergens.join(', ')}` 
            : '';
          return `**${d.name}**: ${info}${allergenInfo}`;
        }).join('\n\n');
        
        let response = `Por supuesto, aquí está la información:\n\n${ingredientsInfo}`;
        if (notFound.length > 0) {
          response += `\n\nNo encontré: ${notFound.join(', ')}`;
        }
        response += '\n\n¿Tienes alguna alergia o restricción que deba considerar?';
        return response;
      }
      
      // Información general
      const detailsInfo = found.map(d => `**${d.name}** - $${d.price}\n${d.description || 'Plato delicioso preparado con ingredientes frescos'}`).join('\n\n');
      let response = `Te cuento sobre ${found.length === 1 ? 'este plato' : 'estos platos'}:\n\n${detailsInfo}`;
      if (notFound.length > 0) {
        response += `\n\nNo encontré: ${notFound.join(', ')}`;
      }
      response += '\n\n¿Te gustaría ordenar algo?';
      return response;
    }

    // 8. VERIFICAR DISPONIBILIDAD
    if (actionTypes.includes(ChatActionType.CHECK_AVAILABILITY)) {
      const action = actions.find(a => a.type === ChatActionType.CHECK_AVAILABILITY);
      const dishes = action?.data?.dishes || intents.entities?.dishesMetioned || [];
      
      if (dishes.length === 0) {
        return '¿Qué plato te gustaría saber si está disponible?';
      }
      
      // Verificar disponibilidad real en Firestore
      const { found, notFound } = await this.checkDishAvailability(dishes);
      
      if (found.length > 0 && notFound.length === 0) {
        // Todos los platos existen
        const dishList = found.map(d => d.name).join(', ');
        return `¡Sí! ${dishList} ${found.length === 1 ? 'está disponible' : 'están disponibles'}. ${found.length === 1 ? '¿Te gustaría ordenarlo?' : '¿Te gustaría ordenar alguno?'}`;
      } else if (found.length > 0 && notFound.length > 0) {
        // Algunos existen, otros no
        const foundNames = found.map(d => d.name).join(', ');
        const notFoundNames = notFound.join(', ');
        return `Tenemos ${foundNames}, pero lamentablemente no tenemos ${notFoundNames} en este momento. ¿Te gustaría que te recomiende opciones similares?`;
      } else {
        // Ninguno existe
        return `Lo siento, no tenemos ${dishes.join(', ')} en nuestro menú en este momento. ¿Te gustaría que te recomiende platos similares?`;
      }
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
