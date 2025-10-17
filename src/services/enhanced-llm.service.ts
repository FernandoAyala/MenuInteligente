import { LLMProviderFactory } from '../providers/llm.factory';
import { ILLMProvider, LLMMessage, LLMProviderType, MessageRole } from '../interfaces/llm.interface';
import { 
  NLUPrompts, 
  IntentExtractionResult, 
  DietaryAnalysisResult,
  AllergyDetectionResult,
  BudgetAnalysisResult,
  ContextUnderstandingResult,
  MultiIntentDetectionResult 
} from '../prompts/nlu.prompts';
import {
  GenerationPrompts,
  formatOrderSummary,
} from '../prompts/generation.prompts';

/**
 * Servicio avanzado de LLM con capacidades mejoradas de NLU
 * Epic #21: Integración LLM y Procesamiento de Lenguaje Natural
 * Implementa Tasks #25, #26, #27, #29, #30, #31, #32
 */
export class EnhancedLLMService {
  private provider: ILLMProvider;

  constructor(providerType?: LLMProviderType) {
    this.provider = providerType
      ? LLMProviderFactory.getProvider(providerType)
      : LLMProviderFactory.getDefaultProvider();
  }

  /**
   * Cambia el proveedor dinámicamente
   */
  setProvider(providerType: LLMProviderType): void {
    this.provider = LLMProviderFactory.getProvider(providerType);
  }

  /**
   * Obtiene el nombre del proveedor actual
   */
  getCurrentProvider(): string {
    return this.provider.getProviderName();
  }

  // ============================================================================
  // TASK #26: Funciones de extracción de intenciones mejoradas
  // ============================================================================

  /**
   * Extrae intenciones completas con entidades estructuradas
   * Usa el prompt especializado de NLU
   */
  async extractDetailedIntents(userMessage: string): Promise<IntentExtractionResult> {
    const systemPrompt: LLMMessage = {
      role: MessageRole.SYSTEM,
      content: NLUPrompts.intentExtraction,
    };

    const userPrompt: LLMMessage = {
      role: MessageRole.USER,
      content: userMessage,
    };

    try {
      const response = await this.provider.generateResponse([systemPrompt, userPrompt], {
        temperature: 0.3,
        maxTokens: 800,
      });

      return this.parseStructuredResponse<IntentExtractionResult>(response.content);
    } catch (error) {
      console.error('Error extracting intents:', error);
      return this.getDefaultIntentResult();
    }
  }

  /**
   * Analiza restricciones dietarias específicas
   */
  async analyzeDietaryRestrictions(userMessage: string): Promise<DietaryAnalysisResult> {
    const systemPrompt: LLMMessage = {
      role: MessageRole.SYSTEM,
      content: NLUPrompts.dietaryAnalysis,
    };

    const userPrompt: LLMMessage = {
      role: MessageRole.USER,
      content: userMessage,
    };

    try {
      const response = await this.provider.generateResponse([systemPrompt, userPrompt], {
        temperature: 0.2,
        maxTokens: 500,
      });

      return this.parseStructuredResponse<DietaryAnalysisResult>(response.content);
    } catch (error) {
      console.error('Error analyzing dietary restrictions:', error);
      return {
        restrictions: [],
        certainty: 'low',
        suggestedQuestions: [],
        warnings: [],
      };
    }
  }

  /**
   * Detecta alergias con análisis de severidad
   * CRÍTICO para seguridad del cliente
   */
  async detectAllergies(userMessage: string): Promise<AllergyDetectionResult> {
    const systemPrompt: LLMMessage = {
      role: MessageRole.SYSTEM,
      content: NLUPrompts.allergyDetection,
    };

    const userPrompt: LLMMessage = {
      role: MessageRole.USER,
      content: userMessage,
    };

    try {
      const response = await this.provider.generateResponse([systemPrompt, userPrompt], {
        temperature: 0.1, // Muy baja para máxima precisión en tema crítico
        maxTokens: 600,
      });

      return this.parseStructuredResponse<AllergyDetectionResult>(response.content);
    } catch (error) {
      console.error('Error detecting allergies:', error);
      // Default seguro: asumir que SÍ hay alergia si hubo error
      return {
        allergens: [],
        requiresStrictAvoidance: true,
        crossContaminationConcern: true,
        suggestedVerifications: ['Verificar todos los ingredientes manualmente'],
        recommendedDisclaimer: 'Por seguridad, consulte con el personal',
      };
    }
  }

  /**
   * Analiza presupuesto y preferencias de precio
   */
  async analyzeBudget(userMessage: string): Promise<BudgetAnalysisResult> {
    const systemPrompt: LLMMessage = {
      role: MessageRole.SYSTEM,
      content: NLUPrompts.budgetAnalysis,
    };

    const userPrompt: LLMMessage = {
      role: MessageRole.USER,
      content: userMessage,
    };

    try {
      const response = await this.provider.generateResponse([systemPrompt, userPrompt], {
        temperature: 0.3,
        maxTokens: 400,
      });

      return this.parseStructuredResponse<BudgetAnalysisResult>(response.content);
    } catch (error) {
      console.error('Error analyzing budget:', error);
      return {
        budgetRange: { min: 0, max: null, currency: 'ARS', perPerson: true },
        pricePreference: 'mid-range',
        flexibility: 'flexible',
        confidence: 0.0,
        suggestedCategories: [],
      };
    }
  }

  /**
   * Detecta múltiples intenciones en un mensaje
   */
  async detectMultipleIntents(userMessage: string): Promise<MultiIntentDetectionResult> {
    const systemPrompt: LLMMessage = {
      role: MessageRole.SYSTEM,
      content: NLUPrompts.multiIntentDetection,
    };

    const userPrompt: LLMMessage = {
      role: MessageRole.USER,
      content: userMessage,
    };

    try {
      const response = await this.provider.generateResponse([systemPrompt, userPrompt], {
        temperature: 0.3,
        maxTokens: 600,
      });

      return this.parseStructuredResponse<MultiIntentDetectionResult>(response.content);
    } catch (error) {
      console.error('Error detecting multiple intents:', error);
      return {
        intents: [],
        executionOrder: [],
        requiresSequentialProcessing: false,
        complexity: 'simple',
      };
    }
  }

  // ============================================================================
  // TASK #32: Manejo de contexto conversacional
  // ============================================================================

  /**
   * Comprende el contexto de la conversación
   */
  async understandContext(
    conversationHistory: LLMMessage[]
  ): Promise<ContextUnderstandingResult> {
    const systemPrompt: LLMMessage = {
      role: MessageRole.SYSTEM,
      content: NLUPrompts.contextUnderstanding,
    };

    const historyText = conversationHistory
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const userPrompt: LLMMessage = {
      role: MessageRole.USER,
      content: `Analiza esta conversación:\n\n${historyText}`,
    };

    try {
      const response = await this.provider.generateResponse([systemPrompt, userPrompt], {
        temperature: 0.4,
        maxTokens: 500,
      });

      return this.parseStructuredResponse<ContextUnderstandingResult>(response.content);
    } catch (error) {
      console.error('Error understanding context:', error);
      return {
        conversationStage: 'inicial',
        emotionalState: 'indeciso',
        missingInfo: [],
        clarificationsNeeded: [],
        suggestedNextSteps: [],
        urgency: 'low',
        confidence: 0.0,
      };
    }
  }

  // ============================================================================
  // TASK #29, #30, #31: Generación de respuestas conversacionales
  // ============================================================================

  /**
   * Genera recomendaciones de platos con justificaciones
   * TASK #29: System prompts para generación
   * TASK #31: Integración de datos del menú
   */
  async generateDishRecommendations(params: {
    userMessage: string;
    intent: IntentExtractionResult;
    menuItems: any[];
    conversationHistory?: LLMMessage[];
  }): Promise<string> {
    // Filtrar platos relevantes basados en las entidades
    const relevantItems = this.filterMenuByIntent(params.menuItems, params.intent);

    const systemPrompt: LLMMessage = {
      role: MessageRole.SYSTEM,
      content: `${GenerationPrompts.dishRecommendation}

MENÚ DISPONIBLE:
${JSON.stringify(relevantItems, null, 2)}

PREFERENCIAS DEL CLIENTE:
${JSON.stringify(params.intent.entities, null, 2)}`,
    };

    const messages: LLMMessage[] = [];
    
    // Incluir historial si existe (TASK #32: contexto conversacional)
    if (params.conversationHistory && params.conversationHistory.length > 0) {
      messages.push(...params.conversationHistory.slice(-4)); // Últimos 4 mensajes
    }

    messages.push(systemPrompt);
    messages.push({
      role: MessageRole.USER,
      content: params.userMessage,
    });

    try {
      const response = await this.provider.generateResponse(messages, {
        temperature: 0.7,
        maxTokens: 1200,
      });

      return response.content;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return 'Disculpá, tuve un problema generando recomendaciones. ¿Podés reformular tu consulta?';
    }
  }

  /**
   * Responde consultas sobre ingredientes y alérgenos
   */
  async answerIngredientQuery(params: {
    userMessage: string;
    dishId?: string;
    menuItems: any[];
    allergyInfo?: AllergyDetectionResult;
  }): Promise<string> {
    const dish = params.dishId 
      ? params.menuItems.find(item => item.id === params.dishId)
      : null;

    const systemPrompt: LLMMessage = {
      role: MessageRole.SYSTEM,
      content: `${GenerationPrompts.ingredientInquiry}

${dish ? `PLATO CONSULTADO:\n${JSON.stringify(dish, null, 2)}` : ''}

${params.allergyInfo ? `ALERGIAS DETECTADAS:\n${JSON.stringify(params.allergyInfo, null, 2)}` : ''}`,
    };

    const userPrompt: LLMMessage = {
      role: MessageRole.USER,
      content: params.userMessage,
    };

    try {
      const response = await this.provider.generateResponse([systemPrompt, userPrompt], {
        temperature: 0.3, // Baja para respuestas precisas sobre seguridad
        maxTokens: 800,
      });

      return response.content;
    } catch (error) {
      console.error('Error answering ingredient query:', error);
      return 'Para tu seguridad, dejame verificar eso con el chef y te confirmo 👨‍🍳';
    }
  }

  /**
   * Maneja restricciones dietarias
   */
  async handleDietaryRestrictions(params: {
    userMessage: string;
    restrictions: DietaryAnalysisResult;
    menuItems: any[];
  }): Promise<string> {
    // Filtrar menú por restricciones
    const suitableItems = this.filterMenuByDietaryRestrictions(
      params.menuItems,
      params.restrictions.restrictions
    );

    const systemPrompt: LLMMessage = {
      role: MessageRole.SYSTEM,
      content: `${GenerationPrompts.dietaryRestrictions}

RESTRICCIONES DEL CLIENTE:
${JSON.stringify(params.restrictions, null, 2)}

OPCIONES ADECUADAS:
${JSON.stringify(suitableItems, null, 2)}`,
    };

    const userPrompt: LLMMessage = {
      role: MessageRole.USER,
      content: params.userMessage,
    };

    try {
      const response = await this.provider.generateResponse([systemPrompt, userPrompt], {
        temperature: 0.7,
        maxTokens: 1000,
      });

      return response.content;
    } catch (error) {
      console.error('Error handling dietary restrictions:', error);
      return 'Tenemos opciones para tu restricción. Dejame mostrarte las mejores 🌱';
    }
  }

  /**
   * Confirma pedido con resumen detallado
   */
  async confirmOrder(params: {
    orderItems: Array<{
      name: string;
      quantity: number;
      price: number;
      modifications?: string[];
    }>;
    dietaryRestrictions?: string[];
  }): Promise<string> {
    const orderSummary = formatOrderSummary(params.orderItems);

    const systemPrompt: LLMMessage = {
      role: MessageRole.SYSTEM,
      content: GenerationPrompts.orderConfirmation,
    };

    const userPrompt: LLMMessage = {
      role: MessageRole.USER,
      content: `Confirmar pedido:\n${orderSummary}\n${params.dietaryRestrictions ? `Restricciones: ${params.dietaryRestrictions.join(', ')}` : ''}`,
    };

    try {
      const response = await this.provider.generateResponse([systemPrompt, userPrompt], {
        temperature: 0.5,
        maxTokens: 600,
      });

      return response.content;
    } catch (error) {
      console.error('Error confirming order:', error);
      return orderSummary + '\n\n¿Está todo bien?';
    }
  }

  /**
   * Genera pregunta de seguimiento contextual
   */
  async generateFollowUpQuestion(params: {
    context: ContextUnderstandingResult;
    intent: IntentExtractionResult;
  }): Promise<string> {
    const systemPrompt: LLMMessage = {
      role: MessageRole.SYSTEM,
      content: `${GenerationPrompts.followUpQuestions}

CONTEXTO ACTUAL:
${JSON.stringify(params.context, null, 2)}

ÚLTIMA INTENCIÓN:
${JSON.stringify(params.intent, null, 2)}`,
    };

    const userPrompt: LLMMessage = {
      role: MessageRole.USER,
      content: 'Genera una pregunta de seguimiento apropiada',
    };

    try {
      const response = await this.provider.generateResponse([systemPrompt, userPrompt], {
        temperature: 0.8,
        maxTokens: 200,
      });

      return response.content;
    } catch (error) {
      console.error('Error generating follow-up:', error);
      return '¿En qué más te puedo ayudar?';
    }
  }

  // ============================================================================
  // TASK #27: Funciones de parsing de respuestas estructuradas
  // ============================================================================

  /**
   * Parser genérico para respuestas JSON del LLM
   * Maneja errores y formatos variados
   */
  private parseStructuredResponse<T>(content: string): T {
    try {
      // Intentar parsear directamente
      return JSON.parse(content);
    } catch (firstError) {
      try {
        // Buscar JSON en el contenido (puede estar envuelto en markdown)
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                         content.match(/```\s*([\s\S]*?)\s*```/) ||
                         content.match(/{[\s\S]*}/);
        
        if (jsonMatch) {
          const jsonStr = jsonMatch[1] || jsonMatch[0];
          return JSON.parse(jsonStr);
        }

        throw new Error('No JSON found in response');
      } catch (secondError) {
        console.error('Failed to parse LLM response:', content);
        console.error('Parse errors:', firstError, secondError);
        throw new Error('Unable to parse structured response from LLM');
      }
    }
  }

  /**
   * Valida y corrige respuesta de intención si tiene problemas
   */
  private getDefaultIntentResult(): IntentExtractionResult {
    return {
      intent: 'unknown',
      entities: {
        dietaryRestrictions: [],
        allergens: [],
        budget: null,
        dishesMetioned: [],
        quantity: null,
        spicyLevel: null,
        mealType: null,
        preferences: [],
      },
      context: {
        isQuestion: true,
        tone: 'neutral',
        needsClarification: true,
      },
      confidence: 0.0,
    };
  }

  // ============================================================================
  // Helper functions para filtrado de menú
  // ============================================================================

  private filterMenuByIntent(menuItems: any[], intent: IntentExtractionResult): any[] {
    return menuItems.filter(item => {
      // Filtrar por restricciones dietarias
      if (intent.entities.dietaryRestrictions.length > 0) {
        const hasRestrictionMatch = intent.entities.dietaryRestrictions.some(restriction => {
          if (restriction.toLowerCase().includes('vegetarian') && !item.isVegetarian) return false;
          if (restriction.toLowerCase().includes('vegan') && !item.isVegan) return false;
          if (restriction.toLowerCase().includes('gluten') && !item.isGlutenFree) return false;
          return true;
        });
        if (!hasRestrictionMatch) return false;
      }

      // Filtrar por alergenos
      if (intent.entities.allergens.length > 0 && item.allergens) {
        const hasAllergen = intent.entities.allergens.some(allergen =>
          item.allergens.some((a: string) => 
            a.toLowerCase().includes(allergen.toLowerCase())
          )
        );
        if (hasAllergen) return false;
      }

      // Filtrar por presupuesto
      if (intent.entities.budget) {
        if (intent.entities.budget.max && item.price > intent.entities.budget.max) return false;
        if (intent.entities.budget.min && item.price < intent.entities.budget.min) return false;
      }

      // Filtrar por tipo de comida
      if (intent.entities.mealType && item.category) {
        if (!item.category.toLowerCase().includes(intent.entities.mealType)) return false;
      }

      // Filtrar por nivel de picante
      if (intent.entities.spicyLevel && item.spicyLevel) {
        const spicyLevelMap: Record<string, number> = {
          none: 0,
          low: 1,
          medium: 2,
          high: 3,
        };
        const requestedLevel = spicyLevelMap[intent.entities.spicyLevel] ?? 1;
        const itemLevel = typeof item.spicyLevel === 'number' ? item.spicyLevel : 1;
        if (itemLevel > requestedLevel) return false;
      }

      return item.available !== false;
    });
  }

  private filterMenuByDietaryRestrictions(menuItems: any[], restrictions: string[]): any[] {
    return menuItems.filter(item => {
      for (const restriction of restrictions) {
        const r = restriction.toLowerCase();
        if (r.includes('vegetarian') && !item.isVegetarian) return false;
        if (r.includes('vegan') && !item.isVegan) return false;
        if (r.includes('gluten') && !item.isGlutenFree) return false;
      }
      return item.available !== false;
    });
  }

  /**
   * Verifica disponibilidad del proveedor
   */
  isProviderAvailable(): boolean {
    return this.provider.isAvailable();
  }

  /**
   * Lista proveedores disponibles
   */
  static getAvailableProviders(): LLMProviderType[] {
    return LLMProviderFactory.getAvailableProviders();
  }
}
