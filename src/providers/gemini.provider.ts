import { GoogleGenAI } from '@google/genai';
import {
  ILLMProvider,
  LLMMessage,
  LLMOptions,
  LLMResponse,
  MessageRole,
} from '../interfaces/llm.interface';
import { config } from '../config/env.config';

/**
 * Adapter para Google Gemini
 * Implementa la interfaz ILLMProvider para usar modelos de Google (Gemini 2.5, etc)
 */
export class GeminiProvider implements ILLMProvider {
  private client: GoogleGenAI;
  private defaultModel: string;

  constructor(apiKey?: string, defaultModel: string = 'gemini-2.0-flash-exp') {
    const key = apiKey || config.gemini?.apiKey;
    
    if (!key) {
      throw new Error('Google Gemini API Key no configurada');
    }

    this.client = new GoogleGenAI({ apiKey: key });
    this.defaultModel = defaultModel;
  }

  /**
   * Convierte mensajes del formato genérico al formato de Gemini
   */
  private convertMessages(messages: LLMMessage[]): {
    systemInstruction?: string;
    contents: string;
  } {
    let systemInstruction: string | undefined;
    const userMessages: string[] = [];

    messages.forEach((msg) => {
      if (msg.role === MessageRole.SYSTEM) {
        systemInstruction = msg.content;
      } else if (msg.role === MessageRole.USER) {
        userMessages.push(`Usuario: ${msg.content}`);
      } else if (msg.role === MessageRole.ASSISTANT) {
        userMessages.push(`Asistente: ${msg.content}`);
      }
    });

    const contents = userMessages.join('\n');
    
    return { systemInstruction, contents };
  }

  /**
   * Genera una respuesta usando Gemini
   */
  async generateResponse(
    messages: LLMMessage[],
    options?: LLMOptions
  ): Promise<LLMResponse> {
    try {
      const modelName = options?.model || this.defaultModel;
      const { systemInstruction, contents } = this.convertMessages(messages);

      // Construir el prompt completo
      const fullPrompt = systemInstruction 
        ? `${systemInstruction}\n\n${contents}`
        : contents;

      const response = await this.client.models.generateContent({
        model: modelName,
        contents: fullPrompt,
        config: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens ?? 1000,
          topP: options?.topP ?? 1,
        },
      });

      const text = response.text || '';

      // Gemini no proporciona el uso de tokens de la misma manera
      // Estimamos basándonos en la longitud del texto
      const estimatedPromptTokens = Math.ceil(fullPrompt.length / 4);
      const estimatedCompletionTokens = Math.ceil(text.length / 4);

      return {
        content: text,
        model: modelName,
        usage: {
          promptTokens: estimatedPromptTokens,
          completionTokens: estimatedCompletionTokens,
          totalTokens: estimatedPromptTokens + estimatedCompletionTokens,
        },
        finishReason: 'stop',
      };
    } catch (error) {
      console.error('Error al llamar a Gemini:', error);
      throw new Error(`Error en Gemini Provider: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Genera una respuesta con streaming
   */
  async *generateStreamResponse(
    messages: LLMMessage[],
    options?: LLMOptions
  ): AsyncGenerator<string, void, unknown> {
    try {
      const modelName = options?.model || this.defaultModel;
      const { systemInstruction, contents } = this.convertMessages(messages);

      const fullPrompt = systemInstruction 
        ? `${systemInstruction}\n\n${contents}`
        : contents;

      const stream = await this.client.models.generateContentStream({
        model: modelName,
        contents: fullPrompt,
        config: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens ?? 1000,
          topP: options?.topP ?? 1,
        },
      });

      for await (const chunk of stream) {
        const text = chunk.text || '';
        if (text) {
          yield text;
        }
      }
    } catch (error) {
      console.error('Error en streaming de Gemini:', error);
      throw new Error(`Error en streaming de Gemini: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getProviderName(): string {
    return 'Google Gemini';
  }

  isAvailable(): boolean {
    return !!config.gemini?.apiKey;
  }
}
