# Menu Inteligente - Mozo Virtual Conversacional

Sistema de mozo/camarero virtual que utiliza IA para entender preferencias del cliente y sugerir platos y bebidas en base al menú del restaurante.

## 🚀 Características

- **Conversación Natural**: Interfaz de chat con procesamiento de lenguaje natural
- **Recomendaciones Inteligentes**: Sistema de recomendación basado en preferencias y restricciones
- **Tiempo Real**: Comunicación bidireccional con Socket.io
- **Gestión de Restricciones**: Manejo de alergias, dietas especiales y presupuesto
- **Upselling Inteligente**: Sugerencias de combos y maridaje

## 🏗️ Arquitectura

- **Tipo**: Monolito modular con API REST + WebSocket
- **Capas**: 
  - Routes/Controllers (API)
  - Services (Lógica de negocio)
  - Repositories (Firestore)
- **Integraciones**: Azure OpenAI + Firestore + Socket.io

## 🛠️ Stack Tecnológico

### Backend
- **Runtime**: Node.js 18+
- **Lenguaje**: TypeScript
- **Framework**: Express.js + Socket.io
- **Base de Datos**: Firestore (Firebase)
- **IA**: Azure OpenAI (GPT-4o-mini)
- **Validación**: Zod

### Frontend
- **Framework**: React + Vite
- **Lenguaje**: TypeScript
- **UI**: Tailwind CSS
- **Estado**: React Query + Socket.io-client

## 📦 Instalación

### Pre-requisitos
- Node.js 18+
- npm o yarn
- Cuenta de Firebase
- API Key de OpenAI

### Setup del Proyecto

1. **Clonar el repositorio**
\`\`\`bash
git clone <repository-url>
cd TP_IAA
\`\`\`

2. **Instalar dependencias**
\`\`\`bash
npm install
\`\`\`

3. **Configurar variables de entorno**
\`\`\`bash
cp .env.example .env
# Editar .env con tus credenciales
\`\`\`

4. **Configurar Firebase**
   - Crear proyecto en Firebase Console
   - Habilitar Firestore Database
   - Descargar Service Account Key
   - Colocar en \`config/serviceAccountKey.json\`

5. **Ejecutar en modo desarrollo**
\`\`\`bash
npm run dev
\`\`\`

El servidor estará disponible en \`http://localhost:3000\`

## 📁 Estructura del Proyecto

\`\`\`
TP_IAA/
├── src/
│   ├── index.ts                 # Punto de entrada
│   ├── config/                  # Configuraciones
│   │   ├── firebase.config.ts
│   │   └── env.config.ts
│   ├── routes/                  # Endpoints API
│   │   ├── chat.routes.ts
│   │   └── session.routes.ts
│   ├── controllers/             # Controladores
│   ├── services/                # Lógica de negocio
│   │   ├── chat.service.ts
│   │   ├── recommendation.service.ts
│   │   └── llm.service.ts
│   ├── repositories/            # Acceso a datos
│   │   ├── menuItem.repository.ts
│   │   └── session.repository.ts
│   ├── models/                  # Tipos y modelos
│   ├── middleware/              # Middlewares Express
│   ├── utils/                   # Utilidades
│   └── sockets/                 # Handlers Socket.io
├── tests/                       # Tests
├── config/                      # Archivos de configuración
├── dist/                        # Build output
└── package.json
\`\`\`

## 🔧 Scripts Disponibles

\`\`\`bash
npm run dev          # Desarrollo con hot-reload
npm run build        # Compilar TypeScript
npm start            # Ejecutar producción
npm run lint         # Ejecutar ESLint
npm run format       # Formatear código con Prettier
npm test             # Ejecutar tests
npm run test:watch   # Tests en modo watch
\`\`\`

## 🔐 Variables de Entorno

Ver \`.env.example\` para todas las variables requeridas:

- \`NODE_ENV\`: Entorno de ejecución
- \`PORT\`: Puerto del servidor
- \`FIREBASE_PROJECT_ID\`: ID del proyecto Firebase
- \`GOOGLE_APPLICATION_CREDENTIALS\`: Ruta al Service Account Key
- \`OPENAI_API_KEY\`: API Key de OpenAI
- \`ALLOWED_ORIGINS\`: Orígenes permitidos para CORS

## 📊 Endpoints Principales (MVP)

- \`POST /api/chat\` - Endpoint conversacional principal
- \`GET /api/sessions/:id\` - Obtener sesión de conversación
- \`GET /health\` - Health check del sistema

## 🗄️ Modelos de Datos

### menuItems
\`\`\`typescript
{
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  spicyLevel?: number;
  isVegan: boolean;
  isVegetarian: boolean;
  isGlutenFree: boolean;
  allergens: string[];
  available: boolean;
  createdAt: Timestamp;
}
\`\`\`

### conversationSessions
\`\`\`typescript
{
  id: string;
  startedAt: Timestamp;
  updatedAt: Timestamp;
  slots: object;
  messages: Message[];
  cart: CartItem[];
}
\`\`\`

## 🧪 Testing

\`\`\`bash
# Ejecutar todos los tests
npm test

# Tests con coverage
npm run test:coverage

# Tests en modo watch
npm run test:watch
\`\`\`

## 🚀 Deployment

### Backend (Railway/Heroku)
1. Configurar variables de entorno en la plataforma
2. Conectar repositorio
3. Deploy automático desde main branch

### Frontend (Vercel/Netlify)
1. Build estático con \`npm run build\`
2. Deploy de carpeta \`dist\`

## 📝 Nomenclatura y Estándares

- Código en **Inglés**
- Variables y funciones en **camelCase**
- Clases en **PascalCase**
- Constantes en **MAYÚSCULAS**
- Comentarios y documentación en **Español**

## 👥 Equipo

Grupo 8 - Inteligencia Artificial Aplicada
Universidad Nacional de La Matanza

## 📄 Licencia

MIT License
