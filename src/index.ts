import cors from 'cors';
import express, { Application } from 'express';
import { createServer } from 'http';
import path from 'path';
import { existsSync } from 'fs';
import { Server } from 'socket.io';
import { config } from './config/env.config';
import { initializeFirebase } from './config/firebase.config';

// Inicialización de la aplicación Express
const app: Application = express();
const httpServer = createServer(app);

// Función para validar origen CORS
const validateOrigin = (origin: string | undefined): boolean => {
  if (!origin) return true; // Permitir requests sin origin (mobile apps, curl)
  
  const allowedOrigins = config.allowedOrigins;
  
  // Verificar lista de orígenes permitidos
  if (allowedOrigins.some(allowed => allowed === '*' || origin === allowed)) {
    return true;
  }
  
  // Permitir automáticamente dominios de Firebase Hosting
  if (origin.includes('.web.app') || origin.includes('.firebaseapp.com')) {
    return true;
  }
  
  console.warn(`CORS blocked origin: ${origin}`);
  return false;
};

// Configuración de CORS para Express
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    callback(null, validateOrigin(origin));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

// Configuración de Socket.io con soporte para múltiples frontends
const io = new Server(httpServer, {
  cors: {
    origin: validateOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  },
});

// Middleware de CORS
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Inicializar Firebase
initializeFirebase();

// Importar rutas
import analyticsRoutes from './routes/analytics.routes';
import chatRoutes from './routes/chat.routes';
import healthRoutes from './routes/health.routes'; // US#74 Task#79: Monitoring
import llmRoutes from './routes/llm.routes';
import menuItemRoutes from './routes/menuItem.routes';
import ordersRoutes from './routes/orders.routes';
import recommendationsRoutes from './routes/recommendations.route';
import sessionRoutes from './routes/session.routes';

// Importar middleware de error handling
import { errorHandler, notFoundHandler } from './middleware/error-handler.middleware';

// Root endpoint - información de la API
app.get('/', (_req, res) => {
  res.status(200).json({
    name: 'Menu Inteligente API',
    version: '1.0.0',
    environment: config.nodeEnv,
    endpoints: {
      health: '/health',
      healthDetailed: '/health/detailed',
      metrics: '/metrics',
      metricsPerformance: '/metrics/performance',
      chat: '/api/chat',
      llm: '/api/llm',
      recommendations: '/api/recommendations',
      orders: '/api/orders',
      sessions: '/api/sessions',
      menuItems: '/api/menu-items',
      analytics: '/api/analytics'
    },
    frontend: config.nodeEnv === 'production' 
      ? 'Serving static files' 
      : 'Running on http://localhost:5173'
  });
});

// Rutas de la API
app.use('/api/analytics', analyticsRoutes); // Análisis de ventas con IA
app.use('/api/chat', chatRoutes); // Epic #60: API Conversacional
app.use('/api/llm', llmRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/orders', ordersRoutes); // Gestión de comandas/pedidos
app.use('/api/sessions', sessionRoutes); // Gestión de sesiones
app.use('/api/menu-items', menuItemRoutes); // Items del menú
app.use('/health', healthRoutes); // US#74 Task#79: Health checks y métricas
app.use('/metrics', healthRoutes); // US#74 Task#79: Métricas de performance

// Servir archivos estáticos del frontend (PRODUCCIÓN - solo si existe el directorio)
// En Railway, el frontend está separado en Firebase Hosting
if (config.nodeEnv === 'production') {
  const frontendPath = path.join(__dirname, '../dist-frontend');
  
  // Solo servir archivos estáticos si el directorio existe
  if (existsSync(frontendPath)) {
    // Servir archivos estáticos
    app.use(express.static(frontendPath));
    
    // 404 solo para rutas API no encontradas
    app.use('/api/*', notFoundHandler);
    
    // SPA fallback - todas las rutas no-API devuelven index.html
    app.get('*', (_req, res) => {
      res.sendFile(path.join(frontendPath, 'index.html'));
    });
  } else {
    // Backend API only (Railway/Cloud deployment)
    console.log('📡 Modo API only: Frontend en Firebase Hosting');
    
    // 404 para rutas API no encontradas
    app.use('/api/*', notFoundHandler);
    
    // Cualquier otra ruta no-API devuelve info de la API
    app.all('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
        hint: 'This is an API-only backend. Frontend is hosted separately.'
      });
    });
  }
} else {
  // En desarrollo, el frontend corre en Vite (puerto 5173)
  console.log('💻 Modo desarrollo: Frontend en http://localhost:5173');
  
  // 404 para rutas API no encontradas
  app.use('/api/*', notFoundHandler);
  
  // Cualquier otra ruta no-API en desarrollo devuelve info
  app.all('*', (req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.method} ${req.path} not found`,
      hint: config.nodeEnv === 'development' 
        ? 'Frontend is running on http://localhost:5173' 
        : 'Invalid route'
    });
  });
}

// Global error handler (SIEMPRE al final)
app.use(errorHandler);

// Importar y configurar socket de comandas
import { initializeOrderSocket } from './sockets/order.socket';

// Socket.io connection handling
initializeOrderSocket(io);

io.on('connection', (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`Cliente desconectado: ${socket.id}`);
  });
});

// Iniciar servidor
const PORT = config.port;
httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
  console.log(`📡 Entorno: ${config.nodeEnv}`);
  console.log(`🔥 Firebase proyecto: ${config.firebase.projectId}`);
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // No cerrar el proceso en producción para que el healthcheck pueda funcionar
  if (config.nodeEnv !== 'production') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // No cerrar el proceso en producción
  if (config.nodeEnv !== 'production') {
    process.exit(1);
  }
});

export { app, io };

