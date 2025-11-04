# Arquitectura del Proyecto "Menú Inteligente"

## 1. Visión General
- **Tipo de solución:** Monolito modular TypeScript/Node.js con frontend React + Vite y backend Express.
- **Dominios principales:** Orquestación conversacional con IA, gestión de comandas en tiempo real, motor de recomendaciones y capacidades de voz en el frontend.
- **Perfiles de usuario:** Las y los clientes interactúan con el chat conversacional; la brigada de cocina opera el tablero de comandas.
- **Integraciones clave:** Firestore (persistencia), Firebase Admin SDK, Socket.io, proveedores LLM (OpenAI / Google Gemini), pipelines Azure DevOps / Azure Container Apps.

```
┌───────────────────────────┐
│        Frontend (Vite)    │
│  • React + Hooks          │
│  • Chat/Voice UX          │
│    (Clientes)             │
│  • Tablero de Comandas    │
│    (Brigada de cocina)    │
└───────────────────────────┘
    │
    │ HTTP / WebSocket
    ▼
┌──────────────────────────┐
│     Backend (Express)    │
│  • REST + Socket.io      │
│  • LLM + Recomendaciones │
│  • Firestore Repos       │
└──────────────────────────┘
  │             │
  │             ▼
  │      ┌────────────────┐
  │      │   Firestore    │
  │      └────────────────┘
  │
  ▼
┌───────────────────────┐
│ Proveedores de LLM    │
│ (OpenAI / Gemini)     │
└───────────────────────┘
```

## 2. Backend: Capas y Responsabilidades

| Capa / Directorio | Rol | Archivos destacados |
|-------------------|-----|----------------------|
| `routes/` | Define endpoints REST (Chat, Orders, LLM, Recommendations, Sessions) | `chat.routes.ts`, `orders.routes.ts` |
| `controllers/` | Orquestación de flujo y validaciones de alto nivel | `chat.controller.ts`, `llm.controller.ts` |
| `services/` | Lógica de negocio reutilizable | `order.service.ts`, `recommendation.service.ts`, `llm.service.ts`, `cache.service.ts`, `metrics.service.ts` |
| `repositories/` | Acceso a Firestore, traducción de documentos a modelos | `menuItem.repository.ts`, `session.repository.ts`, `order.repository.ts` |
| `models/` | Entidades y contratos de dominio | `menuItem.model.ts`, `session.model.ts`, `order.model.ts` |
| `interfaces/` | Tipos compartidos y contratos (LLM, recomendaciones, chat) | `llm.interface.ts`, `recommendation.interface.ts` |
| `sockets/` | Gestión de Socket.io para comandas | `order.socket.ts` |
| `middleware/` | Cross-cutting concerns | `rate-limit.middleware.ts`, `validation.middleware.ts`, `error-handler.middleware.ts` |

### 2.1 Flujo del Endpoint de Chat (`POST /api/chat`)
1. **Repositorio de Sesiones** recupera/crea sesión (`SessionRepository`).
2. **LLM Service** intenta extraer intenciones (con fallback por keywords si hay timeout).
3. **ChatController** actualiza *slots* conversacionales y deriva a acciones (`ChatActionType`).
4. **RecommendationService** genera sugerencias si aplica, tras filtrado de seguridad (alérgenos/dietas) y scoring híbrido.
5. **OrderService** agrega items al carrito, atiende PLACE_ORDER y emite a cocina cuando corresponde.
6. **Cache/Metrics Service** registran tiempos de respuesta y estadísticas.
7. **Respuesta consolidada** incluye mensaje natural, acciones, recomendaciones y metadatos.

### 2.2 Motor de Recomendaciones (Epic #34)
- **Filtro crítico antes del LLM:** `filterBySafety()` descarta platos inseguros.
- **Scoring híbrido:** combina seguridad, dieta, presupuesto, preferencias, disponibilidad (semantic scoring hoy deshabilitado para evitar rate limits).
- **Diversidad:** penaliza repetición de categorías.
- **Auditoría:** `RecommendationLogger` guarda decisiones y tiempos.
- **Tests (18/18):** validan alergias, dietas, puntuación y edge cases.

### 2.3 Gestión de Comandas
- **OrderService** crea, actualiza y cancela pedidos; calcula tiempos estimados y garantiza transiciones válidas.
- **OrderRepository** persiste en Firestore y construye estadísticas (`getDailyStats`).
- **OrderSocketHandler** avisa por Socket.io de eventos `order:created`, `order:status-changed`, etc.

### 2.4 Sub-sistema LLM
- Patrón Adapter (`providers/`): `OpenAIProvider`, `GeminiProvider`, `LLMProviderFactory`.
- `LLMService` expone operaciones de alto nivel (chat contextual, extracción de intenciones, recomendaciones asistidas).
- Configurable vía `env.config.ts` y `.env`: se puede alternar proveedor en runtime.
- `RATE_LIMIT_SOLUTIONS.md` documenta mitigaciones (delays, mocks, uso de OpenAI, etc.).

## 3. Frontend: Capas y Hooks

| Módulo | Función | Archivos |
|--------|---------|----------|
| **Chat Conversacional** | UI, gestión de historial, integración voz | `components/ChatContainer.tsx`, `components/MessageBubble.tsx`, `hooks/useChatService.ts`, `hooks/useWebSocket.ts` |
| **Pedidos en Tiempo Real** | Tablero de cocina, WebSocket + REST | `commandpage/componentsCommand/CommandsBoard.tsx`, `hooks/useOrders.ts`, `services/api/ordersService.ts` |
| **Recomendaciones** | Carrusel, filtros, calificaciones | `components/RecommendationsPanel.tsx`, `hooks/useRecommendations.ts`, `services/api/recommendationService.ts` |
| **Carrito y Confirmación** | Flujo desde chat -> pedido | `components/CartPanel.tsx`, `components/OrderConfirmation.tsx`, `hooks/useConfirmOrder.ts`, `services/api/ordersService.ts` |
| **Voz** | Entrada (Speech-to-Text), salida (Text-to-Speech), ajustes | `hooks/useSpeechRecognition.ts`, `hooks/useTextToSpeech.ts`, `components/VoiceInputButton.tsx`, `VoiceOutputButton.tsx`, `VoiceSettings.tsx` |

### 3.1 ChatContainer
- Usa `useChatService` para orquestar HTTP/WS (fallback HTTP activo hasta habilitar WebSocket backend).
- `useShoppingCart` (en `useWebSocket.ts`) sincroniza carrito con localStorage y sesión.
- Maneja comandos de voz (`useVoiceCommands`) y auto-scroll, estados de typing y reconexión.

### 3.2 Tablero de Cocina
- `useOrders` carga comandas iniciales vía REST y escucha eventos WebSocket.
- `CommandsBoard.tsx` ofrece filtros por estado, ordenamiento, métricas y actualización manual.
- `CommandCard.tsx` expone acciones (iniciar, listo, servido) que llaman a `ordersService.updateOrderStatus` y confían en eventos en tiempo real.

### 3.3 Hooks y Servicios API
- `services/api/client.ts` centraliza axios con logging y manejo de errores.
- `services/api/*` encapsulan endpoints REST (chat, órdenes, recomendaciones, LLM).
- `hooks/index.ts` re-exporta hooks para uso uniforme.
- `useRecommendations` soporta auto-fetch, filtros, calificaciones y trending.

## 4. Persistencia y Datos

| Entidad | Colección Firestore | Campos clave |
|---------|---------------------|--------------|
| `menuItems` | Disponibilidad de platos | `available`, `price`, `category`, banderas dietéticas |
| `conversationSessions` | Historial de chat | `slots` (preferencias), `cart`, `messages` |
| `orders` | Comandas | `status`, `dishes`, `totalAmount`, timestamps por fase |

- Índices documentados en `FIRESTORE_INDEXES.md` (combos por categoría, disponibilidad, precio, banderas dietéticas).
- `config/serviceAccountKey.json` requerido (ver `CONFIG_FIREBASE.md`).
- Scripts en `src/scripts/` para seeds y utilidades (ej. `seed-menu.ts`, `create-test-order.ts`).

## 5. Comunicación en Tiempo Real
- **Socket.io Server:** `order.socket.ts` se inicializa en bootstrap del backend; usa sala `kitchen-board`.
- **Eventos soportados:**
  - `kitchen:join`, `kitchen:leave` (cliente -> servidor)
  - `order:created`, `order:status-changed`, `order:updated`, `order:deleted`, `orders:list` (servidor -> clientes)
- **Frontend:** `useOrders` abre conexión, gestiona reconexión y actualiza estado local.
- **Estado actual del chat:** `useChatService` soporta WebSocket, pero `ChatContainer` lo mantiene deshabilitado hasta que exista backend estable para `/chat`.

## 6. Características de Voz
- Basadas en Web Speech API (procesamiento local):
  - `useSpeechRecognition` gestiona micrófono, transcripciones y estados.
  - `useTextToSpeech` sintetiza respuestas del bot con configuración persistente (voz, tono, velocidad, volumen).
  - Componentes UI (`VoiceInputButton`, `VoiceOutputButton`, `VoiceSettings`) proveen controles accesibles y feedback visual.
- Compatible con Chrome/Edge/Safari (entrada + salida) y Firefox (salida).

## 7. DevOps y Despliegue
- **Azure DevOps**:
  - Vinculación de commits con work items (`AZURE_DEVOPS_INTEGRATION.md`).
  - Estado actual del proyecto (`AZURE_DEVOPS_STATUS.md`).
- **Despliegue** (`DEPLOYMENT.md`):
  - Azure Container Apps + Azure Container Registry + Key Vault + Application Insights + Log Analytics.
  - Scripts `az` y `azd` para infraestructura y release.
  - Pipeline YAML de ejemplo: build (Node 18, tests, imagen Docker) → deploy (AzureContainerApps@1).
- **Configuración de entorno**:
  - `.env.example` documenta variables (`VITE_API_URL`, `VITE_WS_URL`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, etc.).
  - `Rate-limit` y timeouts ajustados en `jest.config.js` / `test` guide para correr suites sin superar cuotas de Gemini.

## 8. Consideraciones y Próximos Pasos
1. **WebSocket de Chat:** habilitar `enableWebSocket` en `ChatContainer` cuando el backend expose `namespace /chat` estable.
2. **Semantic Scoring:** completar Task #43 para reactivar `EnhancedLLMService` y sumar embeddings/semantic score.
3. **Optimización Firestore:** finalizar Tasks #39 y #45 (índices adicionales, caché selectivo) para queries de recomendaciones/órdenes.
4. **Monitoreo:** configurar dashboards en Application Insights/Log Analytics y alertas de health check.
5. **Tests:** mantener estrategia mixta (mocks + ejecuciones reales controladas) para CI; considerar migrar a proveedor con cuotas mayores si se requiere velocidad.

## 9. Referencias
- `TECHNICAL_SUMMARY.md`: resumen ejecutivo del estado actual.
- `FRONTEND_BACKEND_INTEGRATION.md`: guía detallada del flujo chat ↔ pedidos ↔ cocina.
- `ORDERS_SYSTEM.md`: especificación de estados de comandas y métricas.
- `EPIC_34_*`: documentación del motor de recomendaciones.
- `US_88_CHAT_TIEMPO_REAL.md`: implementación del chat tiempo real.
- `VOICE_FEATURES.md`: capacidades de voz y UX.
- `RATE_LIMIT_SOLUTIONS.md`, `TEST_EXECUTION_GUIDE.md`: mejores prácticas para pruebas.
