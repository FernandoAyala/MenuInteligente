import { LLMProviderFactory } from '../../providers/llm.factory';
import { LLMProviderType, ILLMProvider, LLMMessage, MessageRole, LLMResponse } from '../../interfaces/llm.interface';

/**
 * Mock Provider para testing
 */
class MockLLMProvider implements ILLMProvider {
  async generateResponse(messages: LLMMessage[]): Promise<LLMResponse> {
    return {
      content: `Mock response to: ${messages[messages.length - 1].content}`,
      model: 'mock-model',
      usage: {
        promptTokens: 10,
        completionTokens: 10,
        totalTokens: 20,
      },
      finishReason: 'stop',
    };
  }

  async *generateStreamResponse(
    _messages: LLMMessage[]
  ): AsyncGenerator<string, void, unknown> {
    yield 'Mock ';
    yield 'stream ';
    yield 'response';
  }

  getProviderName(): string {
    return 'Mock Provider';
  }

  isAvailable(): boolean {
    return true;
  }
}

describe('LLMProviderFactory', () => {
  beforeEach(() => {
    // Limpiar instancias antes de cada test
    LLMProviderFactory.clearInstances();
  });

  describe('getProvider', () => {
    it('should create OpenAI provider instance', () => {
      const provider = LLMProviderFactory.getProvider(LLMProviderType.OPENAI);
      expect(provider).toBeDefined();
      expect(provider.getProviderName()).toBe('OpenAI');
    });

    it('should create Gemini provider instance', () => {
      const provider = LLMProviderFactory.getProvider(LLMProviderType.GEMINI);
      expect(provider).toBeDefined();
      expect(provider.getProviderName()).toBe('Google Gemini');
    });

    it('should return same instance on multiple calls (singleton)', () => {
      const provider1 = LLMProviderFactory.getProvider(LLMProviderType.OPENAI);
      const provider2 = LLMProviderFactory.getProvider(LLMProviderType.OPENAI);
      expect(provider1).toBe(provider2);
    });

    it('should throw error for unsupported provider', () => {
      expect(() => {
        LLMProviderFactory.getProvider('unsupported' as LLMProviderType);
      }).toThrow();
    });
  });

  describe('getDefaultProvider', () => {
    it('should return a provider instance', () => {
      const provider = LLMProviderFactory.getDefaultProvider();
      expect(provider).toBeDefined();
      expect(provider.getProviderName()).toBeTruthy();
    });
  });

  describe('getAvailableProviders', () => {
    it('should return array of available providers', () => {
      const available = LLMProviderFactory.getAvailableProviders();
      expect(Array.isArray(available)).toBe(true);
    });

    it('should only include providers with API keys configured', () => {
      const available = LLMProviderFactory.getAvailableProviders();
      available.forEach((providerType) => {
        const provider = LLMProviderFactory.getProvider(providerType);
        expect(provider.isAvailable()).toBe(true);
      });
    });
  });

  describe('clearInstances', () => {
    it('should clear all cached instances', () => {
      const provider1 = LLMProviderFactory.getProvider(LLMProviderType.OPENAI);
      LLMProviderFactory.clearInstances();
      const provider2 = LLMProviderFactory.getProvider(LLMProviderType.OPENAI);
      
      // Deberían ser instancias diferentes después de limpiar
      expect(provider1).not.toBe(provider2);
    });
  });
});

describe('ILLMProvider Interface', () => {
  let mockProvider: MockLLMProvider;

  beforeEach(() => {
    mockProvider = new MockLLMProvider();
  });

  describe('generateResponse', () => {
    it('should generate response from messages', async () => {
      const messages: LLMMessage[] = [
        { role: MessageRole.SYSTEM, content: 'You are a helpful assistant' },
        { role: MessageRole.USER, content: 'Hello!' },
      ];

      const response = await mockProvider.generateResponse(messages);

      expect(response).toBeDefined();
      expect(response.content).toBeTruthy();
      expect(response.model).toBeTruthy();
      expect(response.usage).toBeDefined();
      expect(response.usage.totalTokens).toBeGreaterThan(0);
    });

    it('should handle empty messages array', async () => {
      const messages: LLMMessage[] = [];
      
      await expect(mockProvider.generateResponse(messages)).resolves.toBeDefined();
    });
  });

  describe('generateStreamResponse', () => {
    it('should generate stream of text chunks', async () => {
      const messages: LLMMessage[] = [
        { role: MessageRole.USER, content: 'Test' },
      ];

      const chunks: string[] = [];
      if (mockProvider.generateStreamResponse) {
        for await (const chunk of mockProvider.generateStreamResponse(messages)) {
          chunks.push(chunk);
        }
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.join('')).toBeTruthy();
    });
  });

  describe('getProviderName', () => {
    it('should return provider name', () => {
      const name = mockProvider.getProviderName();
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    });
  });

  describe('isAvailable', () => {
    it('should return boolean availability status', () => {
      const available = mockProvider.isAvailable();
      expect(typeof available).toBe('boolean');
    });
  });
});

describe('Provider Integration Tests', () => {
  // Estos tests solo se ejecutan si hay API keys configuradas
  const available = LLMProviderFactory.getAvailableProviders();
  const hasOpenAI = available.includes(LLMProviderType.OPENAI);
  const hasGemini = available.includes(LLMProviderType.GEMINI);

  describe('OpenAI Provider', () => {
    const testOrSkip = hasOpenAI ? it : it.skip;

    testOrSkip(
      'should generate real response from OpenAI',
      async () => {
        const provider = LLMProviderFactory.getProvider(LLMProviderType.OPENAI);
        const messages: LLMMessage[] = [
          { role: MessageRole.USER, content: 'Say "test" and nothing else' },
        ];

        const response = await provider.generateResponse(messages, {
          temperature: 0,
          maxTokens: 10,
        });

        expect(response.content).toBeTruthy();
        expect(response.model).toContain('gpt');
        expect(response.usage.totalTokens).toBeGreaterThan(0);
      },
      30000 // 30s timeout
    );
  });

  describe('Gemini Provider', () => {
    const testOrSkip = hasGemini ? it : it.skip;

    testOrSkip(
      'should generate real response from Gemini',
      async () => {
        const provider = LLMProviderFactory.getProvider(LLMProviderType.GEMINI);
        const messages: LLMMessage[] = [
          { role: MessageRole.USER, content: 'Say "test" and nothing else' },
        ];

        const response = await provider.generateResponse(messages, {
          temperature: 0,
          maxTokens: 10,
        });

        expect(response.content).toBeTruthy();
        expect(response.model).toContain('gemini');
        expect(response.usage.totalTokens).toBeGreaterThan(0);
      },
      30000 // 30s timeout
    );
  });
});
