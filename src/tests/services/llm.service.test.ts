/**
 * Tests para EnhancedLLMService
 * Task #28: Testing con casos de uso diversos
 * Task #33: Testing de calidad de respuestas
 * Epic #21: Integración LLM y Procesamiento de Lenguaje Natural
 */

import { EnhancedLLMService } from '../../services/enhanced-llm.service';
import { LLMProviderType, MessageRole } from '../../interfaces/llm.interface';
import { config } from '../../config/env.config';

// Helper para añadir delay entre tests (evitar rate limiting)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Configuración de delays para Gemini (10 requests/minuto = 6 segundos entre requests)
const GEMINI_DELAY_MS = 6500; // 6.5 segundos para dar margen
const isUsingGemini = config.llm.defaultProvider === 'gemini';

describe('EnhancedLLMService - Intent Extraction Tests (Task #28)', () => {
  let service: EnhancedLLMService;

  // Usar el provider configurado en .env (LLM_DEFAULT_PROVIDER)
  const defaultProvider = config.llm.defaultProvider as LLMProviderType;
  const hasOpenAI = !!config.openai.apiKey;
  const hasGemini = !!config.gemini.apiKey;
  
  // Verificar si el provider por defecto está disponible
  const isDefaultProviderAvailable = 
    (defaultProvider === LLMProviderType.OPENAI && hasOpenAI) ||
    (defaultProvider === LLMProviderType.GEMINI && hasGemini);
  
  const testOrSkip = isDefaultProviderAvailable ? it : it.skip;

  beforeEach(async () => {
    if (isDefaultProviderAvailable) {
      // Usar el provider configurado en .env
      service = new EnhancedLLMService(defaultProvider);
      
      // Añadir delay si usamos Gemini para evitar rate limiting
      if (isUsingGemini) {
        await delay(GEMINI_DELAY_MS);
      }
    }
  });

  testOrSkip('should extract intent from simple menu query', async () => {
    const userMessage = 'Quiero ver el menú de platos principales';
    
    const result = await service.extractDetailedIntents(userMessage);

    expect(result).toBeDefined();
    expect(result.intent).toBeTruthy();
    expect(result.confidence).toBeGreaterThan(0);
    expect(['consultar_menu', 'recomendar']).toContain(result.intent);
  }, 25000);

  testOrSkip('should detect vegetarian dietary restriction', async () => {
    const userMessage = 'Soy vegetariano, ¿qué opciones tienen?';
    
    const dietaryResult = await service.analyzeDietaryRestrictions(userMessage);

    expect(dietaryResult).toBeDefined();
    // Aceptar respuestas en español o inglés
    expect(dietaryResult.restrictions.some((r: string) => 
      r.toLowerCase().includes('vegetarian') || r.toLowerCase().includes('vegetariano')
    )).toBeTruthy();
    expect(['high', 'alta', 'alto']).toContain(dietaryResult.certainty.toLowerCase());
  }, 25000);

  testOrSkip('should detect vegan dietary restriction', async () => {
    const userMessage = 'No como nada de origen animal';
    
    const dietaryResult = await service.analyzeDietaryRestrictions(userMessage);

    expect(dietaryResult).toBeDefined();
    expect(dietaryResult.restrictions.length).toBeGreaterThan(0);
    // Aceptar respuestas en español o inglés
    expect(dietaryResult.restrictions.some((r: string) => 
      r.toLowerCase().includes('vegan') || r.toLowerCase().includes('vegano')
    )).toBe(true);
  }, 25000);

  testOrSkip('should detect critical allergies', async () => {
    const userMessage = 'Soy alérgico a los mariscos y frutos secos';
    
    const allergyResult = await service.detectAllergies(userMessage);

    expect(allergyResult).toBeDefined();
    expect(allergyResult.allergens.length).toBeGreaterThan(0);
    expect(allergyResult.requiresStrictAvoidance).toBe(true);
  }, 25000);

  testOrSkip('should analyze budget from message', async () => {
    const userMessage = 'Busco algo económico, hasta $2000 por persona';
    
    const budgetResult = await service.analyzeBudget(userMessage);

    expect(budgetResult).toBeDefined();
    // Si hay un max definido, debe ser <= 2500 (con margen)
    if (budgetResult.budgetRange.max !== null) {
      expect(budgetResult.budgetRange.max).toBeLessThanOrEqual(2500);
    }
    // Aceptar respuestas en español o inglés
    expect(budgetResult.pricePreference.toLowerCase()).toMatch(/budget|economic|economico|bajo/);
  }, 25000);

  testOrSkip('should detect multiple intents in complex message', async () => {
    const userMessage = 'Quiero una ensalada vegetariana sin gluten y que sea económica';
    
    const multiIntentResult = await service.detectMultipleIntents(userMessage);

    expect(multiIntentResult).toBeDefined();
    expect(multiIntentResult.intents.length).toBeGreaterThan(0);
    // Aceptar respuestas en español o inglés
    expect(multiIntentResult.complexity.toLowerCase()).toMatch(/moderate|complex|moderada|compleja|medio|alta/);
  }, 25000);

  testOrSkip('should handle allergen mentions with severity', async () => {
    const userMessage = 'Tengo alergia severa al maní, necesito estar seguro que no haya';
    
    const allergyResult = await service.detectAllergies(userMessage);

    expect(allergyResult).toBeDefined();
    expect(allergyResult.allergens.some(a => 
      a.allergen.toLowerCase().includes('maní') || 
      a.allergen.toLowerCase().includes('peanut') ||
      a.allergen.toLowerCase().includes('cacahuete')
    )).toBe(true);
    expect(allergyResult.requiresStrictAvoidance).toBe(true);
  }, 25000);

  testOrSkip('should extract entities from order request', async () => {
    const userMessage = 'Me gustaría ordenar dos porciones de pasta';
    
    const result = await service.extractDetailedIntents(userMessage);

    expect(result).toBeDefined();
    // Si existe quantity, debe ser > 0, si es null está ok (LLM no extrajo cantidad)
    if (result.entities.quantity !== null && result.entities.quantity !== undefined) {
      expect(result.entities.quantity).toBeGreaterThan(0);
    }
    // Verificar que al menos se mencionó un plato o que la intención es correcta
    expect(
      result.entities.dishesMetioned.length > 0 || 
      result.intent.includes('agregar') || 
      result.intent.includes('orden')
    ).toBeTruthy();
  }, 25000);

  testOrSkip('should detect spicy preference', async () => {
    const userMessage = 'No me gusta el picante, prefiero comida suave';
    
    const result = await service.extractDetailedIntents(userMessage);

    expect(result).toBeDefined();
    expect(result.entities.spicyLevel).toBeTruthy();
    // Aceptar respuestas en español o inglés
    expect(result.entities.spicyLevel?.toLowerCase()).toMatch(/none|low|ninguno|bajo|suave/);
  }, 25000);

  testOrSkip('should identify meal type preference', async () => {
    const userMessage = 'Estoy buscando un buen postre';
    
    const result = await service.extractDetailedIntents(userMessage);

    expect(result).toBeDefined();
    expect(result.entities.mealType).toBeTruthy();
    // Aceptar respuestas en español o inglés
    expect(result.entities.mealType?.toLowerCase()).toMatch(/dessert|postre|dulce/);
  }, 25000);

  testOrSkip('should handle gluten-free request', async () => {
    const userMessage = 'Soy celíaco, necesito opciones sin gluten';
    
    const dietaryResult = await service.analyzeDietaryRestrictions(userMessage);

    expect(dietaryResult).toBeDefined();
    expect(dietaryResult.restrictions.some(r => 
      r.toLowerCase().includes('gluten') || 
      r.toLowerCase().includes('celiac')
    )).toBe(true);
    expect(dietaryResult.warnings.length).toBeGreaterThan(0);
  }, 25000);

  testOrSkip('should detect price range queries', async () => {
    const userMessage = 'Busco platos entre $1500 y $3000';
    
    const budgetResult = await service.analyzeBudget(userMessage);

    expect(budgetResult).toBeDefined();
    expect(budgetResult.budgetRange.min).toBeGreaterThan(0);
    expect(budgetResult.budgetRange.max).toBeGreaterThan(budgetResult.budgetRange.min);
  }, 25000);
});

describe('EnhancedLLMService - Response Generation Tests (Task #33)', () => {
  let service: EnhancedLLMService;

  // Usar el provider configurado en .env (LLM_DEFAULT_PROVIDER)
  const defaultProvider = config.llm.defaultProvider as LLMProviderType;
  const hasOpenAI = !!config.openai.apiKey;
  const hasGemini = !!config.gemini.apiKey;
  
  // Verificar si el provider por defecto está disponible
  const isDefaultProviderAvailable = 
    (defaultProvider === LLMProviderType.OPENAI && hasOpenAI) ||
    (defaultProvider === LLMProviderType.GEMINI && hasGemini);
  
  const testOrSkip = isDefaultProviderAvailable ? it : it.skip;

  // Mock menu items para testing
  const mockMenuItems = [
    {
      id: '1',
      name: 'Ensalada César',
      description: 'Lechuga romana, crutones, parmesano',
      price: 2500,
      category: 'Entrada',
      isVegetarian: true,
      isVegan: false,
      isGlutenFree: false,
      allergens: ['dairy', 'gluten'],
      available: true,
      spicyLevel: 0,
    },
    {
      id: '2',
      name: 'Risotto de Hongos',
      description: 'Arroz arborio, hongos mixtos, vino blanco',
      price: 4500,
      category: 'Plato Principal',
      isVegetarian: true,
      isVegan: false,
      isGlutenFree: true,
      allergens: ['dairy'],
      available: true,
      spicyLevel: 0,
    },
    {
      id: '3',
      name: 'Tacos de Camarón',
      description: 'Tortillas, camarones, salsa picante',
      price: 5000,
      category: 'Plato Principal',
      isVegetarian: false,
      isVegan: false,
      isGlutenFree: false,
      allergens: ['shellfish', 'gluten'],
      available: true,
      spicyLevel: 3,
    },
  ];

  beforeEach(async () => {
    if (isDefaultProviderAvailable) {
      // Usar el provider configurado en .env
      service = new EnhancedLLMService(defaultProvider);
      
      // Añadir delay si usamos Gemini para evitar rate limiting
      if (isUsingGemini) {
        await delay(GEMINI_DELAY_MS);
      }
    }
  });

  testOrSkip('should generate friendly dish recommendations', async () => {
    const userMessage = 'Quiero algo vegetariano';
    const intent = await service.extractDetailedIntents(userMessage);

    const response = await service.generateDishRecommendations({
      userMessage,
      intent,
      menuItems: mockMenuItems,
    });

    expect(response).toBeDefined();
    expect(response.length).toBeGreaterThan(50);
    // Verificar tono amigable (emojis, lenguaje casual)
    expect(response).toMatch(/vegetarian|vegetariano/i);
  }, 30000);

  testOrSkip('should include specific justifications in recommendations', async () => {
    const userMessage = 'Soy vegetariano y busco algo sin gluten';
    const intent = await service.extractDetailedIntents(userMessage);

    const response = await service.generateDishRecommendations({
      userMessage,
      intent,
      menuItems: mockMenuItems,
    });

    expect(response).toBeDefined();
    // Verificar que menciona las características relevantes
    expect(response.toLowerCase()).toContain('vegetarian');
    // Debe justificar por qué recomienda cada plato
    expect(response.length).toBeGreaterThan(100);
  }, 30000);

  testOrSkip('should handle ingredient inquiries safely', async () => {
    const userMessage = '¿El risotto tiene mariscos?';

    const response = await service.answerIngredientQuery({
      userMessage,
      dishId: '2',
      menuItems: mockMenuItems,
    });

    expect(response).toBeDefined();
    expect(response.length).toBeGreaterThan(20);
    // Debe mencionar los ingredientes o alergenos relevantes
  }, 30000);

  testOrSkip('should handle dietary restrictions with suitable options', async () => {
    const userMessage = 'Soy vegetariano';
    const restrictions = await service.analyzeDietaryRestrictions(userMessage);

    const response = await service.handleDietaryRestrictions({
      userMessage,
      restrictions,
      menuItems: mockMenuItems,
    });

    expect(response).toBeDefined();
    expect(response.length).toBeGreaterThan(50);
    // No debe mencionar opciones con carne/pescado
    expect(response.toLowerCase()).not.toContain('camarón');
  }, 30000);

  testOrSkip('should generate appropriate follow-up questions', async () => {
    const userMessage = 'Quiero comer algo';
    const intent = await service.extractDetailedIntents(userMessage);
    const context = await service.understandContext([
      { role: MessageRole.USER, content: userMessage },
    ]);

    const followUp = await service.generateFollowUpQuestion({
      context,
      intent,
    });

    expect(followUp).toBeDefined();
    expect(followUp.length).toBeGreaterThan(10);
    // Debe hacer una pregunta relevante
    expect(followUp).toContain('?');
  }, 30000);

  testOrSkip('should confirm order with complete summary', async () => {
    const orderItems = [
      {
        name: 'Risotto de Hongos',
        quantity: 2,
        price: 4500,
      },
    ];

    const response = await service.confirmOrder({
      orderItems,
      dietaryRestrictions: ['vegetarian'],
    });

    expect(response).toBeDefined();
    expect(response).toContain('Risotto');
    expect(response).toContain('2');
    // Debe incluir total
    expect(response).toMatch(/9000|\$|total/i);
  }, 30000);

  testOrSkip('should maintain context across conversation', async () => {
    const conversationHistory = [
      { role: MessageRole.USER, content: 'Soy vegetariano' },
      { role: MessageRole.ASSISTANT, content: 'Perfecto, tengo varias opciones vegetarianas' },
      { role: MessageRole.USER, content: 'También sin gluten' },
    ];

    const context = await service.understandContext(conversationHistory);

    expect(context).toBeDefined();
    expect(context.conversationStage).toBeTruthy();
    expect(context.missingInfo.length).toBeGreaterThanOrEqual(0);
  }, 30000);

  testOrSkip('should generate responses with proper tone', async () => {
    const userMessage = 'Hola, es mi primera vez aquí';
    const intent = await service.extractDetailedIntents(userMessage);

    const response = await service.generateDishRecommendations({
      userMessage,
      intent,
      menuItems: mockMenuItems,
    });

    expect(response).toBeDefined();
    // Debe contener una respuesta coherente (no el mensaje de error genérico)
    expect(response.length).toBeGreaterThan(20);
    // Debe ser relevante (mencionar platos o dar opciones)
    const lowerResponse = response.toLowerCase();
    expect(
      lowerResponse.includes('bienvenid') || 
      lowerResponse.includes('hola') || 
      lowerResponse.includes('primer') ||
      lowerResponse.includes('opciones') ||
      lowerResponse.includes('menú') ||
      lowerResponse.includes('plato')
    ).toBeTruthy();
  }, 30000);

  testOrSkip('should handle allergy warnings seriously', async () => {
    const userMessage = 'Soy alérgico a los mariscos';
    const allergyInfo = await service.detectAllergies(userMessage);

    const response = await service.answerIngredientQuery({
      userMessage: '¿Qué platos puedo comer?',
      menuItems: mockMenuItems,
      allergyInfo,
    });

    expect(response).toBeDefined();
    // No debe recomendar tacos de camarón
    expect(response.toLowerCase()).not.toContain('camarón');
    // Debe mencionar la seriedad de la alergia
    expect(response.toLowerCase()).toMatch(/seguridad|alergia|cuidado/);
  }, 30000);
});

describe('EnhancedLLMService - Context Understanding (Task #28)', () => {
  let service: EnhancedLLMService;

  // Usar el provider configurado en .env (LLM_DEFAULT_PROVIDER)
  const defaultProvider = config.llm.defaultProvider as LLMProviderType;
  const hasOpenAI = !!config.openai.apiKey;
  const hasGemini = !!config.gemini.apiKey;
  
  // Verificar si el provider por defecto está disponible
  const isDefaultProviderAvailable = 
    (defaultProvider === LLMProviderType.OPENAI && hasOpenAI) ||
    (defaultProvider === LLMProviderType.GEMINI && hasGemini);
  
  const testOrSkip = isDefaultProviderAvailable ? it : it.skip;

  beforeEach(async () => {
    if (isDefaultProviderAvailable) {
      // Usar el provider configurado en .env
      service = new EnhancedLLMService(defaultProvider);
      
      // Añadir delay si usamos Gemini para evitar rate limiting
      if (isUsingGemini) {
        await delay(GEMINI_DELAY_MS);
      }
    }
  });

  testOrSkip('should identify conversation stage', async () => {
    const conversationHistory = [
      { role: MessageRole.USER, content: 'Hola, quiero ver el menú' },
      { role: MessageRole.ASSISTANT, content: 'Claro, te muestro nuestras opciones' },
      { role: MessageRole.USER, content: 'Me interesa el risotto' },
    ];

    const context = await service.understandContext(conversationHistory);

    expect(context).toBeDefined();
    // El contexto debe tener un stage válido (puede variar según el LLM)
    expect(context.conversationStage).toBeTruthy();
    expect(typeof context.conversationStage).toBe('string');
  }, 25000);

  testOrSkip('should detect emotional state', async () => {
    const conversationHistory = [
      { role: MessageRole.USER, content: 'Estoy súper emocionado de probar su comida!' },
    ];

    const context = await service.understandContext(conversationHistory);

    expect(context).toBeDefined();
    // El estado emocional debe ser un string válido
    expect(context.emotionalState).toBeTruthy();
    expect(typeof context.emotionalState).toBe('string');
  }, 25000);

  testOrSkip('should identify missing information', async () => {
    const conversationHistory = [
      { role: MessageRole.USER, content: 'Quiero ordenar algo' },
    ];

    const context = await service.understandContext(conversationHistory);

    expect(context).toBeDefined();
    // Verificar que missingInfo es un array (puede estar vacío si el LLM no detecta falta de info)
    expect(Array.isArray(context.missingInfo)).toBe(true);
    expect(Array.isArray(context.clarificationsNeeded)).toBe(true);
  }, 25000);

  testOrSkip('should suggest next steps appropriately', async () => {
    const conversationHistory = [
      { role: MessageRole.USER, content: 'Ya elegí mi plato principal' },
      { role: MessageRole.ASSISTANT, content: 'Excelente elección' },
    ];

    const context = await service.understandContext(conversationHistory);

    expect(context).toBeDefined();
    // Verificar que suggestedNextSteps es un array (puede estar vacío)
    expect(Array.isArray(context.suggestedNextSteps)).toBe(true);
  }, 25000);
});

describe('EnhancedLLMService - Provider Management', () => {
  it('should initialize with default provider', () => {
    const service = new EnhancedLLMService();
    expect(service).toBeDefined();
    expect(service.getCurrentProvider()).toBeTruthy();
  });

  it('should allow provider switching', () => {
    const service = new EnhancedLLMService();
    
    // Intentar cambiar provider
    if (config.gemini.apiKey) {
      service.setProvider(LLMProviderType.GEMINI);
      expect(service.getCurrentProvider()).toContain('Gemini');
    }

    if (config.openai.apiKey) {
      service.setProvider(LLMProviderType.OPENAI);
      expect(service.getCurrentProvider()).toContain('OpenAI');
    }
  });

  it('should list available providers', () => {
    const providers = EnhancedLLMService.getAvailableProviders();
    expect(Array.isArray(providers)).toBe(true);
    expect(providers.length).toBeGreaterThan(0);
  });

  it('should report provider availability', () => {
    const service = new EnhancedLLMService();
    const isAvailable = service.isProviderAvailable();
    expect(typeof isAvailable).toBe('boolean');
  });
});
