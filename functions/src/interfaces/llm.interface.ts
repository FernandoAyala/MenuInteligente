/**
 * Roles de los mensajes en una conversación
 */
export enum MessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
}

/**
 * Mensaje genérico para el LLM
 */
export interface LLMMessage {
  role: MessageRole;
  content: string;
}

/**
 * Opciones de configuración para la llamada al LLM
 */
export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  model?: string;
}

/**
 * Respuesta genérica del LLM
 */
export interface LLMResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
}

/**
 * Interfaz para el proveedor de LLM
 * Implementa el patrón Adapter para abstraer diferentes proveedores
 */
export interface ILLMProvider {
  /**
   * Genera una respuesta del LLM basada en los mensajes
   */
  generateResponse(
    messages: LLMMessage[],
    options?: LLMOptions
  ): Promise<LLMResponse>;

  /**
   * Genera una respuesta con streaming (opcional)
   */
  generateStreamResponse?(
    messages: LLMMessage[],
    options?: LLMOptions
  ): AsyncGenerator<string, void, unknown>;

  /**
   * Nombre del proveedor
   */
  getProviderName(): string;

  /**
   * Verificar si el proveedor está disponible/configurado
   */
  isAvailable(): boolean;
}

/**
 * Tipos de proveedores soportados
 */
export enum LLMProviderType {
  OPENAI = 'openai',
  GEMINI = 'gemini',
}
