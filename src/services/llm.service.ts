import { ILLMProvider, LLMMessage, LLMProviderType, MessageRole } from '../interfaces/llm.interface';
import { LLMProviderFactory } from '../providers/llm.factory';

/**
 * Servicio de LLM que utiliza el patrón Adapter
 * Permite cambiar entre diferentes proveedores (OpenAI, Gemini, etc)
 */
export class LLMService {
  private provider: ILLMProvider;

  constructor(providerType?: LLMProviderType) {
    // Si no se especifica, usar el proveedor por defecto
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

  /**
   * Genera una respuesta del agente IA conversacional
   */
  async generateChatResponse(
    conversationHistory: LLMMessage[],
    temperature: number = 0.7
  ): Promise<string> {
    const response = await this.provider.generateResponse(conversationHistory, {
      temperature,
      maxTokens: 1000,
    });

    return response.content;
  }

  /**
   * Extrae las intenciones del usuario desde un mensaje
   */
  async extractIntents(userMessage: string): Promise<{
    intent: string;
    entities: Record<string, any>;
    confidence: number;
  }> {
    const systemPrompt: LLMMessage = {
      role: MessageRole.SYSTEM,
      content: `Eres un asistente especializado en extraer intenciones de usuarios en un restaurante.
Analiza el mensaje del usuario e identifica:
1. La intención principal (consultar_menu, agregar_plato, quitar_plato, ver_carrito, finalizar_orden, etc)
2. Las entidades relevantes (platos, cantidades, restricciones dietéticas, etc)
3. Tu nivel de confianza (0.0 a 1.0)

Responde SOLO en formato JSON, sin texto adicional:
{
  "intent": "nombre_de_intencion",
  "entities": {
    "key": "value"
  },
  "confidence": 0.95
}`,
    };

    const userPrompt: LLMMessage = {
      role: MessageRole.USER,
      content: userMessage,
    };

    const response = await this.provider.generateResponse([systemPrompt, userPrompt], {
      temperature: 0.3, // Baja temperatura para respuestas más deterministas
      maxTokens: 500,
    });

    try {
      return JSON.parse(response.content);
    } catch (error) {
      console.error('Error al parsear respuesta de intenciones:', error);
      return {
        intent: 'unknown',
        entities: {},
        confidence: 0.0,
      };
    }
  }

  /**
   * Genera una respuesta conversacional natural
   */
  async generateConversationalResponse(
    userMessage: string,
    context: {
      menuItems?: any[];
      cart?: any[];
      userName?: string;
    }
  ): Promise<string> {
    const systemPrompt: LLMMessage = {
      role: MessageRole.SYSTEM,
      content: `Eres un mesero virtual amigable y profesional de un restaurante.
Tu trabajo es ayudar a los clientes a:
- Consultar el menú y recomendar platos
- Agregar platos al carrito
- Responder preguntas sobre ingredientes, alérgenos y restricciones dietéticas
- Procesar órdenes

Contexto actual:
${context.menuItems ? `Menu disponible: ${JSON.stringify(context.menuItems, null, 2)}` : ''}
${context.cart ? `Carrito actual: ${JSON.stringify(context.cart, null, 2)}` : ''}
${context.userName ? `Nombre del cliente: ${context.userName}` : ''}

Sé amable, profesional y conciso. Usa emojis moderadamente para un tono amigable.`,
    };

    const userPrompt: LLMMessage = {
      role: MessageRole.USER,
      content: userMessage,
    };

    return this.generateChatResponse([systemPrompt, userPrompt], 0.8);
  }

  /**
   * Genera recomendaciones personalizadas
   */
  async generateRecommendations(
    preferences: {
      dietaryRestrictions?: string[];
      allergens?: string[];
      spicyPreference?: string;
      previousOrders?: string[];
    },
    availableItems: any[]
  ): Promise<string[]> {
    const systemPrompt: LLMMessage = {
      role: MessageRole.SYSTEM,
      content: `Eres un experto en recomendaciones gastronómicas.
Basándote en las preferencias del cliente y el menú disponible, recomienda 2-3 platos.

Preferencias del cliente:
${JSON.stringify(preferences, null, 2)}

Menú disponible:
${JSON.stringify(availableItems, null, 2)}

Responde SOLO con un array JSON de IDs de platos recomendados, sin texto adicional:
["item_id_1", "item_id_2", "item_id_3"]`,
    };

    const userPrompt: LLMMessage = {
      role: MessageRole.USER,
      content: 'Dame tus recomendaciones basadas en mis preferencias',
    };

    const response = await this.provider.generateResponse([systemPrompt, userPrompt], {
      temperature: 0.7,
      maxTokens: 300,
    });

    try {
      return JSON.parse(response.content);
    } catch (error) {
      console.error('Error al parsear recomendaciones:', error);
      return [];
    }
  }

  /**
   * Verifica si el proveedor actual está disponible
   */
  isProviderAvailable(): boolean {
    return this.provider.isAvailable();
  }

  /**
   * Lista todos los proveedores disponibles
   */
  static getAvailableProviders(): LLMProviderType[] {
    return LLMProviderFactory.getAvailableProviders();
  }
}
