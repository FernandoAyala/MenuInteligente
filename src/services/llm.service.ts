import { ILLMProvider, LLMMessage, LLMProviderType, MessageRole } from '../interfaces/llm.interface';
import {
    GenerationPrompts,
    formatOrderSummary,
} from '../prompts/generation.prompts';
import {
    IntentExtractionResult,
    NLUPrompts
} from '../prompts/nlu.prompts';
import { LLMProviderFactory } from '../providers/llm.factory';
import { config } from '../config/env.config';

/**
 * Servicio avanzado de LLM con capacidades mejoradas de NLU
 * Epic #21: Integración LLM y Procesamiento de Lenguaje Natural
 * Implementa Tasks #25, #26, #27, #29, #30, #31, #32
 */
export class LLMService {
  private provider: ILLMProvider;
  private currentProviderType: LLMProviderType;
  private readonly fallbackProviderType?: LLMProviderType;
  private readonly primaryProviderType: LLMProviderType;
  private readonly breakerFailureThreshold: number;
  private readonly breakerCooldownMs: number;
  private primaryFailureCount = 0;
  private circuitState: 'closed' | 'open' | 'half-open' = 'closed';
  private nextPrimaryRetryTimestamp = 0;

  constructor(providerType?: LLMProviderType, fallbackProviderType?: LLMProviderType) {
    const resolvedPrimary =
      providerType ??
      this.resolveProviderFromConfig(config.llm?.defaultProvider) ??
      LLMProviderType.OPENAI;

    this.primaryProviderType = resolvedPrimary;
    this.currentProviderType = resolvedPrimary;
    this.provider = LLMProviderFactory.getProvider(resolvedPrimary);

    const resolvedFallback =
      fallbackProviderType ??
      this.resolveProviderFromConfig(config.llm?.fallbackProvider);

    this.fallbackProviderType =
      resolvedFallback && resolvedFallback !== resolvedPrimary ? resolvedFallback : undefined;

    this.breakerFailureThreshold = Math.max(
      1,
      config.llm?.breaker?.failureThreshold ?? 3
    );
    this.breakerCooldownMs = Math.max(
      1000,
      config.llm?.breaker?.cooldownMs ?? 60000
    );
  }

  private resolveProviderFromConfig(
    provider?: string | LLMProviderType | null
  ): LLMProviderType | undefined {
    if (!provider) {
      return undefined;
    }

    const normalized = provider.toString().toLowerCase();
    return (Object.values(LLMProviderType) as string[]).includes(normalized)
      ? (normalized as LLMProviderType)
      : undefined;
  }

  /**
   * Cambia el proveedor dinámicamente
   */
  setProvider(providerType: LLMProviderType): void {
    this.provider = LLMProviderFactory.getProvider(providerType);
    this.currentProviderType = providerType;
  }

  /**
   * Obtiene el nombre del proveedor actual
   */
  getCurrentProvider(): string {
    return this.provider.getProviderName();
  }

  /**
   * Genera una respuesta de texto libre basada en un prompt
   * Útil para análisis, resúmenes, y respuestas generales
   */
  async generateTextResponse(prompt: string, options?: {
    temperature?: number;
    maxTokens?: number;
  }): Promise<string> {
    const systemPrompt: LLMMessage = {
      role: MessageRole.SYSTEM,
      content: prompt,
    };

    try {
      const response = await this.executeWithFallback((provider: ILLMProvider) =>
        provider.generateResponse([systemPrompt], {
          temperature: options?.temperature || 0.7,
          maxTokens: options?.maxTokens || 1000,
        })
      );

      return response.content;
    } catch (error) {
      console.error('Error generating text response:', error);
      throw error;
    }
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
      const response = await this.executeWithFallback((provider: ILLMProvider) =>
        provider.generateResponse([systemPrompt, userPrompt], {
          temperature: 0.3,
          maxTokens: 800,
        })
      );

      return this.parseStructuredResponse<IntentExtractionResult>(response.content);
    } catch (error) {
      console.error('Error extracting intents:', error);
      return this.getDefaultIntentResult();
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
      const response = await this.executeWithFallback((provider: ILLMProvider) =>
        provider.generateResponse(messages, {
          temperature: 0.7,
          maxTokens: 1200,
        })
      );

      return response.content;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return 'Disculpá, tuve un problema generando recomendaciones. ¿Podés reformular tu consulta?';
    }
  }

  /**
   * Responde consultas sobre ingredientes y alérgenos
   * Usa IntentExtractionResult para obtener información de alergias
   */
  async answerIngredientQuery(params: {
    userMessage: string;
    dishId?: string;
    menuItems: any[];
    intentData?: IntentExtractionResult; // Contiene entities.allergens
  }): Promise<string> {
    const dish = params.dishId 
      ? params.menuItems.find(item => item.id === params.dishId)
      : null;

    const allergyInfo = params.intentData?.entities?.allergens || [];
    
    const systemPrompt: LLMMessage = {
      role: MessageRole.SYSTEM,
      content: `${GenerationPrompts.ingredientInquiry}

${dish ? `PLATO CONSULTADO:\n${JSON.stringify(dish, null, 2)}` : ''}

${allergyInfo.length > 0 ? `ALERGIAS DEL CLIENTE:\n${allergyInfo.join(', ')}` : ''}`,
    };

    const userPrompt: LLMMessage = {
      role: MessageRole.USER,
      content: params.userMessage,
    };

    try {
      const response = await this.executeWithFallback((provider: ILLMProvider) =>
        provider.generateResponse([systemPrompt, userPrompt], {
          temperature: 0.3, // Baja para respuestas precisas sobre seguridad
          maxTokens: 800,
        })
      );

      return response.content;
    } catch (error) {
      console.error('Error answering ingredient query:', error);
      return 'Para tu seguridad, dejame verificar eso con el chef y te confirmo 👨‍🍳';
    }
  }

  /**
   * Maneja restricciones dietarias
   * Usa IntentExtractionResult.entities.dietaryRestrictions
   */
  async handleDietaryRestrictions(params: {
    userMessage: string;
    intentData: IntentExtractionResult;
    menuItems: any[];
  }): Promise<string> {
    // Obtener restricciones del intent
    const restrictions = params.intentData.entities.dietaryRestrictions || [];
    
    // Filtrar menú por restricciones
    const suitableItems = this.filterMenuByDietaryRestrictions(
      params.menuItems,
      restrictions
    );

    const systemPrompt: LLMMessage = {
      role: MessageRole.SYSTEM,
      content: `${GenerationPrompts.dietaryRestrictions}

RESTRICCIONES DEL CLIENTE:
${restrictions.join(', ')}

OPCIONES ADECUADAS:
${JSON.stringify(suitableItems, null, 2)}`,
    };

    const userPrompt: LLMMessage = {
      role: MessageRole.USER,
      content: params.userMessage,
    };

    try {
      const response = await this.executeWithFallback((provider: ILLMProvider) =>
        provider.generateResponse([systemPrompt, userPrompt], {
          temperature: 0.7,
          maxTokens: 1000,
        })
      );

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
      const response = await this.executeWithFallback((provider: ILLMProvider) =>
        provider.generateResponse([systemPrompt, userPrompt], {
          temperature: 0.5,
          maxTokens: 600,
        })
      );

      return response.content;
    } catch (error) {
      console.error('Error confirming order:', error);
      return orderSummary + '\n\n¿Está todo bien?';
    }
  }

  /**
   * Genera pregunta de seguimiento contextual
   * Usa IntentExtractionResult.context para el análisis
   */
  async generateFollowUpQuestion(params: {
    intent: IntentExtractionResult;
  }): Promise<string> {
    const systemPrompt: LLMMessage = {
      role: MessageRole.SYSTEM,
      content: `${GenerationPrompts.followUpQuestions}

CONTEXTO DE LA CONVERSACIÓN:
- Tono: ${params.intent.context.tone}
- Es pregunta: ${params.intent.context.isQuestion}
- Necesita aclaración: ${params.intent.context.needsClarification}

ÚLTIMA INTENCIÓN:
- Intent: ${params.intent.intent}
- Confianza: ${params.intent.confidence}
- Entidades extraídas: ${JSON.stringify(params.intent.entities, null, 2)}`,
    };

    const userPrompt: LLMMessage = {
      role: MessageRole.USER,
      content: 'Genera una pregunta de seguimiento apropiada',
    };

    try {
      const response = await this.executeWithFallback((provider: ILLMProvider) =>
        provider.generateResponse([systemPrompt, userPrompt], {
          temperature: 0.8,
          maxTokens: 200,
        })
      );

      return response.content;
    } catch (error) {
      console.error('Error generating follow-up:', error);
      return '¿En qué más te puedo ayudar?';
    }
  }

  private async executeWithFallback<T>(
    action: (provider: ILLMProvider) => Promise<T>
  ): Promise<T> {
    if (!this.fallbackProviderType) {
      return action(this.provider);
    }

    const canUsePrimary = this.shouldAttemptPrimary();

    if (canUsePrimary) {
      if (this.currentProviderType !== this.primaryProviderType) {
        this.setProvider(this.primaryProviderType);
      }

      try {
        const result = await action(this.provider);
        this.resetCircuit();
        return result;
      } catch (primaryError) {
        this.registerPrimaryFailure();

        console.warn(
          `[LLMService] Error con proveedor "${this.primaryProviderType}". Usando fallback "${this.fallbackProviderType}".`,
          primaryError
        );

        return this.runWithFallback(action, primaryError);
      }
    }

    return this.runWithFallback(action);
  }

  private shouldAttemptPrimary(): boolean {
    if (!this.fallbackProviderType) {
      return true;
    }

    if (this.circuitState === 'open') {
      if (Date.now() >= this.nextPrimaryRetryTimestamp) {
        this.circuitState = 'half-open';
        console.info(
          `[LLMService] Periodo de enfriamiento finalizado. Probando nuevamente con "${this.primaryProviderType}".`
        );
        return true;
      }

      return false;
    }

    return true;
  }

  private registerPrimaryFailure(): void {
    this.primaryFailureCount = Math.min(
      this.primaryFailureCount + 1,
      this.breakerFailureThreshold
    );

    if (this.circuitState === 'half-open' || this.primaryFailureCount >= this.breakerFailureThreshold) {
      this.openCircuit();
    }
  }

  private openCircuit(): void {
    if (!this.fallbackProviderType) {
      return;
    }

    this.circuitState = 'open';
    this.nextPrimaryRetryTimestamp = Date.now() + this.breakerCooldownMs;
    this.primaryFailureCount = this.breakerFailureThreshold;

    console.warn(
      `[LLMService] Circuit breaker abierto para "${this.primaryProviderType}" durante ${this.breakerCooldownMs}ms.`
    );

    if (this.currentProviderType !== this.fallbackProviderType) {
      this.setProvider(this.fallbackProviderType);
    }
  }

  private resetCircuit(): void {
    const wasOpen = this.circuitState !== 'closed' || this.primaryFailureCount !== 0;

    this.primaryFailureCount = 0;
    this.circuitState = 'closed';
    this.nextPrimaryRetryTimestamp = 0;

    if (wasOpen) {
      console.info(
        `[LLMService] Circuito restablecido. Proveedor "${this.primaryProviderType}" nuevamente operativo.`
      );
    }
  }

  private async runWithFallback<T>(
    action: (provider: ILLMProvider) => Promise<T>,
    primaryError?: unknown,
  ): Promise<T> {
    if (!this.fallbackProviderType) {
      if (primaryError !== undefined) {
        throw primaryError;
      }

      return action(this.provider);
    }

    const previousType = this.currentProviderType;
    const previousProvider = this.provider;

    if (this.currentProviderType !== this.fallbackProviderType) {
      this.setProvider(this.fallbackProviderType);
    }

    try {
      return await action(this.provider);
    } catch (fallbackError) {
      this.provider = previousProvider;
      this.currentProviderType = previousType;

      console.error(
        `[LLMService] Fallback "${this.fallbackProviderType}" falló al manejar la solicitud.`,
        fallbackError
      );

      if (fallbackError instanceof Error && primaryError !== undefined) {
        (fallbackError as Error & { primaryError?: unknown }).primaryError = primaryError;
      }

      throw fallbackError;
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
   * Retorna intención "otro" (caso por defecto del prompt)
   */
  private getDefaultIntentResult(): IntentExtractionResult {
    return {
      intent: 'otro', // "otro" es la intención por defecto según el prompt
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
        tone: 'casual',
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
        for (const restriction of intent.entities.dietaryRestrictions) {
          const r = restriction.toLowerCase();
          
          if (r.includes('vegetarian') || r === 'vegetariano') {
            if (!item.isVegetarian) return false;
          }
          if (r.includes('vegan') || r === 'vegano') {
            if (!item.isVegan) return false;
          }
          if (r.includes('gluten') || r === 'sin-gluten') {
            if (!item.isGlutenFree) return false;
          }
          if (r.includes('lactose') || r === 'sin-lactosa') {
            if (!item.isLactoseFree) return false;
          }
        }
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

      // Filtrar por preferencias (usando tags)
      if (intent.entities.preferences.length > 0 && item.tags && item.tags.length > 0) {
        // No es filtro duro, pero priorizamos items que tienen tags que coinciden
        // Si el item no tiene tags, no lo descartamos, solo lo depriorizamos en el scoring
      }

      return item.available !== false;
    });
  }

  private filterMenuByDietaryRestrictions(menuItems: any[], restrictions: string[]): any[] {
    return menuItems.filter(item => {
      for (const restriction of restrictions) {
        const r = restriction.toLowerCase();
        if (r.includes('vegetarian') || r === 'vegetariano') {
          if (!item.isVegetarian) return false;
        }
        if (r.includes('vegan') || r === 'vegano') {
          if (!item.isVegan) return false;
        }
        if (r.includes('gluten') || r === 'sin-gluten') {
          if (!item.isGlutenFree) return false;
        }
        if (r.includes('lactose') || r === 'sin-lactosa') {
          if (!item.isLactoseFree) return false;
        }
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
