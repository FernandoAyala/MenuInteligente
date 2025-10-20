# Epic #60: API Conversacional y Orquestación

**Estado**: 🚧 En Desarrollo  
**Prioridad**: Alta (1)  
**Effort**: 104 Story Points  
**Fecha Inicio**: 20 de Octubre de 2025

---

## 📋 Descripción

Backend que orqueste LLM, base de datos y lógica de negocio. Esta épica incluye endpoint principal `/api/chat`, pipeline de procesamiento de mensajes, middleware de validación, sistema de caching, logs estructurados y métricas básicas para coordinar eficientemente todas las operaciones del sistema.

---

## 🎯 Objetivos

### Objetivo Principal
Crear un sistema de orquestación completo que coordine todas las capas del backend (LLM, Base de Datos, Lógica de Negocio) para proveer una API conversacional robusta y eficiente.

### Objetivos Específicos
1. ✅ Implementar endpoint `/api/chat` con manejo asíncrono
2. ✅ Crear pipeline de procesamiento de mensajes
3. ✅ Implementar middleware de validación y rate limiting
4. ✅ Sistema de caching inteligente
5. ✅ Logs estructurados para debugging
6. ✅ Métricas de rendimiento (latencia, requests)
7. ✅ Manejo robusto de errores y timeouts
8. ✅ Optimización de consultas concurrentes

---

## 📊 User Stories

### User Story #61: Endpoint de chat principal /api/chat (58 SP)

**Como** integrador  
**Quiero** un endpoint de chat que maneje toda la lógica conversacional  
**Para** poder ofrecer una experiencia de usuario fluida y natural

#### Criterios de Aceptación
- ✅ POST `/api/chat` acepta: `{ message, sessionId }`
- ✅ Respuesta: `{ response, suggestions?, actions?, sessionId }`
- ✅ Manejo asíncrono para latencias de LLM
- ✅ Rate limiting y validación de inputs

#### Tareas

| ID | Tarea | Estado | Descripción |
|----|-------|--------|-------------|
| #63 | Endpoint /api/chat con Express.js | ⬜ New | Crear ruta POST con controlador y esquema de validación |
| #64 | Middleware de validación y rate limiting | ⬜ New | Implementar Zod schemas y express-rate-limit |
| #65 | Orquestación: sesión → LLM → filtrado → respuesta | ⬜ New | Pipeline completo de procesamiento |
| #66 | Manejo de errores y timeouts | ⬜ New | Try-catch, timeouts, respuestas de error estructuradas |
| #67 | Testing con diferentes tipos de mensajes | ⬜ New | Suite de tests con Jest/Supertest |

---

### User Story #62: Coordinación eficiente de operaciones (LLM, BD, filtrado) (46 SP)

**Como** sistema  
**Quiero** coordinar eficientemente todas las operaciones (LLM, BD, filtrado)  
**Para** garantizar respuestas rápidas y optimizar recursos

#### Criterios de Aceptación
- ✅ Pipeline: recuperar sesión → procesar con LLM → filtrar menú → actualizar sesión
- ✅ Caching inteligente de respuestas frecuentes
- ✅ Logs estructurados para debugging
- ✅ Métricas básicas de latencia y uso

#### Tareas

| ID | Tarea | Estado | Descripción |
|----|-------|--------|-------------|
| #68 | Pipeline de procesamiento de mensajes | ⬜ New | Orquestador principal con flujo completo |
| #69 | Cache en memoria para respuestas comunes | ⬜ New | Sistema de caché con TTL y estrategia LRU |
| #70 | Sistema de logs estructurado | ⬜ New | Winston/Pino con niveles y formato JSON |
| #71 | Métricas básicas (latencia, requests) | ⬜ New | Contadores de performance y uso |
| #72 | Optimización de consultas concurrentes | ⬜ New | Paralelización y batching de operaciones |

---

## 🏗️ Arquitectura Técnica

### Stack Tecnológico
- **Framework**: Express.js
- **Validación**: Zod
- **Rate Limiting**: express-rate-limit
- **Caching**: node-cache o LRU cache
- **Logging**: Winston o Pino
- **Testing**: Jest + Supertest
- **TypeScript**: Strict mode

### Flujo de Procesamiento

```
Cliente → POST /api/chat
    ↓
Middleware de Validación (Zod)
    ↓
Middleware de Rate Limiting
    ↓
Controller: chatController.handleMessage()
    ↓
┌─────────────────────────────────────┐
│  ChatOrchestrationService           │
│                                     │
│  1. Recuperar/Crear Sesión         │
│  2. Verificar Cache                │
│  3. Procesar con EnhancedLLMService│
│  4. Filtrar con RecommendationServ │
│  5. Actualizar Sesión              │
│  6. Guardar en Cache               │
│  7. Log + Métricas                 │
└─────────────────────────────────────┘
    ↓
Respuesta JSON
    ↓
Cliente recibe: { response, suggestions, actions, sessionId }
```

### Estructura de Archivos

```
src/
├── controllers/
│   └── chat.controller.ts          # Controlador del endpoint /api/chat
├── services/
│   ├── chat-orchestration.service.ts  # Orquestador principal (NUEVO)
│   ├── cache.service.ts            # Sistema de caching (NUEVO)
│   └── metrics.service.ts          # Métricas y telemetría (NUEVO)
├── middleware/
│   ├── validation.middleware.ts    # Validación con Zod (NUEVO)
│   ├── rate-limit.middleware.ts    # Rate limiting (NUEVO)
│   └── error-handler.middleware.ts # Manejo global de errores (NUEVO)
├── routes/
│   └── chat.routes.ts              # Rutas de chat (NUEVO)
├── interfaces/
│   └── chat.interface.ts           # Tipos para chat (NUEVO)
├── utils/
│   └── logger.ts                   # Sistema de logs (NUEVO)
└── tests/
    ├── controllers/
    │   └── chat.controller.test.ts
    └── services/
        └── chat-orchestration.service.test.ts
```

---

## 📝 Interfaces y Tipos TypeScript

### Request/Response del Endpoint

```typescript
// Chat Request
interface ChatRequest {
  message: string;
  sessionId?: string;
  context?: {
    previousMessages?: number;
    includeRecommendations?: boolean;
  };
}

// Chat Response
interface ChatResponse {
  response: string;
  sessionId: string;
  suggestions?: string[];
  actions?: ChatAction[];
  recommendations?: Recommendation[];
  metadata?: {
    processingTime: number;
    llmProvider: string;
    fromCache: boolean;
  };
}

// Chat Action
interface ChatAction {
  type: 'add_to_cart' | 'view_menu' | 'place_order' | 'clear_cart';
  data?: any;
  label: string;
}
```

### Pipeline y Orquestación

```typescript
// Pipeline Stage
interface PipelineStage {
  name: string;
  execute: (context: ProcessingContext) => Promise<ProcessingContext>;
  onError?: (error: Error, context: ProcessingContext) => Promise<void>;
  timeout?: number;
}

// Processing Context
interface ProcessingContext {
  message: string;
  sessionId: string;
  session: ConversationSession;
  llmResponse?: any;
  recommendations?: Recommendation[];
  filteredMenu?: MenuItem[];
  response?: string;
  actions?: ChatAction[];
  metadata: {
    startTime: number;
    stageTimings: Record<string, number>;
  };
}
```

---

## 🔒 Validación y Seguridad

### Esquemas de Validación Zod

```typescript
import { z } from 'zod';

export const ChatRequestSchema = z.object({
  message: z.string()
    .min(1, 'El mensaje no puede estar vacío')
    .max(1000, 'El mensaje es demasiado largo'),
  sessionId: z.string().uuid().optional(),
  context: z.object({
    previousMessages: z.number().min(0).max(50).optional(),
    includeRecommendations: z.boolean().optional(),
  }).optional(),
});
```

### Rate Limiting

```typescript
// Configuración diferenciada por endpoint
{
  '/api/chat': {
    windowMs: 60000,      // 1 minuto
    maxRequests: 30,      // 30 requests por minuto
    message: 'Demasiadas solicitudes, intenta de nuevo más tarde'
  }
}
```

---

## 💾 Sistema de Caching

### Estrategia de Caché

```typescript
interface CacheConfig {
  ttl: number;           // Time to live en segundos
  maxSize: number;       // Máximo de entradas
  strategy: 'LRU' | 'LFU';
}

// Ejemplos de caching
- Respuestas comunes: "Hola", "Menú del día", "Ayuda" → TTL: 1 hora
- Recomendaciones por preferencias comunes → TTL: 30 minutos
- Información de menú → TTL: 15 minutos
```

### Implementación

```typescript
class CacheService {
  private cache: NodeCache;
  
  generateKey(message: string, context?: any): string;
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttl?: number): void;
  invalidate(pattern: string): void;
  getStats(): CacheStats;
}
```

---

## 📊 Sistema de Logs

### Niveles de Log

```typescript
enum LogLevel {
  ERROR = 'error',    // Errores críticos
  WARN = 'warn',      // Advertencias
  INFO = 'info',      // Información general
  DEBUG = 'debug',    // Debugging detallado
  TRACE = 'trace',    // Rastreo muy detallado
}
```

### Estructura de Logs

```typescript
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  context?: {
    sessionId?: string;
    userId?: string;
    processingTime?: number;
    stage?: string;
  };
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}
```

---

## 📈 Métricas y Telemetría

### Métricas a Capturar

```typescript
interface Metrics {
  // Counters
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cachedResponses: number;
  
  // Timers (percentiles: p50, p95, p99)
  endpointLatency: LatencyStats;
  llmProcessingTime: LatencyStats;
  dbQueryTime: LatencyStats;
  
  // Rates
  requestsPerMinute: number;
  errorsPerMinute: number;
  
  // Resources
  cacheHitRate: number;
  cacheSize: number;
}
```

---

## 🧪 Estrategia de Testing

### Tests Unitarios

```typescript
describe('ChatOrchestrationService', () => {
  describe('processMessage()', () => {
    it('debe procesar mensaje simple correctamente');
    it('debe usar cache para mensajes repetidos');
    it('debe manejar errores de LLM con fallback');
    it('debe actualizar sesión con nuevo mensaje');
    it('debe generar recomendaciones cuando sea apropiado');
  });
});
```

### Tests de Integración

```typescript
describe('POST /api/chat', () => {
  it('debe responder a mensaje inicial');
  it('debe mantener contexto entre mensajes');
  it('debe respetar rate limiting');
  it('debe validar entrada incorrecta');
  it('debe manejar timeout de LLM');
});
```

### Tests de Performance

```typescript
describe('Performance Tests', () => {
  it('debe responder en < 2 segundos en p95');
  it('debe manejar 100 requests concurrentes');
  it('debe mantener cache hit rate > 30%');
});
```

---

## ⚡ Optimizaciones

### Optimización de Consultas Concurrentes

```typescript
// Paralelización de operaciones independientes
const [session, menuItems] = await Promise.all([
  sessionRepository.findById(sessionId),
  menuItemRepository.findAvailable()
]);

// Batching de operaciones de DB
const dishIds = recommendations.map(r => r.dishId);
const dishes = await menuItemRepository.findByIds(dishIds); // Single query
```

### Timeouts y Circuit Breakers

```typescript
const LLM_TIMEOUT = 5000; // 5 segundos
const DB_TIMEOUT = 2000;  // 2 segundos

// Circuit breaker para LLM
if (llmService.isCircuitOpen()) {
  return fallbackResponse();
}
```

---

## 🚨 Manejo de Errores

### Estrategia de Errores

```typescript
class ChatError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number,
    public context?: any
  ) {
    super(message);
  }
}

// Errores específicos
class ValidationError extends ChatError { ... }
class LLMTimeoutError extends ChatError { ... }
class SessionNotFoundError extends ChatError { ... }
class RateLimitError extends ChatError { ... }
```

### Respuestas de Error

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  requestId: string;
}
```

---

## 📅 Plan de Implementación

### Fase 1: Fundamentos (Días 1-2)
- ✅ Task #63: Endpoint /api/chat básico
- ✅ Task #64: Middleware de validación y rate limiting
- ✅ Task #70: Sistema de logs estructurado

### Fase 2: Orquestación Core (Días 3-4)
- ✅ Task #65: Pipeline de procesamiento completo
- ✅ Task #68: Orquestador principal
- ✅ Task #66: Manejo de errores y timeouts

### Fase 3: Optimizaciones (Días 5-6)
- ✅ Task #69: Sistema de caching
- ✅ Task #72: Optimización de consultas concurrentes
- ✅ Task #71: Métricas y telemetría

### Fase 4: Testing y Ajustes (Día 7)
- ✅ Task #67: Suite completa de tests
- ✅ Ajustes de performance
- ✅ Documentación final

---

## 📊 Criterios de Éxito

### Funcionales
- ✅ Endpoint `/api/chat` responde correctamente a todos los tipos de mensajes
- ✅ Pipeline procesa: sesión → LLM → filtrado → respuesta
- ✅ Cache funciona con hit rate > 30%
- ✅ Logs estructurados en todos los puntos críticos
- ✅ Métricas capturan latencia, requests, errores

### No Funcionales
- ✅ Latencia p95 < 2 segundos
- ✅ Soporta 100 requests concurrentes
- ✅ Rate limiting efectivo (30 req/min)
- ✅ Cobertura de tests > 80%
- ✅ Error handling completo sin crashes

---

## 🔗 Dependencias

### Épicas Previas Requeridas
- ✅ Epic #9: Base de Datos y Estructura de Datos
- ✅ Epic #21: Integración LLM y Procesamiento de Lenguaje Natural
- ✅ Epic #34: Motor de Recomendaciones Inteligente

### Épicas Posteriores
- ⬜ Epic #73: Integración Completa y Deployment

---

## 📝 Notas Técnicas

### Consideraciones de Implementación

1. **Contexto de Sesión**: El pipeline debe mantener el contexto completo de la sesión para que el LLM pueda generar respuestas contextuales.

2. **Caching Inteligente**: No cachear respuestas personalizadas (con restricciones dietarias), solo respuestas genéricas.

3. **Timeouts Escalonados**: 
   - LLM: 5s
   - DB: 2s
   - Total request: 10s

4. **Fallbacks**:
   - Si LLM falla → respuesta genérica
   - Si recommendations falla → respuesta sin recomendaciones
   - Si session update falla → log error pero continuar

5. **Paralelización**: Identificar operaciones que pueden ejecutarse en paralelo para reducir latencia total.

---

## 🎓 Aprendizajes de Epic #34

Aplicar las mejores prácticas aprendidas:
- ✅ Documentación exhaustiva desde el inicio
- ✅ Tests críticos antes de implementación completa
- ✅ Type safety con TypeScript strict
- ✅ Validación robusta con Zod
- ✅ Actualización continua de Azure DevOps

---

**Última Actualización**: 20 de Octubre de 2025  
**Autor**: AI Assistant + Equipo de Desarrollo  
**Versión**: 1.0
