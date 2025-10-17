import { LLMService } from '../services/llm.service';
import { LLMProviderType } from '../interfaces/llm.interface';

/**
 * Ejemplo de uso del sistema de proveedores LLM
 */
async function main() {
  console.log('🤖 Ejemplo de uso de Providers LLM (Adapter Pattern)\n');

  // ============================================
  // 1. Listar proveedores disponibles
  // ============================================
  console.log('📋 Proveedores disponibles:');
  const availableProviders = LLMService.getAvailableProviders();
  console.log(availableProviders);
  console.log('');

  // ============================================
  // 2. Usar el proveedor por defecto (según .env)
  // ============================================
  console.log('🎯 Usando proveedor por defecto...');
  const llmService = new LLMService();
  console.log(`Proveedor actual: ${llmService.getCurrentProvider()}`);
  console.log('');

  // ============================================
  // 3. Generar respuesta conversacional
  // ============================================
  try {
    console.log('💬 Generando respuesta conversacional...');
    const userMessage = '¿Qué platos veganos tienen disponibles?';
    
    const response = await llmService.generateConversationalResponse(
      userMessage,
      {
        menuItems: [
          { id: '1', name: 'Ensalada César', category: 'appetizer', isVegan: false },
          { id: '2', name: 'Bowl de Quinoa', category: 'main_course', isVegan: true },
          { id: '3', name: 'Tarta de Manzana', category: 'dessert', isVegan: true },
        ],
      }
    );

    console.log(`Usuario: ${userMessage}`);
    console.log(`Asistente (${llmService.getCurrentProvider()}): ${response}`);
    console.log('');
  } catch (error) {
    console.error('Error:', error);
  }

  // ============================================
  // 4. Cambiar de proveedor dinámicamente
  // ============================================
  if (availableProviders.length > 1) {
    console.log('🔄 Cambiando de proveedor...');
    
    // Cambiar a Gemini si está disponible
    if (availableProviders.includes(LLMProviderType.GEMINI)) {
      llmService.setProvider(LLMProviderType.GEMINI);
      console.log(`Nuevo proveedor: ${llmService.getCurrentProvider()}`);
      
      try {
        console.log('💬 Generando respuesta con nuevo proveedor...');
        const response = await llmService.generateConversationalResponse(
          '¿Tienen opciones sin gluten?',
          {}
        );
        console.log(`Asistente (${llmService.getCurrentProvider()}): ${response}`);
        console.log('');
      } catch (error) {
        console.error('Error:', error);
      }
    }
  }

  // ============================================
  // 5. Extraer intenciones
  // ============================================
  try {
    console.log('🎯 Extrayendo intenciones del usuario...');
    const intentResult = await llmService.extractIntents(
      'Quiero agregar dos pizzas margarita y una coca cola al carrito'
    );
    console.log('Resultado:', JSON.stringify(intentResult, null, 2));
    console.log('');
  } catch (error) {
    console.error('Error:', error);
  }

  // ============================================
  // 6. Generar recomendaciones
  // ============================================
  try {
    console.log('✨ Generando recomendaciones personalizadas...');
    const recommendations = await llmService.generateRecommendations(
      {
        dietaryRestrictions: ['vegetarian'],
        allergens: ['nuts'],
        spicyPreference: 'mild',
      },
      [
        { id: '1', name: 'Ensalada César', vegetarian: false },
        { id: '2', name: 'Pasta Primavera', vegetarian: true, hasNuts: false },
        { id: '3', name: 'Curry Tailandés', vegetarian: true, spicyLevel: 'hot' },
        { id: '4', name: 'Risotto de Hongos', vegetarian: true, hasNuts: true },
      ]
    );
    console.log('Platos recomendados:', recommendations);
    console.log('');
  } catch (error) {
    console.error('Error:', error);
  }

  // ============================================
  // 7. Crear un servicio con proveedor específico
  // ============================================
  if (availableProviders.includes(LLMProviderType.OPENAI)) {
    console.log('🔧 Creando servicio con OpenAI específicamente...');
    const openAIService = new LLMService(LLMProviderType.OPENAI);
    console.log(`Proveedor: ${openAIService.getCurrentProvider()}`);
    console.log('');
  }

  console.log('✅ Ejemplos completados!');
}

// Ejecutar ejemplos si este archivo se ejecuta directamente
if (require.main === module) {
  main().catch(console.error);
}

export { main as runLLMExamples };
