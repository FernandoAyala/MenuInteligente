# Guía de Uso: Sistema de Proveedores LLM con Adapter Pattern

## 📋 Índice

1. [Introducción](#introducción)
2. [Arquitectura](#arquitectura)
3. [Configuración](#configuración)
4. [Uso Básico](#uso-básico)
5. [Cambio Dinámico de Proveedores](#cambio-dinámico-de-proveedores)
6. [Ejemplos Avanzados](#ejemplos-avanzados)
7. [Testing](#testing)

---

## 🎯 Introducción

Este proyecto implementa un **sistema genérico de proveedores LLM** usando el **patrón Adapter**. Esto permite:

- ✅ Cambiar entre OpenAI y Google Gemini sin modificar código
- ✅ Agregar nuevos proveedores fácilmente
- ✅ Testear con diferentes modelos
- ✅ Reducir dependencia de un solo proveedor
- ✅ Optimizar costos según uso

---

## 🏗️ Arquitectura

### Componentes Principales

```
src/
├── interfaces/
│   └── llm.interface.ts       # Interfaz común ILLMProvider
├── providers/
│   ├── openai.provider.ts     # Adapter para OpenAI
│   ├── gemini.provider.ts     # Adapter para Gemini
│   └── llm.factory.ts         # Factory para crear proveedores
├── services/
│   └── llm.service.ts         # Servicio de alto nivel
└── examples/
    └── llm-usage.example.ts   # Ejemplos de uso
```

### Patrón Adapter

```typescript
┌─────────────────────┐
│   LLMService        │  ← Capa de servicio
│  (Alto nivel)       │
└──────────┬──────────┘
           │
           │ usa
           ▼
┌─────────────────────┐
│  ILLMProvider       │  ← Interfaz común
│  (Adapter)          │
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌─────────┐  ┌─────────┐
│ OpenAI  │  │ Gemini  │  ← Implementaciones específicas
│ Provider│  │ Provider│
└─────────┘  └─────────┘
    │             │
    ▼             ▼
┌─────────┐  ┌─────────┐
│ OpenAI  │  │ Google  │  ← APIs externas
│   API   │  │   API   │
└─────────┘  └─────────┘
```

---

## ⚙️ Configuración

### 1. Variables de Entorno

Edita tu archivo `.env`:

```bash
# Opción 1: Usar OpenAI (GPT-4, GPT-3.5, etc)
OPENAI_API_KEY=sk-your-openai-key-here
LLM_DEFAULT_PROVIDER=openai

# Opción 2: Usar Google Gemini
GEMINI_API_KEY=your-gemini-key-here
LLM_DEFAULT_PROVIDER=gemini

# Puedes configurar ambos y cambiar dinámicamente
```

### 2. Instalar Dependencias

```bash
# OpenAI SDK
npm install openai

# Google Gemini SDK
npm install @google/generative-ai
```

### 3. Obtener API Keys

**OpenAI:**
- Ve a https://platform.openai.com/api-keys
- Crea un nuevo API key
- Copia el key en `.env`

**Google Gemini:**
- Ve a https://makersuite.google.com/app/apikey
- Crea un nuevo API key
- Copia el key en `.env`

---

## 🚀 Uso Básico

### 1. Usar el Proveedor por Defecto

```typescript
import { LLMService } from './services/llm.service';

// Usa el proveedor configurado en LLM_DEFAULT_PROVIDER
const llmService = new LLMService();

// Generar respuesta
const response = await llmService.generateConversationalResponse(
  '¿Qué platos veganos tienen?',
  { menuItems: [...] }
);

console.log(response);
```

### 2. Usar un Proveedor Específico

```typescript
import { LLMService } from './services/llm.service';
import { LLMProviderType } from './interfaces/llm.interface';

// Forzar uso de OpenAI
const openAIService = new LLMService(LLMProviderType.OPENAI);

// Forzar uso de Gemini
const geminiService = new LLMService(LLMProviderType.GEMINI);
```

### 3. Verificar Disponibilidad

```typescript
// Listar proveedores disponibles (con API keys configuradas)
const available = LLMService.getAvailableProviders();
console.log(available); // ['openai', 'gemini']

// Verificar si el proveedor actual está disponible
if (llmService.isProviderAvailable()) {
  console.log('Proveedor listo para usar');
}
```

---

## 🔄 Cambio Dinámico de Proveedores

### Cambiar en Tiempo de Ejecución

```typescript
const llmService = new LLMService();

// Empezar con OpenAI
console.log(llmService.getCurrentProvider()); // "OpenAI"

// Cambiar a Gemini
llmService.setProvider(LLMProviderType.GEMINI);
console.log(llmService.getCurrentProvider()); // "Google Gemini"

// Ahora todas las llamadas usan Gemini
const response = await llmService.generateChatResponse([...]);
```

### Estrategia de Failover

```typescript
async function generateWithFailover(message: string) {
  const providers = LLMService.getAvailableProviders();
  
  for (const provider of providers) {
    try {
      const service = new LLMService(provider);
      const response = await service.generateConversationalResponse(message, {});
      return response;
    } catch (error) {
      console.warn(`Falló ${provider}, intentando siguiente...`);
    }
  }
  
  throw new Error('Todos los proveedores fallaron');
}
```

### Balanceo de Carga

```typescript
class LLMLoadBalancer {
  private currentIndex = 0;
  private providers = LLMService.getAvailableProviders();

  getNextProvider(): LLMProviderType {
    const provider = this.providers[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.providers.length;
    return provider;
  }

  async generateResponse(message: string) {
    const provider = this.getNextProvider();
    const service = new LLMService(provider);
    return service.generateConversationalResponse(message, {});
  }
}
```

---

## 💡 Ejemplos Avanzados

### Extraer Intenciones del Usuario

```typescript
const llmService = new LLMService();

const result = await llmService.extractIntents(
  'Quiero dos pizzas margarita y una coca cola'
);

console.log(result);
/*
{
  "intent": "agregar_plato",
  "entities": {
    "items": [
      { "name": "pizza margarita", "quantity": 2 },
      { "name": "coca cola", "quantity": 1 }
    ]
  },
  "confidence": 0.95
}
*/
```

### Generar Recomendaciones Personalizadas

```typescript
const recommendations = await llmService.generateRecommendations(
  {
    dietaryRestrictions: ['vegetarian'],
    allergens: ['nuts'],
    spicyPreference: 'mild',
  },
  menuItems
);

console.log(recommendations); // ["item_2", "item_5", "item_8"]
```

### Chat con Historial

```typescript
import { MessageRole, LLMMessage } from './interfaces/llm.interface';

const conversationHistory: LLMMessage[] = [
  {
    role: MessageRole.SYSTEM,
    content: 'Eres un mesero virtual amigable'
  },
  {
    role: MessageRole.USER,
    content: '¿Qué tienen de postre?'
  },
  {
    role: MessageRole.ASSISTANT,
    content: 'Tenemos tarta de manzana, helado de chocolate...'
  },
  {
    role: MessageRole.USER,
    content: 'Dame el helado'
  }
];

const response = await llmService.generateChatResponse(
  conversationHistory,
  0.8 // temperature
);
```

### Comparar Respuestas de Diferentes Proveedores

```typescript
async function compareProviders(prompt: string) {
  const providers = LLMService.getAvailableProviders();
  const results: Record<string, string> = {};

  for (const provider of providers) {
    const service = new LLMService(provider);
    const response = await service.generateConversationalResponse(prompt, {});
    results[service.getCurrentProvider()] = response;
  }

  return results;
}

const comparison = await compareProviders('Recomiéndame un plato');
console.log(comparison);
/*
{
  "OpenAI": "Te recomiendo nuestro risotto de hongos...",
  "Google Gemini": "Prueba nuestra pasta carbonara..."
}
*/
```

---

## 🧪 Testing

### Mock del Provider

```typescript
// tests/mocks/mock-llm.provider.ts
import { ILLMProvider, LLMMessage, LLMResponse } from '../../interfaces/llm.interface';

export class MockLLMProvider implements ILLMProvider {
  async generateResponse(messages: LLMMessage[]): Promise<LLMResponse> {
    return {
      content: 'Mock response',
      model: 'mock-model',
      usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
      finishReason: 'stop',
    };
  }

  getProviderName(): string {
    return 'Mock Provider';
  }

  isAvailable(): boolean {
    return true;
  }
}
```

### Test Unitario

```typescript
// tests/services/llm.service.test.ts
import { LLMService } from '../../services/llm.service';
import { LLMProviderType } from '../../interfaces/llm.interface';

describe('LLMService', () => {
  it('should create service with default provider', () => {
    const service = new LLMService();
    expect(service.getCurrentProvider()).toBeDefined();
  });

  it('should change provider dynamically', () => {
    const service = new LLMService(LLMProviderType.OPENAI);
    expect(service.getCurrentProvider()).toBe('OpenAI');

    service.setProvider(LLMProviderType.GEMINI);
    expect(service.getCurrentProvider()).toBe('Google Gemini');
  });

  it('should list available providers', () => {
    const providers = LLMService.getAvailableProviders();
    expect(Array.isArray(providers)).toBe(true);
  });
});
```

---

## 📊 Comparación de Proveedores

| Característica | OpenAI (GPT-4o-mini) | Google Gemini Pro |
|----------------|----------------------|-------------------|
| **Costo** | $0.150 / 1M tokens input | Gratis (limitado) |
| **Velocidad** | Rápido | Muy rápido |
| **Contexto** | 128K tokens | 32K tokens |
| **Idiomas** | Excelente en ES | Excelente en ES |
| **Streaming** | ✅ Soportado | ✅ Soportado |
| **JSON Mode** | ✅ Nativo | ⚠️ Por prompt |

---

## 🎓 Conclusión

Este sistema de proveedores te da:

1. **Flexibilidad**: Cambia de proveedor sin tocar código
2. **Resiliencia**: Implementa failover fácilmente
3. **Optimización**: Usa el proveedor más barato/rápido según caso
4. **Testabilidad**: Mockea proveedores en tests
5. **Escalabilidad**: Agrega nuevos proveedores implementando `ILLMProvider`

---

## 🔜 Próximos Pasos

- Ejecuta los ejemplos: `npm run dev src/examples/llm-usage.example.ts`
- Configura tus API keys en `.env`
- Implementa el servicio de chat completo
- Agrega más proveedores (Anthropic Claude, Cohere, etc)
