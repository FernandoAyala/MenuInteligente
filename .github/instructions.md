# DevOps
- Herramienta: AzureDevOps
- Organización: IAAplicada-Grupo8
- Proyecto: MenuInteligente

# Metodología
- Template Agile
- Desarrollo incremental con integración continua

# Arquitectura
- Tipo: Monolito modular (Backend + SPA)
- Servidor: Express.js como API REST, WebScoket (Socket.io)
- Capas del Backend:
		- Routes/Controllers -> Manejo de endpoints 
		- Services -> lógica de negocio
		- Repositories -> Acceso a Firestore.
- Integraciones: 
	- LLM: (Gemini 2.0)
	- Base de Datos: Firestore
	- Tiempo Real: Socket.io (Pendiente)
- Seguridad: 
	- Sin CORS (Backend y Frontend integrados)
	- Autenticación simple para tener historial del cliente.

# Backend
- Lenguaje: TypeScript
- Runtime: Node.js 18+
- Framework: Express.js + Socket.io (Pendiente)
- Validación: Zod
- Base de Datos: firebase-admin SDK (Firestore)
- Endpoints clave (MVP):
	- POST /api/chat (endpoint conversacional principal)
	- GET /api/sessions/:id (Gestión de sesiones)
	- GET /health (Salud del sistema)
- Configuración (ENV): GEMINI_API_KEY, FIREBASE_PROJECT_ID

# Frontend
- Plataforma: Web
- Lenguaje: TypeScript
- Stack:
	- Vite + React para interfaz de chat
	- Socket.io-client para comunicación tiempo real (Pendiente)
	- UI: Tailwind CSS para estilos
	- Estado: useState + useEffect
	- Build: vite build genera carpeta dist/  
	- Servicio: Express sirve dist/ en producción con express.static()
- Hosting: Render

# Database
- Servicio: Firestore (Firebase/Google Cloud), modo Native
- Acceso: firebase-admin SDK (Node/TS)
- Colecciones MVP:
	- menuItems: { id, name, description, price, currency, category, spicyLevel, isVegan, isVegetarian, isGlutenFree, allergens[], available, createdAt }
	- conversationSessions: { id, startedAt, updatedAt, slots, messages[], cart }
- Índices básicos: available (simple), price (simple); crear según necesidad en desarrollo.

# Testing
- Backend: Jest + supertest para endpoints
- Frontend: Jest para componentes
- Calidad: ESLint + Prettier
- E2E: Cypress 

# Deployment
- Despliegue: Render (Web Service)
- Base de datos: Firestore

# IA
- Proveedor: Gemini
- Modelo: Gemini-2.0
- Estrategia MVP: 
	- Prompt engineering básico
	- Filtrado por reglas
	- Sin embedding
- Funciones: Extracción de intenciones + generación de respuestas conversacionales + justificaciones de recomendaciones
- Rate Limiting: Caching de respuestas frecuentes para optimizar costos

# Nomenclatura
- Código en Ingles
- Variables y funciones en camelCase
- Clases en PascalCase
- Constantes en Mayúsculas
- Comentarios y documentación en Español
- Documentación en la carpeta './docs'

