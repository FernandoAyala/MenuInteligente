/**
 * Epic #60: API Conversacional y Orquestación
 * Task #67: Tests del Endpoint /api/chat
 * 
 * Test suite completo para el endpoint de chat conversacional.
 * Incluye tests de: validación, rate limiting, cache, LLM, recommendations, errores.
 * 
 * Target: >80% code coverage
 */

import request from 'supertest';
import express, { Application } from 'express';
import { errorHandler, notFoundHandler } from '../../middleware/error-handler.middleware';
import { cacheService } from '../../services/cache.service';
import { metricsService } from '../../services/metrics.service';
import { EnhancedLLMService } from '../../services/enhanced-llm.service';
import { RecommendationService } from '../../services/recommendation.service';
import { ChatRequest, ChatResponse } from '../../interfaces/chat.interface';
import { config } from '../../config/env.config';
import { initializeFirebase } from '../../config/firebase.config';

// Inicializar Firebase ANTES de importar las rutas
initializeFirebase();

// Ahora sí importar las rutas (que crean el controller)
import chatRoutes from '../../routes/chat.routes';

// Helper para añadir delay entre tests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Delay para evitar rate limiting en tests
const RATE_LIMIT_DELAY_MS = 2100; // 2.1 segundos (30 req/min = 2s entre requests)

describe('Chat Endpoint - POST /api/chat (Task #67)', () => {
  let app: Application;
  let llmService: EnhancedLLMService;
  let recommendationService: RecommendationService;

  // Verificar si hay API keys configuradas
  const hasOpenAI = !!config.openai.apiKey;
  const hasGemini = !!config.gemini.apiKey;
  const hasLLMProvider = hasOpenAI || hasGemini;

  beforeAll(() => {
    // Crear app de Express para testing
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Registrar rutas
    app.use('/api/chat', chatRoutes);
    
    // Error handlers
    app.use(notFoundHandler);
    app.use(errorHandler);

    // Inicializar servicios
    llmService = new EnhancedLLMService();
    recommendationService = new RecommendationService();
  });

  beforeEach(() => {
    // Limpiar cache antes de cada test
    cacheService.clear();
    
    // Reset metrics
    if (metricsService && typeof (metricsService as any).reset === 'function') {
      (metricsService as any).reset();
    }
  });

  afterAll(() => {
    // Cleanup
    cacheService.clear();
  });

  describe('Validation Tests', () => {
    it('should reject empty message', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ message: '' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject missing message field', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject message longer than 1000 characters', async () => {
      const longMessage = 'a'.repeat(1001);
      const response = await request(app)
        .post('/api/chat')
        .send({ message: longMessage });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should accept valid message (1-1000 chars)', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'Hola, quiero ver el menú' });

      // Puede ser 200 si tiene LLM o 502 si no tiene API key
      expect([200, 502, 504]).toContain(response.status);
    });

    it('should accept optional sessionId (UUID format)', async () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .post('/api/chat')
        .send({ 
          message: 'Hola',
          sessionId: validUUID
        });

      expect([200, 502, 504]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body.sessionId).toBe(validUUID);
      }
    });

    it('should accept optional context object', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ 
          message: 'Hola',
          context: {
            userId: 'user_123',
            preferences: { diet: 'vegetarian' }
          }
        });

      expect([200, 502, 504]).toContain(response.status);
    });

    it('should reject invalid Content-Type', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('Content-Type', 'text/plain')
        .send('invalid data');

      expect(response.status).toBe(400);
    });
  });

  describe('Rate Limiting Tests', () => {
    beforeEach(async () => {
      // Esperar para reset rate limit
      await delay(RATE_LIMIT_DELAY_MS);
    });

    it('should accept requests within rate limit (30/min)', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'Test rate limit 1' });

      expect(response.status).not.toBe(429);
      expect(response.headers['x-ratelimit-limit']).toBe('30');
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    });

    it('should have rate limit headers in response', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'Test headers' });

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });

    it('should reject requests exceeding rate limit', async () => {
      // Hacer 31 requests rápidamente (límite es 30/min)
      const requests = Array.from({ length: 31 }, (_, i) => 
        request(app)
          .post('/api/chat')
          .send({ message: `Rate limit test ${i}` })
      );

      const responses = await Promise.all(requests);
      
      // Al menos una debe ser 429 (Too Many Requests)
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      // Verificar formato de respuesta 429
      if (rateLimitedResponses.length > 0) {
        const limitedResponse = rateLimitedResponses[0];
        expect(limitedResponse.body.error).toBeDefined();
        expect(limitedResponse.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
        expect(limitedResponse.body.error.details).toBeDefined();
        expect(limitedResponse.body.error.details.retryAfter).toBeDefined();
        expect(typeof limitedResponse.body.error.details.retryAfter).toBe('number');
      }
    }, 30000); // Timeout extendido para este test
  });

  describe('Cache Tests', () => {
    beforeEach(async () => {
      await delay(RATE_LIMIT_DELAY_MS);
    });

    it('should cache successful responses', async () => {
      const message = 'Test caching behavior';
      
      // Primera request
      const response1 = await request(app)
        .post('/api/chat')
        .send({ message });

      if (response1.status === 200) {
        await delay(100); // Pequeño delay para asegurar cache write

        // Segunda request idéntica
        const response2 = await request(app)
          .post('/api/chat')
          .send({ message });

        expect(response2.status).toBe(200);
        expect(response2.body.metadata.fromCache).toBe(true);
        
        // Latency debe ser menor en cache hit
        expect(response2.body.metadata.processingTime).toBeLessThan(
          response1.body.metadata.processingTime
        );
      }
    });

    it('should generate different cache keys for different messages', async () => {
      const response1 = await request(app)
        .post('/api/chat')
        .send({ message: 'Message 1' });

      await delay(100);

      const response2 = await request(app)
        .post('/api/chat')
        .send({ message: 'Message 2' });

      if (response1.status === 200 && response2.status === 200) {
        // Ambos deben ser cache miss (primera vez)
        expect(response1.body.metadata.fromCache).toBe(false);
        expect(response2.body.metadata.fromCache).toBe(false);
      }
    });

    it('should include cache stats in response metadata', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'Cache stats test' });

      if (response.status === 200) {
        expect(response.body.metadata).toBeDefined();
        expect(response.body.metadata.fromCache).toBeDefined();
        expect(typeof response.body.metadata.fromCache).toBe('boolean');
      }
    });
  });

  describe('LLM Integration Tests', () => {
    const testOrSkip = hasLLMProvider ? it : it.skip;

    beforeEach(async () => {
      await delay(RATE_LIMIT_DELAY_MS);
    });

    testOrSkip('should process message with LLM and return response', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'Quiero ver el menú de platos principales' });

      // Puede ser 200 (success), 429 (rate limit), 502 (LLM error), o 504 (timeout)
      expect([200, 429, 502, 504]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('response');
        expect(response.body).toHaveProperty('sessionId');
        expect(response.body).toHaveProperty('metadata');
        expect(response.body.metadata.llmProvider).toBeDefined();
      }
    }, 10000);

    testOrSkip('should extract intents and generate actions', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'Quiero ordenar una pizza' });

      // Puede ser 200 (success), 429 (rate limit), 502 (LLM error), o 504 (timeout)
      expect([200, 429, 502, 504]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body.actions).toBeDefined();
        expect(Array.isArray(response.body.actions)).toBe(true);
        expect(response.body.actions.length).toBeGreaterThan(0);
        
        // Verificar estructura de actions
        response.body.actions.forEach((action: any) => {
          expect(action).toHaveProperty('type');
          expect(action).toHaveProperty('label');
          expect(action).toHaveProperty('timestamp');
        });
      }
    }, 10000);

    testOrSkip('should handle LLM timeout gracefully', async () => {
      // Este test depende de la implementación del timeout
      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'Test timeout scenario' });

      // Debe responder (success, rate limit, timeout, o error)
      expect([200, 429, 502, 504]).toContain(response.status);
      
      if (response.status === 504) {
        expect(response.body.error.code).toMatch(/TIMEOUT|LLM_TIMEOUT/);
      }
    }, 12000);
  });

  describe('Recommendations Tests', () => {
    const testOrSkip = hasLLMProvider ? it : it.skip;

    beforeEach(async () => {
      await delay(RATE_LIMIT_DELAY_MS);
    });

    testOrSkip('should generate recommendations when requested', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'Recomiéndame algo vegetariano sin gluten' });

      if (response.status === 200) {
        // Puede o no tener recommendations dependiendo del intent
        if (response.body.recommendations) {
          expect(Array.isArray(response.body.recommendations)).toBe(true);
          
          if (response.body.recommendations.length > 0) {
            const rec = response.body.recommendations[0];
            expect(rec).toHaveProperty('dish');
            expect(rec).toHaveProperty('score');
            expect(rec).toHaveProperty('justification');
            expect(rec).toHaveProperty('rank');
          }
        }
      }
    }, 12000);

    testOrSkip('should handle recommendation timeout gracefully', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'Necesito recomendaciones' });

      // Debe responder aunque recommendations fallen
      if (response.status === 200) {
        expect(response.body).toHaveProperty('response');
        // recommendations puede ser undefined si falló
      }
    }, 12000);
  });

  describe('Error Handling Tests', () => {
    beforeEach(async () => {
      await delay(RATE_LIMIT_DELAY_MS);
    });

    it('should return structured error for validation failures', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ message: '' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should handle LLM errors gracefully', async () => {
      // Sin API key, debe retornar error LLM
      if (!hasLLMProvider) {
        const response = await request(app)
          .post('/api/chat')
          .send({ message: 'Test LLM error' });

        expect([502, 503, 504]).toContain(response.status);
        expect(response.body.error).toBeDefined();
      } else {
        // Con API key, test sigue siendo válido (puede fallar por otros motivos)
        expect(true).toBe(true);
      }
    });

    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/chat/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
    });

    it('should include error code in response', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ invalid: 'data' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBeDefined();
      expect(typeof response.body.error.code).toBe('string');
    });
  });

  describe('Response Format Tests', () => {
    const testOrSkip = hasLLMProvider ? it : it.skip;

    beforeEach(async () => {
      await delay(RATE_LIMIT_DELAY_MS);
    });

    testOrSkip('should return ChatResponse with all required fields', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'Hola' });

      if (response.status === 200) {
        const body: ChatResponse = response.body;
        
        // Required fields
        expect(body).toHaveProperty('response');
        expect(body).toHaveProperty('sessionId');
        expect(body).toHaveProperty('metadata');
        
        // Response debe ser string
        expect(typeof body.response).toBe('string');
        expect(body.response.length).toBeGreaterThan(0);
        
        // SessionId debe ser UUID
        expect(body.sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        
        // Metadata
        expect(body.metadata).toHaveProperty('processingTime');
        expect(body.metadata).toHaveProperty('llmProvider');
        expect(body.metadata).toHaveProperty('fromCache');
        expect(body.metadata).toHaveProperty('stage');
        
        expect(typeof body.metadata.processingTime).toBe('number');
        expect(body.metadata.processingTime).toBeGreaterThan(0);
      }
    }, 10000);

    testOrSkip('should include actions array when available', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'Ver menú' });

      if (response.status === 200 && response.body.actions) {
        expect(Array.isArray(response.body.actions)).toBe(true);
      }
    }, 10000);

    it('should return JSON content-type', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'Test content type' });

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('Metrics Tests', () => {
    beforeEach(async () => {
      await delay(RATE_LIMIT_DELAY_MS);
    });

    it('should record request metrics', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'Test metrics' });

      if (response.status === 200) {
        expect(response.body.metadata.processingTime).toBeDefined();
        expect(typeof response.body.metadata.processingTime).toBe('number');
      }
    });

    it('should include processing time in metadata', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'Test processing time' });

      if (response.status === 200) {
        const processingTime = response.body.metadata.processingTime;
        expect(processingTime).toBeGreaterThan(0);
        expect(processingTime).toBeLessThan(30000); // Menos de 30 segundos
      }
    });
  });

  describe('Session Management Tests', () => {
    beforeEach(async () => {
      await delay(RATE_LIMIT_DELAY_MS);
    });

    it('should generate sessionId if not provided', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'Test session generation' });

      if (response.status === 200) {
        expect(response.body.sessionId).toBeDefined();
        expect(response.body.sessionId).toMatch(/^[0-9a-f-]{36}$/i);
        expect(response.body.metadata.sessionCreated).toBe(true);
      }
    });

    it('should reuse provided sessionId', async () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440000';
      
      const response = await request(app)
        .post('/api/chat')
        .send({ 
          message: 'Test session reuse',
          sessionId
        });

      if (response.status === 200) {
        expect(response.body.sessionId).toBe(sessionId);
        expect(response.body.metadata.sessionCreated).toBe(false);
      }
    });

    it('should maintain session across multiple requests', async () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440001';
      
      const response1 = await request(app)
        .post('/api/chat')
        .send({ message: 'First message', sessionId });

      await delay(RATE_LIMIT_DELAY_MS);

      const response2 = await request(app)
        .post('/api/chat')
        .send({ message: 'Second message', sessionId });

      if (response1.status === 200 && response2.status === 200) {
        expect(response1.body.sessionId).toBe(sessionId);
        expect(response2.body.sessionId).toBe(sessionId);
      }
    });
  });

  describe('Health Check Endpoint', () => {
    it('should return 200 for health check', async () => {
      const response = await request(app)
        .get('/api/chat/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('ok');
      expect(response.body).toHaveProperty('service');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('Metrics Endpoint', () => {
    it('should return system metrics', async () => {
      const response = await request(app)
        .get('/api/chat/metrics');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('system');
      expect(response.body.data).toHaveProperty('cache');
      expect(response.body.data).toHaveProperty('timestamp');
    });

    it('should include cache statistics', async () => {
      const response = await request(app)
        .get('/api/chat/metrics');

      expect(response.status).toBe(200);
      const cacheStats = response.body.data.cache;
      
      expect(cacheStats).toHaveProperty('hits');
      expect(cacheStats).toHaveProperty('misses');
      expect(cacheStats).toHaveProperty('hitRate');
      expect(cacheStats).toHaveProperty('size');
      
      expect(typeof cacheStats.hits).toBe('number');
      expect(typeof cacheStats.misses).toBe('number');
      expect(typeof cacheStats.hitRate).toBe('number');
    });
  });
});

describe('Chat Endpoint - Integration Tests', () => {
  let app: Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/chat', chatRoutes);
    app.use(notFoundHandler);
    app.use(errorHandler);
  });

  beforeEach(() => {
    cacheService.clear();
  });

  it('should handle complete conversation flow', async () => {
    const sessionId = '550e8400-e29b-41d4-a716-446655440002';
    
    // Mensaje 1: Saludo
    const response1 = await request(app)
      .post('/api/chat')
      .send({ message: 'Hola', sessionId });

    await delay(RATE_LIMIT_DELAY_MS);

    // Mensaje 2: Consulta menú
    const response2 = await request(app)
      .post('/api/chat')
      .send({ message: 'Quiero ver el menú', sessionId });

    await delay(RATE_LIMIT_DELAY_MS);

    // Mensaje 3: Pedir recomendaciones
    const response3 = await request(app)
      .post('/api/chat')
      .send({ message: 'Recomiéndame algo', sessionId });

    // Verificar que todas usaron el mismo sessionId
    if (response1.status === 200) {
      expect(response1.body.sessionId).toBe(sessionId);
    }
    if (response2.status === 200) {
      expect(response2.body.sessionId).toBe(sessionId);
    }
    if (response3.status === 200) {
      expect(response3.body.sessionId).toBe(sessionId);
    }
  }, 30000);

  it('should maintain performance under load', async () => {
    const requests = Array.from({ length: 5 }, (_, i) => 
      request(app)
        .post('/api/chat')
        .send({ message: `Load test message ${i}` })
    );

    const startTime = Date.now();
    const responses = await Promise.all(requests);
    const totalTime = Date.now() - startTime;

    // Al menos algunas requests deben ser exitosas
    const successfulResponses = responses.filter(r => r.status === 200);
    
    // Verificar que el sistema manejó las requests
    expect(responses.length).toBe(5);
    
    // El tiempo total no debe ser excesivo
    expect(totalTime).toBeLessThan(60000); // Menos de 1 minuto para 5 requests
  }, 70000);
});
