# DevOps
- Herramienta: AzureDevOps
- Organización: IAAplicada-Grupo8
- Proyecto: MenuInteligente

# Metodología
- Template Agile
- Desarrollo incremental con integración continua

# Arquitectura
- Tipo: Monolito modular con API REST + WebSocket + SPA de chat.
- Capas: Routes/Controllers (API) / Services (lógica de negocio) / Repositories (Firestore).
- Integraciones: LLM (Azure OpenAI) + DB (Firestore) + Socket.io para tiempo real
- Seguridad: CORS restringido, autenticación simple para MVP.

# Backend
- Lenguaje: TypeScript
- Runtime: Node.js 18+
- Framework: Express.js + Socket.io (para chat tiempo real)
- Validación: Zod para requests
- SDK/Query: firebase-admin (Firestore) con DAOs simples
- Observabilidad: Logs básicos + métricas simples
- Seguridad: CORS restringido
- Build/Dev: npm con ts-node-dev (hot reload)
- Endpoints clave (MVP):
	- POST /api/chat (endpoint conversacional principal)
	- GET /api/sessions/:id (gestión de sesiones)
	- GET /health (salud del sistema)
- Configuración (ENV): OPENAI_API_KEY, FIREBASE_PROJECT_ID, GOOGLE_APPLICATION_CREDENTIALS, FIREBASE_EMULATOR_HOST (dev), PORT, NODE_ENV

# Frontend
- Plataforma: Web
- Lenguaje: TypeScript
- Stack:
	- Vite + React para interfaz de chat
	- Socket.io-client para comunicación tiempo real
	- UI: Tailwind CSS para estilos
	- Estado: React Query + useState para gestión de chat
- Hosting: estático (Vercel/Netlify)

# Database
- Servicio: Firestore (Firebase/Google Cloud), modo Native
- Acceso: firebase-admin SDK (Node/TS)
- Colecciones MVP:
	- menuItems: { id, name, description, price, currency, category, spicyLevel, isVegan, isVegetarian, isGlutenFree, allergens[], available, createdAt }
	- conversationSessions: { id, startedAt, updatedAt, slots, messages[], cart }
- Índices básicos: available (simple), price (simple); crear según necesidad en desarrollo.

# Testing
- Backend: Jest + supertest para endpoints
- Frontend: Jest + Testing Library para componentes de chat
- Calidad: ESLint + Prettier
- E2E: Testing manual de flujos conversacionales principales

# Deployment
- Backend: Railway/Heroku con Docker
- Frontend: Vercel/Netlify (estático)
- Base de datos: Firestore (cloud managed)
- Configuración: Variables de entorno documentadas
- Monitoring: Logs básicos + health check endpoint

# IA
- Proveedor: OpenAI / Gemini
- NLU/NLG: GPT-4o-mini (balanceando costo/latencia para MVP)
- Estrategia MVP: Prompt engineering + filtrado por reglas (sin embeddings inicialmente)
- Funciones: Extracción de intenciones + generación de respuestas conversacionales + justificaciones de recomendaciones
- Rate Limiting: Caching de respuestas frecuentes para optimizar costos

# Nomenclatura
- Código en Ingles
- Variables y funciones en camelCase
- Clases en PascalCase
- Constantes en Mayúsculas
- Comentarios y documentación en Español
- Documentación en la carpeta './docs'

# Idioma
- Responde siempre en Español

