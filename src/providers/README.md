# Proveedores LLM - Patrón Adapter

Este directorio contiene las implementaciones de proveedores LLM usando el **patrón Adapter**.

## 📁 Estructura

```
providers/
├── openai.provider.ts    # Adapter para OpenAI (GPT-4, GPT-3.5, etc)
├── gemini.provider.ts    # Adapter para Google Gemini
└── llm.factory.ts        # Factory para crear e instanciar proveedores
```

## 🎯 Objetivo

Abstraer la complejidad de diferentes APIs de LLM detrás de una interfaz común (`ILLMProvider`), permitiendo:

- Cambiar de proveedor sin modificar el código del servicio
- Agregar nuevos proveedores fácilmente
- Testear con mocks
- Implementar estrategias de failover y balanceo

## 🔧 Cómo Agregar un Nuevo Proveedor

### 1. Crear el Adapter

Crea un archivo `nuevo-proveedor.provider.ts`:

```typescript
import { ILLMProvider, LLMMessage, LLMOptions, LLMResponse } from '../interfaces/llm.interface';

export class NuevoProveedorProvider implements ILLMProvider {
  private client: any; // SDK del proveedor

  constructor(apiKey?: string) {
    // Inicializar cliente
  }

  async generateResponse(
    messages: LLMMessage[],
    options?: LLMOptions
  ): Promise<LLMResponse> {
    // Implementar lógica de llamada
  }

  getProviderName(): string {
    return 'Nuevo Proveedor';
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }
}
```

### 2. Registrar en el Factory

Edita `llm.factory.ts`:

```typescript
// Agregar al enum en interfaces/llm.interface.ts
export enum LLMProviderType {
  OPENAI = 'openai',
  GEMINI = 'gemini',
  NUEVO = 'nuevo', // ← Agregar aquí
}

// Agregar case en el factory
switch (type) {
  case LLMProviderType.OPENAI:
    provider = new OpenAIProvider();
    break;
  case LLMProviderType.GEMINI:
    provider = new GeminiProvider();
    break;
  case LLMProviderType.NUEVO:
    provider = new NuevoProveedorProvider(); // ← Agregar aquí
    break;
}
```

### 3. Actualizar Configuración

Agrega variables de entorno en `env.config.ts`:

```typescript
export const config = {
  // ...
  nuevoProveedor: {
    apiKey: process.env.NUEVO_PROVEEDOR_API_KEY || '',
  },
};
```

## 📚 Proveedores Actuales

### OpenAI Provider

- **Modelos soportados**: GPT-4, GPT-4o, GPT-4o-mini, GPT-3.5-turbo
- **Streaming**: ✅ Soportado
- **Configuración**: Requiere `OPENAI_API_KEY`
- **Documentación**: https://platform.openai.com/docs

### Gemini Provider

- **Modelos soportados**: gemini-pro, gemini-pro-vision
- **Streaming**: ✅ Soportado
- **Configuración**: Requiere `GEMINI_API_KEY`
- **Documentación**: https://ai.google.dev/docs

## 🧪 Testing

```typescript
import { LLMProviderFactory } from './llm.factory';
import { LLMProviderType } from '../interfaces/llm.interface';

// Mockear para tests
class MockProvider implements ILLMProvider {
  // ...implementación mock
}

// En tests
LLMProviderFactory.clearInstances();
// Inyectar mock...
```

## 💡 Ejemplos de Uso

Ver `/src/examples/llm-usage.example.ts` y `/docs/LLM_PROVIDERS_GUIDE.md` para ejemplos completos.

## 🔒 Seguridad

- ⚠️ Nunca commitear API keys en el código
- ⚠️ Usar variables de entorno para todas las credenciales
- ⚠️ Agregar rate limiting en producción
- ⚠️ Validar y sanitizar inputs del usuario

## 📊 Monitoreo

Considera agregar:

- Logs de uso por proveedor
- Métricas de latencia
- Conteo de tokens
- Manejo de errores y reintentos

## 🚀 Mejoras Futuras

- [ ] Cache de respuestas
- [ ] Rate limiting por proveedor
- [ ] Métricas de costo
- [ ] Soporte para más proveedores (Anthropic Claude, Cohere, etc)
- [ ] Embeddings y función calling
- [ ] Fine-tuning support
