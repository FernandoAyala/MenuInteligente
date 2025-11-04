# Resumen Técnico del Proyecto "Menú Inteligente"

## 1. Arquitectura General
- Implementación inicial basada en un monolito modular con TypeScript y Node.js que organiza configuración, modelos, repositorios, servicios, controladores, rutas, sockets y utilidades según lo documentado en `SETUP.md`.
- El servidor Express integra Socket.io para comunicación en tiempo real, aplica middleware de seguridad (CORS, validación con Zod) y expone un punto de salud estándar.
- El ecosistema de desarrollo incluye TypeScript estricto, ESLint, Prettier, Jest, Supertest, soporte para hot reload y scripts de construcción y análisis.

## 2. Gestión de Datos y Firebase
- Firestore almacena entidades clave como `menuItems`, `conversationSessions` y `orders`, respaldadas por repositorios con operaciones CRUD completas (`SETUP.md`, `ORDERS_SYSTEM.md`).
- La configuración requiere credenciales de servicio (`CONFIG_FIREBASE.md`) y un conjunto de índices simples y compuestos para optimizar filtrados por disponibilidad, categoría, precio y restricciones dietarias (`FIRESTORE_INDEXES.md`).
- La lógica de recomendación (Epic 34) aplica un filtrado de seguridad previo, scoring híbrido configurable y auditoría detallada antes de involucrar modelos LLM, con cobertura de pruebas que valida alérgenos, dietas y consistencia de resultados (`EPIC_34_RESUMEN_IMPLEMENTACION.md`).

## 3. Servicios Inteligentes y LLM
- El subsistema LLM adopta el patrón Adapter para OpenAI y Google Gemini, centralizado por una fábrica y un servicio de alto nivel que permite cambiar de proveedor en tiempo de ejecución sin alterar el resto de la aplicación (`LLM_IMPLEMENTATION_SUMMARY.md`, `PROVIDERS.md`).
- La API expone rutas REST para listar proveedores, consultar el proveedor activo y ejecutar pruebas de inferencia, mientras que el servicio ofrece operaciones especializadas (conversación contextual, extracción de intenciones, recomendaciones asistidas).
- Se documentan prácticas para mitigar rate limiting de Gemini, incluyendo delays automatizados, alternativas de ejecución y estrategias de mocking para pruebas (`RATE_LIMIT_SOLUTIONS.md`).

## 4. Experiencia Conversacional y Voz
- La historia de usuario 88 entrega un chat en tiempo real con Socket.io, reconexión automática, fallback HTTP y manejo consistente de estados de mensaje, errores y sesiones (`US_88_CHAT_TIEMPO_REAL.md`).
- Los hooks `useChatService` y `useWebSocket` coordinan transporte dual y persistencia de historial; el contenedor del chat integra carrito de compras real y comandos de voz.
- El asistente de voz añade captura de voz a texto, síntesis de respuestas, ajustes de voz y accesibilidad visual sin depender de servicios externos (procesamiento local con Web Speech API) (`VOICE_FEATURES.md`).

## 5. Flujo de Pedidos y Orquestación
- `ORDERS_SYSTEM.md` y `FRONTEND_BACKEND_INTEGRATION.md` detallan el flujo end-to-end: confirmación de pedidos desde el chat, creación de órdenes en Firestore, emisión de eventos WebSocket y visualización en el tablero de cocina.
- El panel de comandas React consume servicios REST y WebSocket para sincronizar estados, ofrece filtros, métricas en vivo y soporte para acciones críticas (iniciar, completar, servir, cancelar).
- El controlador de chat limpia carritos tras la confirmación, actualiza métricas temporales y genera logs, mientras que el servicio de órdenes calcula totales y tiempos estimados.

## 6. Pruebas y Calidad
- La guía de ejecución (`TEST_EXECUTION_GUIDE.md`) describe cómo ejecutar suites completas o filtradas, los ajustes de Jest (timeouts extendidos, delays condicionales) y la cobertura lograda en la integración LLM.
- Las pruebas unitarias y de integración abarcan filtrado de seguridad, scoring, manejo de sessions, providers y resiliencia ante respuestas variables del modelo.
- Se recomienda combinar mocks para componentes no deterministas con ejecuciones reales controladas para validar la orquestación completa.

## 7. DevOps y Deployment
- `AZURE_DEVOPS_INTEGRATION.md` y `AZURE_DEVOPS_STATUS.md` documentan la vinculación de commits con work items, el estado de épicas y tareas, y las prácticas de mensajes de commit.
- La guía de deployment describe un pipeline hacia Azure Container Apps con prerequisitos (Azure CLI, azd, Docker), infraestructura asociada (ACR, Key Vault, Application Insights, Log Analytics) y scripts para creación, actualización, escalado y rollback (`DEPLOYMENT.md`).
- Se incluye un modelo de pipeline de Azure DevOps que automatiza build, pruebas, empaquetado de imagen y despliegue, incorporando validaciones de secretos y monitoreo post-deploy.

## 8. Documentos Complementarios Destacados
- `INTEGRATION_SUMMARY.md` resume entregables clave de la integración frontend-backend (servicios, hooks, componentes, variables de entorno) y checklist de pruebas recomendadas.
- `SERVICES.md` y `PROVIDERS.md` aclaran la organización de servicios API y adaptadores, reforzando la modularidad.
- Archivos de épicas y historias (por ejemplo, `EPIC_34_*`, `US_89_*`) ofrecen trazabilidad de alcance, criterios de aceptación y estado de cada iniciativa.

## 9. Próximas Líneas de Trabajo Sugeridas
- Finalizar tareas pendientes de Epic 34 (score semántico con LLM, optimizaciones de Firestore y experimentación A/B).
- Integrar el componente de confirmación de pedidos directamente en el flujo de chat y habilitar notificaciones avanzadas en el tablero de cocina (`INTEGRATION_SUMMARY.md`).
- Evaluar migración a OpenAI u otro proveedor de mayor cuota para acelerar pruebas o, alternativamente, fortalecer suites basadas en mocks para CI/CD (`RATE_LIMIT_SOLUTIONS.md`).
- Completar la publicación en Azure siguiendo la guía de deployment y formalizar monitoreo continuo mediante Application Insights y dashboards de Logs.
