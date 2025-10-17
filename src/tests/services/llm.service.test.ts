import { LLMService } from '../../services/llm.service';
import { LLMProviderType, MessageRole } from '../../interfaces/llm.interface';

describe('LLMService', () => {
  describe('Constructor', () => {
    it('should create service with default provider', () => {
      const service = new LLMService();
      expect(service).toBeDefined();
      expect(service.getCurrentProvider()).toBeTruthy();
    });

    it('should create service with specific provider', () => {
      const service = new LLMService(LLMProviderType.OPENAI);
      expect(service.getCurrentProvider()).toBe('OpenAI');
    });
  });

  describe('setProvider', () => {
    it('should change provider dynamically', () => {
      const service = new LLMService(LLMProviderType.OPENAI);
      expect(service.getCurrentProvider()).toBe('OpenAI');

      service.setProvider(LLMProviderType.GEMINI);
      expect(service.getCurrentProvider()).toBe('Google Gemini');
    });
  });

  describe('getCurrentProvider', () => {
    it('should return current provider name', () => {
      const service = new LLMService();
      const name = service.getCurrentProvider();
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    });
  });

  describe('isProviderAvailable', () => {
    it('should check if provider is available', () => {
      const service = new LLMService();
      const available = service.isProviderAvailable();
      expect(typeof available).toBe('boolean');
    });
  });

  describe('getAvailableProviders', () => {
    it('should return array of available providers', () => {
      const providers = LLMService.getAvailableProviders();
      expect(Array.isArray(providers)).toBe(true);
    });
  });

  // Tests que requieren API key configurada
  describe('Integration Tests', () => {
    const hasAPIKey = LLMService.getAvailableProviders().length > 0;

    // Usar skip condicional de Jest
    const testOrSkip = hasAPIKey ? it : it.skip;

    testOrSkip(
      'should generate chat response',
      async () => {
        const service = new LLMService();
        const messages = [
          {
            role: MessageRole.USER,
            content: 'Say "test" and nothing else',
          },
        ];

        const response = await service.generateChatResponse(messages, 0);
        expect(response).toBeTruthy();
        expect(typeof response).toBe('string');
      },
      30000
    );

    testOrSkip(
      'should extract intents from user message',
      async () => {
        const service = new LLMService();
        const result = await service.extractIntents(
          'Quiero agregar dos pizzas al carrito'
        );

        expect(result).toBeDefined();
        expect(result.intent).toBeTruthy();
        expect(result.entities).toBeDefined();
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      },
      30000
    );

    testOrSkip(
      'should generate conversational response with context',
      async () => {
        const service = new LLMService();
        const response = await service.generateConversationalResponse(
          '¿Qué tienen de postre?',
          {
            menuItems: [
              { name: 'Tarta de Manzana', category: 'dessert' },
              { name: 'Helado de Chocolate', category: 'dessert' },
            ],
          }
        );

        expect(response).toBeTruthy();
        expect(typeof response).toBe('string');
        expect(response.length).toBeGreaterThan(0);
      },
      30000
    );

    testOrSkip(
      'should generate recommendations',
      async () => {
        const service = new LLMService();
        const recommendations = await service.generateRecommendations(
          {
            dietaryRestrictions: ['vegetarian'],
          },
          [
            { id: '1', name: 'Pizza', vegetarian: false },
            { id: '2', name: 'Ensalada', vegetarian: true },
            { id: '3', name: 'Pasta', vegetarian: true },
          ]
        );

        expect(Array.isArray(recommendations)).toBe(true);
      },
      30000
    );
  });
});
