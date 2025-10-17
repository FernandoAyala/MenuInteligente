# Sistema de Proveedores LLM - Resumen Ejecutivo

## ✅ Implementación Completa

Se ha creado un **sistema genérico de proveedores LLM** usando el **patrón Adapter** que permite cambiar entre OpenAI y Google Gemini sin modificar código.

---

## 📁 Archivos Creados

### 1. **Interfaces y Contratos** (1 archivo)
- `src/interfaces/llm.interface.ts` - Interfaz `ILLMProvider` común para todos los proveedores

### 2. **Proveedores (Adapters)** (3 archivos)
- `src/providers/openai.provider.ts` - Adapter para OpenAI (GPT-4, GPT-3.5)
- `src/providers/gemini.provider.ts` - Adapter para Google Gemini
- `src/providers/llm.factory.ts` - Factory para crear e instanciar proveedores

### 3. **Servicios** (1 archivo)
- `src/services/llm.service.ts` - Servicio de alto nivel con métodos utilitarios

### 4. **API REST** (2 archivos)
- `src/controllers/llm.controller.ts` - Controladores para endpoints LLM
- `src/routes/llm.routes.ts` - Definición de rutas `/api/llm/*`

### 5. **Documentación** (3 archivos)
- `docs/LLM_PROVIDERS_GUIDE.md` - Guía completa de uso (500+ líneas)
- `src/providers/README.md` - Documentación del directorio de proveedores
- `src/examples/llm-usage.example.ts` - Ejemplos prácticos de uso

### 6. **Configuración** (3 archivos actualizados)
- `src/config/env.config.ts` - Configuración extendida con Gemini y LLM
- `.env` - Variables de entorno actualizadas
- `.env.example` - Template actualizado

---

## 🎯 Características Principales

### 1. **Patrón Adapter**
```typescript
// Interfaz común
interface ILLMProvider {
  generateResponse(messages, options): Promise<LLMResponse>
  getProviderName(): string
  isAvailable(): boolean
}

// Implementaciones específicas
class OpenAIProvider implements ILLMProvider { ... }
class GeminiProvider implements ILLMProvider { ... }
```

### 2. **Cambio Dinámico de Proveedores**
```typescript
const llmService = new LLMService();
console.log(llmService.getCurrentProvider()); // "OpenAI"

llmService.setProvider(LLMProviderType.GEMINI);
console.log(llmService.getCurrentProvider()); // "Google Gemini"
```

### 3. **Factory Pattern**
```typescript
// Obtener proveedor por defecto
const provider = LLMProviderFactory.getDefaultProvider();

// Obtener proveedor específico
const openai = LLMProviderFactory.getProvider(LLMProviderType.OPENAI);

// Listar disponibles
const available = LLMProviderFactory.getAvailableProviders();
```

### 4. **Métodos Utilitarios**
- `generateChatResponse()` - Chat conversacional
- `extractIntents()` - Extracción de intenciones
- `generateRecommendations()` - Recomendaciones personalizadas
- `generateConversationalResponse()` - Respuestas con contexto

### 5. **API REST Endpoints**
- `GET /api/llm/providers` - Listar proveedores disponibles
- `GET /api/llm/provider/current` - Obtener proveedor actual
- `POST /api/llm/test` - Probar un proveedor específico

---

## ⚙️ Configuración

### Variables de Entorno (`.env`)

```bash
# Usar OpenAI (por defecto)
OPENAI_API_KEY=sk-your-key-here
LLM_DEFAULT_PROVIDER=openai

# O usar Gemini
GEMINI_API_KEY=your-gemini-key
LLM_DEFAULT_PROVIDER=gemini

# Puedes configurar ambos y cambiar dinámicamente
```

### Dependencias Instaladas

```json
{
  "openai": "^4.24.1",
  "@google/generative-ai": "^0.1.3"
}
```

---

## 🚀 Uso Rápido

### Ejemplo 1: Chat Básico

```typescript
import { LLMService } from './services/llm.service';

const llmService = new LLMService();
const response = await llmService.generateConversationalResponse(
  '¿Qué platos veganos tienen?',
  { menuItems: [...] }
);
```

### Ejemplo 2: Cambiar Proveedor

```typescript
const llmService = new LLMService(LLMProviderType.OPENAI);
// ... usar OpenAI

llmService.setProvider(LLMProviderType.GEMINI);
// ... ahora usa Gemini
```

### Ejemplo 3: Extraer Intenciones

```typescript
const result = await llmService.extractIntents(
  'Quiero dos pizzas margarita'
);
// { intent: "agregar_plato", entities: {...}, confidence: 0.95 }
```

### Ejemplo 4: Probar via API REST

```bash
# Listar proveedores
curl http://localhost:3000/api/llm/providers

# Proveedor actual
curl http://localhost:3000/api/llm/provider/current

# Probar OpenAI
curl -X POST http://localhost:3000/api/llm/test \
  -H "Content-Type: application/json" \
  -d '{"provider": "openai", "message": "Hola!"}'
```

---

## 📊 Comparación de Proveedores

| Característica | OpenAI | Google Gemini |
|----------------|---------|---------------|
| **Costo** | $0.150/1M tokens | Gratis (limitado) |
| **Velocidad** | Rápido | Muy rápido |
| **Contexto** | 128K tokens | 32K tokens |
| **Streaming** | ✅ | ✅ |
| **Español** | Excelente | Excelente |

---

## 🎓 Ventajas del Sistema

1. **Flexibilidad** - Cambia de proveedor sin tocar código
2. **Resiliencia** - Implementa failover fácilmente
3. **Optimización** - Usa el más barato/rápido según caso
4. **Testabilidad** - Mockea proveedores en tests
5. **Escalabilidad** - Agrega nuevos proveedores fácilmente

---

## 📚 Documentación

- **Guía completa**: `docs/LLM_PROVIDERS_GUIDE.md` (500+ líneas)
- **Ejemplos**: `src/examples/llm-usage.example.ts`
- **README Proveedores**: `src/providers/README.md`

---

## 🔜 Próximos Pasos

1. **Configurar API Keys**: Agrega `OPENAI_API_KEY` o `GEMINI_API_KEY` en `.env`
2. **Probar Endpoints**: `npm run dev` y prueba `/api/llm/providers`
3. **Ejecutar Ejemplos**: `npm run dev src/examples/llm-usage.example.ts`
4. **Integrar en Chat**: Usa `LLMService` en tu controlador de chat

---

## 🎯 Comandos Útiles

```bash
# Ejecutar ejemplos
npm run dev src/examples/llm-usage.example.ts

# Iniciar servidor con nuevas rutas
npm run dev

# Verificar endpoints
curl http://localhost:3000/api/llm/providers
```

---

## ✅ Todo Completo

- ✅ Interfaz `ILLMProvider` común
- ✅ Adapter para OpenAI
- ✅ Adapter para Gemini
- ✅ Factory pattern
- ✅ Servicio de alto nivel
- ✅ API REST endpoints
- ✅ Configuración de entorno
- ✅ Ejemplos de uso
- ✅ Documentación completa (3 archivos)
- ✅ Dependencias instaladas

**¡El sistema está listo para usar!** 🚀
