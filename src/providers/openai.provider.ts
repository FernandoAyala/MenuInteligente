import OpenAI from 'openai';
import {
  ILLMProvider,
  LLMMessage,
  LLMOptions,
  LLMResponse,
  MessageRole,
} from '../interfaces/llm.interface';
import { config } from '../config/env.config';

/**
 * Adapter para OpenAI
 * Implementa la interfaz ILLMProvider para usar modelos de OpenAI (GPT-4, GPT-3.5, etc)
 */
export class OpenAIProvider implements ILLMProvider {
  private client: OpenAI;
  private defaultModel: string;

  constructor(apiKey?: string, defaultModel: string = 'gpt-4.1-nano-2025-04-14') {
    const key = apiKey || config.openai.apiKey;
    
    if (!key) {
      throw new Error('OpenAI API Key no configurada');
    }

    this.client = new OpenAI({
      apiKey: key,
    });
    this.defaultModel = defaultModel;
  }

  /**
   * Convierte el rol genérico al formato de OpenAI
   */
  private mapRole(role: MessageRole): 'system' | 'user' | 'assistant' {
    const roleMap = {
      [MessageRole.SYSTEM]: 'system' as const,
      [MessageRole.USER]: 'user' as const,
      [MessageRole.ASSISTANT]: 'assistant' as const,
    };
    return roleMap[role];
  }

  /**
   * Genera una respuesta usando OpenAI
   */
  async generateResponse(
    messages: LLMMessage[],
    options?: LLMOptions
  ): Promise<LLMResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: options?.model || this.defaultModel,
        messages: messages.map((msg) => ({
          role: this.mapRole(msg.role),
          content: msg.content,
        })),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1000,
        top_p: options?.topP ?? 1,
      });

      const choice = response.choices[0];
      
      return {
        content: choice.message?.content || '',
        model: response.model,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        finishReason: choice.finish_reason || 'unknown',
      };
    } catch (error) {
      console.error('Error al llamar a OpenAI:', error);
      throw new Error(`Error en OpenAI Provider: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      const stream = await this.client.chat.completions.create({
        model: options?.model || this.defaultModel,
        messages: messages.map((msg) => ({
          role: this.mapRole(msg.role),
          content: msg.content,
        })),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1000,
        top_p: options?.topP ?? 1,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      console.error('Error en streaming de OpenAI:', error);
      throw new Error(`Error en streaming de OpenAI: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getProviderName(): string {
    return 'OpenAI';
  }

  isAvailable(): boolean {
    return !!config.openai.apiKey;
  }
}
