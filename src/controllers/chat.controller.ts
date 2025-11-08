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
import { MessageRole as LLMMessageRole } from '../interfaces/llm.interface';
import { Recommendation } from '../interfaces/recommendation.interface';
import { withTimeout } from '../middleware/error-handler.middleware';
import { MenuItem, SpicyLevel } from '../models/menuItem.model';
import { CartItem, ConversationSlots, MessageRole } from '../models/session.model';
import { MenuItemRepository } from '../repositories/menuItem.repository';
import { SessionRepository } from '../repositories/session.repository';
import { cacheService } from '../services/cache.service';
import { LLMService } from '../services/llm.service';
import { metricsService, MetricType } from '../services/metrics.service';
import { OrderService } from '../services/order.service';
import { RecommendationService } from '../services/recommendation.service';
import { logger } from '../utils/logger';

/**
 * Controller para el endpoint de chat
 */
export class ChatController {
  private llmService: LLMService;
  private recommendationService: RecommendationService;
  private sessionRepository: SessionRepository;
  private orderService: OrderService;
  private menuItemRepository: MenuItemRepository;

  constructor() {
    this.llmService = new LLMService();
    this.sessionRepository = new SessionRepository();
    this.orderService = new OrderService();
    this.menuItemRepository = new MenuItemRepository();
    
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
      
      // Extraer intenciones con timeout y fallback mejorado
      let intents;
      let llmFailed = false; // Flag para saber si el LLM falló
      try {
        intents = await withTimeout(
          this.llmService.extractDetailedIntents(messageWithContext),
          30000, // Aumentado a 30s para proveedores LLM lentos (OpenAI, Anthropic)
          'llm-intent-extraction'
        );
      } catch (error) {
        logger.warn('LLM intent extraction failed or timed out, using minimal fallback', { 
          error: error instanceof Error ? error.message : 'Unknown',
          message: chatRequest.message 
        });
        
        llmFailed = true; // Marcar que el LLM falló
        
        // FALLBACK: Crear intents básicos para que el keyword fallback funcione
        intents = {
          intent: 'otro',
          entities: {
            dietaryRestrictions: [],
            allergens: [],
            budget: null,
            dishesMetioned: [],
            quantity: null,
            spicyLevel: null,
            mealType: null,
            preferences: [],
            specialInstructions: undefined
          }
        };
      }

      if (metricsService && intents.intent !== 'otro') {
        metricsService.recordLLMCall();
        metricsService.recordLatency(MetricType.LLM_CALL, Date.now() - llmStartTime);
      }

      logger.info('🔍 Intents extracted from LLM', { 
        intent: intents.intent,
        dishesMetioned: intents.entities?.dishesMetioned,
        specialInstructions: intents.entities?.specialInstructions,
        quantity: intents.entities?.quantity,
        fullIntents: JSON.stringify(intents, null, 2)
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

      logger.info('🎯 Actions converted', { 
        sessionId,
        intent: intents.intent,
        actionsCount: actions.length,
        actionTypes: actions.map(a => a.type),
        actions: actions.map(a => ({ type: a.type, label: a.label }))
      });

      // 🔍 MEJORAR DETECCIÓN: Comandos explícitos de acción
      // Si el usuario usa verbos de acción explícitos (agregar, añadir, poner, etc.),
      // forzamos la acción correspondiente incluso si el LLM no la detectó bien
      const messageLower = chatRequest.message.toLowerCase();
      const explicitAddKeywords = ['agregar', 'añadir', 'añade', 'agrega', 'pon', 'ponme', 'poner'];
      const hasExplicitAdd = explicitAddKeywords.some(kw => messageLower.includes(kw));
      
      if (hasExplicitAdd && !actions.some(a => a.type === ChatActionType.ADD_TO_CART)) {
        logger.info('Detected explicit ADD command, forcing ADD_TO_CART action', { 
          sessionId, 
          message: chatRequest.message 
        });
        actions.push(createChatAction(ChatActionType.ADD_TO_CART, 'Agregar al carrito'));
      }
      
      // 🔍 FALLBACK: Detectar platos mencionados por palabras clave SOLO si el LLM FALLÓ
      // Si el LLM funcionó correctamente, confiamos en su análisis semántico
      if (llmFailed && (!intents.entities?.dishesMetioned || intents.entities.dishesMetioned.length === 0)) {
        logger.info('LLM failed and no dishes detected, trying keyword fallback as last resort', { 
          sessionId, 
          message: chatRequest.message 
        });
        
        try {
          // Buscar platos por coincidencia de texto en el mensaje
          const allMenuItems = await this.menuItemRepository.findAllAvailable();
          
          const matchedDishes = allMenuItems.filter((item: MenuItem) => {
            const nameLower = item.name.toLowerCase();
            
            // 1. Coincidencia exacta del nombre completo
            if (messageLower.includes(nameLower)) {
              return true;
            }
            
            // 2. Coincidencia de palabras significativas (>= 4 caracteres)
            // Esto evita falsos positivos con palabras como "sin", "con", "la", etc.
            const significantWords = nameLower.split(' ').filter((word: string) => word.length >= 4);
            
            // Requiere que al menos el 50% de las palabras significativas estén en el mensaje
            if (significantWords.length > 0) {
              const matchedWords = significantWords.filter((word: string) => messageLower.includes(word));
              return matchedWords.length >= Math.ceil(significantWords.length * 0.5);
            }
            
            return false;
          });
          
          if (matchedDishes.length > 0) {
            logger.info('Found dishes by keyword match', { 
              sessionId,
              dishes: matchedDishes.map((d: MenuItem) => d.name)
            });
            
            // Actualizar entities con los platos encontrados
            intents.entities.dishesMetioned = matchedDishes.map((d: MenuItem) => d.name);
            
            // Si hay palabras como "quiero", "dame", "traeme" → agregar al carrito
            const orderKeywords = ['quiero', 'dame', 'traeme', 'tráeme', 'pideme', 'pídeme', 'necesito'];
            const hasOrderIntent = orderKeywords.some((kw: string) => messageLower.includes(kw));
            
            // Si hay palabras de eliminar → REMOVE_FROM_CART
            const removeKeywords = ['sacá', 'saca', 'quitá', 'quita', 'eliminá', 'elimina', 'borrá', 'borra', 'no quiero'];
            const hasRemoveIntent = removeKeywords.some((kw: string) => messageLower.includes(kw));
            
            // Si pregunta por detalles, ingredientes, etc. → VIEW_ITEM_DETAILS
            const infoKeywords = ['interesa', 'más sobre', 'más detalles', 'cuéntame', 'explicame', 'ingredientes', 'preparación', 'lleva', 'tiene', 'cómo'];
            const hasInfoIntent = infoKeywords.some((kw: string) => messageLower.includes(kw));
            
            if (hasRemoveIntent && !actions.some(a => a.type === ChatActionType.REMOVE_FROM_CART)) {
              logger.info('Adding REMOVE_FROM_CART action based on keyword detection', { sessionId });
              actions.push(createChatAction(ChatActionType.REMOVE_FROM_CART, 'Quitar del carrito'));
            } else if (hasOrderIntent && !actions.some(a => a.type === ChatActionType.ADD_TO_CART)) {
              logger.info('Adding ADD_TO_CART action based on keyword detection', { sessionId });
              actions.push(createChatAction(ChatActionType.ADD_TO_CART, 'Agregar al carrito'));
            } else if (hasInfoIntent && !actions.some(a => a.type === ChatActionType.VIEW_ITEM_DETAILS)) {
              logger.info('Adding VIEW_ITEM_DETAILS action based on keyword detection', { sessionId });
              actions.push(createChatAction(ChatActionType.VIEW_ITEM_DETAILS, 'Ver detalles', {
                infoType: messageLower.includes('ingrediente') || messageLower.includes('preparación') ? 'ingredients' : 'details',
                dishes: matchedDishes.map((d: MenuItem) => d.name)
              }));
            }
          }
        } catch (error) {
          logger.error('Failed to perform keyword fallback', {
            sessionId,
            error: error instanceof Error ? error.message : 'Unknown'
          });
        }
      }

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

      // Variable para trackear si se agregó automáticamente al carrito
      let autoAddedToCart = false;
      
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
                available: dish.available,
                imageUrl: dish.imageUrl
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

            // ✅ DECIDIR SI AGREGAR AUTOMÁTICAMENTE O SOLO MOSTRAR
            // Si el usuario usó un comando EXPLÍCITO (agregar, añadir, poner),
            // agregamos automáticamente al carrito
            const explicitAddKeywords = ['agregar', 'añadir', 'añade', 'agrega', 'pon', 'ponme', 'poner'];
            const hasExplicitAddCommand = explicitAddKeywords.some(kw => chatRequest.message.toLowerCase().includes(kw));
            
            if (hasExplicitAddCommand) {
              // Comando explícito: agregar automáticamente
              logger.info('Explicit ADD command detected, adding to cart automatically', { sessionId });
              autoAddedToCart = true; // Marcar que se agregó automáticamente
              
              try {
                const specialInstructions = intents.entities?.specialInstructions || '';
                
                for (const dish of found) {
                  const currentSession = await this.sessionRepository.findById(session.id);
                  if (currentSession) {
                    const currentCart = currentSession.cart || [];
                    
                    // Buscar si existe un item PENDIENTE con el mismo menuItemId y specialInstructions
                    const existingPendingIndex = currentCart.findIndex(
                      item => item.menuItemId === dish.id 
                        && !item.confirmed 
                        && (item.specialInstructions || '') === (specialInstructions || '')
                    );

                    if (existingPendingIndex >= 0) {
                      currentCart[existingPendingIndex].quantity += 1;
                      logger.info('Pending item quantity increased', {
                        sessionId: session.id,
                        dish: dish.name,
                        newQuantity: currentCart[existingPendingIndex].quantity,
                      });
                    } else {
                      const newItem: CartItem = {
                        menuItemId: dish.id,
                        quantity: 1,
                      };
                      
                      if (specialInstructions) {
                        newItem.specialInstructions = specialInstructions;
                      }
                      
                      currentCart.push(newItem);
                      logger.info('Item added to cart automatically', {
                        sessionId: session.id,
                        dish: dish.name,
                        specialInstructions: specialInstructions || 'none',
                      });
                    }

                    await this.sessionRepository.update(session.id, {
                      cart: currentCart,
                      updatedAt: new Date(),
                    });
                  }
                }
              } catch (cartError) {
                logger.error('Failed to add to cart automatically', {
                  sessionId: session.id,
                  error: cartError instanceof Error ? cartError.message : 'Unknown',
                });
              }
            } else {
              // Sin comando explícito: solo mostrar opciones
              logger.info('No explicit command, showing recommendations only', {
                sessionId: session.id,
                dishCount: found.length,
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
            // Obtener número de mesa de la sesión o generar uno nuevo
            const tableNumber = currentSession?.tableNumber || Math.floor(Math.random() * 20) + 1;
            
            if (!currentSession?.tableNumber) {
              logger.info('Assigning new table number to session', { 
                sessionId: session.id, 
                tableNumber 
              });
            } else {
              logger.info('Using existing table number from session', { 
                sessionId: session.id, 
                tableNumber 
              });
            }
            
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

            // ⚠️ NO es necesario actualizar el carrito aquí porque orderService.createFromCart
            // ya se encarga de marcar los items como confirmados con la lógica correcta.
            // Esto evita problemas de duplicación cuando se agrega el mismo plato nuevamente.
            
            logger.info('Cart items marked as confirmed by OrderService', { 
              sessionId: session.id,
              confirmedCount: pendingItems.length
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
        updatedSlots,
        autoAddedToCart // Pasar info de si se agregó automáticamente
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

        // 6.1 NO AGREGAR AUTOMÁTICAMENTE - Solo mostrar recomendaciones
        // ℹ️ DESHABILITADO: Auto-agregar al carrito
        // 
        // Anteriormente, cuando se detectaba ADD_TO_CART + recomendaciones,
        // se agregaba automáticamente el primer item recomendado al carrito.
        // 
        // NUEVO COMPORTAMIENTO:
        // - Solo mostramos las recomendaciones al usuario
        // - El usuario decide si quiere agregarlas usando:
        //   1. Botones de la interfaz en las tarjetas de recomendación
        //   2. Comandos explícitos por voz
        //   3. Confirmación manual
        //
        // Esto evita agregar items cuando el usuario solo está explorando
        // (ej: "quiero ensalada" → debe mostrar opciones, no agregar automáticamente)
        
        if (actions.some(a => a.type === ChatActionType.ADD_TO_CART) && recommendations && recommendations.length > 0) {
          logger.info('Recommendations generated - waiting for user to add manually', {
            sessionId: session.id,
            recommendationCount: recommendations.length,
            topRecommendation: recommendations[0]?.dish.name
          });
        }

        // 6.2 Eliminar items del carrito si se detectó acción REMOVE_FROM_CART
        if (actions.some(a => a.type === ChatActionType.REMOVE_FROM_CART)) {
          try {
            const currentCart = session.cart || [];
            const dishesToRemove = intents.entities?.dishesMetioned || [];
            
            if (dishesToRemove.length === 0) {
              logger.warn('REMOVE_FROM_CART action but no dishes mentioned', { sessionId: session.id });
            } else {
              logger.info('Removing items from cart', {
                sessionId: session.id,
                dishesToRemove
              });
              
              // Buscar los platos en Firestore para obtener sus IDs
              const { found } = await this.checkDishAvailability(dishesToRemove);
              
              // Filtrar el carrito quitando los items solicitados
              const updatedCart = currentCart.filter(cartItem => {
                const shouldRemove = found.some(dish => dish.id === cartItem.menuItemId);
                return !shouldRemove;
              });
              
              const removedCount = currentCart.length - updatedCart.length;
              
              await this.sessionRepository.update(session.id, {
                cart: updatedCart
              });
              
              logger.info('Items removed from cart', {
                sessionId: session.id,
                removedCount,
                newCartSize: updatedCart.length
              });
            }
          } catch (cartError) {
            logger.error('Failed to remove from cart', {
              sessionId: session.id,
              error: cartError instanceof Error ? cartError.message : 'Unknown'
            });
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
        
        // Buscar TODAS las coincidencias parciales (ej: "ensalada" → todas las ensaladas)
        const matches = availableItems.filter(item => {
          const normalizedItemName = normalize(item.name);
          const normalizedCategory = normalize(item.category || '');
          const normalizedDescription = normalize(item.description || '');
          
          // Coincide si el nombre, categoría o descripción contienen la palabra buscada
          return normalizedItemName.includes(normalizedDish) || 
                 normalizedDish.includes(normalizedItemName) ||
                 normalizedCategory.includes(normalizedDish) ||
                 normalizedDescription.includes(normalizedDish);
        });

        if (matches.length > 0) {
          // Agregar todos los matches encontrados (evitar duplicados)
          matches.forEach(match => {
            if (!found.some(f => f.id === match.id)) {
              found.push(match);
            }
          });
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
    slots?: ConversationSlots,
    autoAddedToCart?: boolean
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

    // 4. MOSTRAR RECOMENDACIONES O CONFIRMAR AGREGADO
    if (actionTypes.includes(ChatActionType.ADD_TO_CART)) {
      // Si se agregó automáticamente al carrito
      if (autoAddedToCart && hasRecommendations && recommendations.length > 0) {
        const dish = recommendations[0].dish;
        const specialInstructions = intents.entities?.specialInstructions;
        
        let message = `¡Listo! He agregado ${dish.name} ($${dish.price.toLocaleString()}) a tu carrito. 🛒`;
        
        if (specialInstructions) {
          message += `\n\n📝 Nota especial: ${specialInstructions}`;
        }
        
        message += `\n\n¿Quieres agregar algo más o ver tu carrito?`;
        return message;
      }
      
      // Si NO se agregó automáticamente, mostrar opciones
      if (hasRecommendations && recommendations.length > 0) {
        if (recommendations.length === 1) {
          const dish = recommendations[0].dish;
          return `¡Perfecto! Encontré esto para ti:\n\n${dish.name} - $${dish.price.toLocaleString()}\n${dish.description}\n\n¿Te gustaría agregarlo al carrito? 🛒`;
        } else {
          return `¡Genial! Encontré ${recommendations.length} opciones para ti. 🍽️\n\nMira las opciones abajo y haz clic en "Agregar" en la que más te guste, o dime cuál prefieres.`;
        }
      }
      // Si no hay recomendaciones específicas, mensaje genérico
      return '¡Claro! Déjame mostrarte las opciones disponibles. ¿Hay algo en particular que busques?';
    }

    // 5. VER CARRITO / SOLICITAR CUENTA
    if (actionTypes.includes(ChatActionType.VIEW_CART)) {
      // Si el mensaje incluye palabras de "cuenta" o "pagar", mostrar total
      if (msgLower.includes('cuenta') || msgLower.includes('pagar') || msgLower.includes('cuánto') || msgLower.includes('cuanto')) {
        return 'Por supuesto, aquí está tu cuenta. Puedes ver el detalle completo en el panel del carrito. ¿Deseas confirmar el pedido para que proceda el pago?';
      }
      return 'Aquí está tu pedido actual. ¿Deseas modificar algo o estás listo para confirmar?';
    }

    // 5.1 QUITAR DEL CARRITO
    if (actionTypes.includes(ChatActionType.REMOVE_FROM_CART)) {
      const dishes = intents.entities?.dishesMetioned || [];
      if (dishes.length === 0) {
        return '¿Qué plato querés quitar del carrito?';
      }
      return `Listo, saqué ${dishes.join(', ')} de tu pedido. ¿Querés agregar algo más o revisamos el carrito?`;
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
        const priceInfo = found.map(d => `${d.name}: $${d.price}`).join('\n');
        let response = `Claro, aquí están los precios:\n\n${priceInfo}`;
        if (notFound.length > 0) {
          response += `\n\nNo encontré: ${notFound.join(', ')}`;
        }
        response += '\n\n¿Te gustaría ordenar alguno?';
        return response;
      }
      
      if (infoType === 'ingredients') {
        // 🧠 GENERAR RESPUESTA ENRIQUECIDA CON LLM
        try {
          // Construir contexto del plato para el LLM
          const dishContext = found.map(d => {
            const dishInfo = {
              nombre: d.name,
              descripcion: d.description || 'Sin descripción',
              precio: `$${d.price}`,
              categoria: d.category,
              alergenos: d.allergens?.join(', ') || 'ninguno',
              vegano: d.isVegan ? 'Sí' : 'No',
              vegetariano: d.isVegetarian ? 'Sí' : 'No',
              sinGluten: d.isGlutenFree ? 'Sí' : 'No',
              nivelPicante: d.spicyLevel || 0
            };
            return JSON.stringify(dishInfo, null, 2);
          }).join('\n\n');

          const enrichmentPrompt = `Eres un sommelier y chef experto de un restaurante. Un cliente te preguntó sobre este plato:

${dishContext}

Genera una respuesta conversacional y atractiva que incluya:
1. Una breve descripción apetitosa del plato (resaltando sus ingredientes principales)
2. Sugerencias de maridaje (bebidas que combinen bien)
3. Un dato curioso o tip gastronómico sobre el plato
4. Recomendación de acompañamientos o modificaciones populares

La respuesta debe ser:
- Cálida y profesional
- Máximo 150 palabras
- En español rioplatense (Argentina)
- Sin usar markdown (** o ##), solo texto natural

NO inventes ingredientes que no estén en la descripción original. Si la descripción es genérica, enfócate en el tipo de plato.`;

          const enrichedResponse = await withTimeout(
            (async () => {
              const messages = [
                {
                  role: LLMMessageRole.SYSTEM,
                  content: enrichmentPrompt
                }
              ];
              const response = await this.llmService['provider'].generateResponse(messages, {
                temperature: 0.7,
                maxTokens: 300
              });
              return response.content;
            })(),
            8000,
            'dish-enrichment'
          );

          // Agregar información de alérgenos al final
          const allergenInfo = found.filter(d => d.allergens && d.allergens.length > 0)
            .map(d => `⚠️ ${d.name} contiene: ${d.allergens!.join(', ')}`)
            .join('\n');

          let response = enrichedResponse;
          if (allergenInfo) {
            response += `\n\n${allergenInfo}`;
          }
          
          if (notFound.length > 0) {
            response += `\n\nNo encontré información sobre: ${notFound.join(', ')}`;
          }
          
          response += '\n\n¿Te gustaría agregarlo a tu pedido?';
          
          return response;
        } catch (error) {
          logger.error('Failed to generate enriched dish info with LLM, falling back to basic info', {
            error: error instanceof Error ? error.message : 'Unknown'
          });
          
          // FALLBACK: Usar descripción básica de Firestore
          const ingredientsInfo = found.map(d => {
            const info = d.description || 'Plato preparado con ingredientes frescos seleccionados';
            const allergenInfo = d.allergens && d.allergens.length > 0 
              ? `\n⚠️ Contiene: ${d.allergens.join(', ')}` 
              : '';
            return `${d.name}: ${info}${allergenInfo}`;
          }).join('\n\n');
          
          let response = `Por supuesto, aquí está la información:\n\n${ingredientsInfo}`;
          if (notFound.length > 0) {
            response += `\n\nNo encontré: ${notFound.join(', ')}`;
          }
          response += '\n\n¿Tienes alguna alergia o restricción que deba considerar?';
          return response;
        }
      }
      
      // Información general - USAR LLM PARA GENERAR RESPUESTA ENRIQUECIDA 🧠
      try {
        // Construir contexto del plato para el LLM
        const dishContext = found.map(d => {
          const dishInfo = {
            nombre: d.name,
            descripcion: d.description || 'Sin descripción',
            precio: `$${d.price}`,
            categoria: d.category,
            alergenos: d.allergens?.join(', ') || 'ninguno',
            vegano: d.isVegan ? 'Sí' : 'No',
            vegetariano: d.isVegetarian ? 'Sí' : 'No',
            sinGluten: d.isGlutenFree ? 'Sí' : 'No',
            nivelPicante: d.spicyLevel || 0
          };
          return JSON.stringify(dishInfo, null, 2);
        }).join('\n\n');

        const enrichmentPrompt = `Eres un sommelier y chef experto de un restaurante. Un cliente te preguntó sobre este plato y quiere saber más:

${dishContext}

Genera una respuesta conversacional y atractiva que incluya:
1. Una descripción apetitosa del plato (resaltando sus ingredientes principales)
2. Por qué es una buena elección (beneficios, sabor, textura)
3. Sugerencias de maridaje (bebidas que combinen bien)
4. Un dato curioso o tip gastronómico sobre el plato
5. Recomendación de acompañamientos o modificaciones populares

La respuesta debe ser:
- Cálida y entusiasta, como un experto recomendando a un amigo
- Máximo 180 palabras
- En español rioplatense (Argentina, uso de "vos")
- Sin usar markdown (** o ##), solo texto natural con emojis ocasionales

NO inventes ingredientes que no estén en la descripción original. Si la descripción es genérica, enfócate en el tipo de plato y categoría.`;

        const enrichedResponse = await withTimeout(
          (async () => {
            const messages = [
              {
                role: LLMMessageRole.SYSTEM,
                content: enrichmentPrompt
              }
            ];
            const response = await this.llmService['provider'].generateResponse(messages, {
              temperature: 0.8, // Más creatividad para respuestas generales
              maxTokens: 350
            });
            return response.content;
          })(),
          10000, // 10 segundos para respuesta general
          'dish-general-info-enrichment'
        );

        // Agregar información de alérgenos al final
        const allergenInfo = found.filter(d => d.allergens && d.allergens.length > 0)
          .map(d => `\n⚠️ ${d.name} contiene: ${d.allergens!.join(', ')}`)
          .join('\n');

        let response = enrichedResponse;
        if (allergenInfo) {
          response += `\n${allergenInfo}`;
        }
        
        if (notFound.length > 0) {
          response += `\n\nNo encontré información sobre: ${notFound.join(', ')}`;
        }
        
        response += '\n\n¿Te gustaría agregarlo a tu pedido?';
        
        return response;
      } catch (error) {
        logger.error('Failed to generate enriched dish info with LLM, falling back to basic info', {
          error: error instanceof Error ? error.message : 'Unknown'
        });
        
        // FALLBACK: Usar descripción básica de Firestore
        const detailsInfo = found.map(d => `${d.name} - $${d.price}\n${d.description || 'Plato delicioso preparado con ingredientes frescos'}`).join('\n\n');
        let response = `Te cuento sobre ${found.length === 1 ? 'este plato' : 'estos platos'}:\n\n${detailsInfo}`;
        if (notFound.length > 0) {
          response += `\n\nNo encontré: ${notFound.join(', ')}`;
        }
        response += '\n\n¿Te gustaría ordenar algo?';
        return response;
      }
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
    
    if (primaryIntent === 'quitar_del_pedido') {
      actions.push(createChatAction(ChatActionType.REMOVE_FROM_CART, 'Quitar del carrito'));
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
    
    // NOTA: "solicitar_cuenta" NO genera acción - se maneja solo visualmente en el frontend
    // El botón "Solicitar Cuenta" en CartPanel abre el panel sin enviar mensaje al chat
    
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
