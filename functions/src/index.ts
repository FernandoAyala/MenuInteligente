import * as functions from 'firebase-functions';
import cors from 'cors';
import express, { Application } from 'express';
import * as admin from 'firebase-admin';

// Inicializar Firebase Admin
admin.initializeApp();

// Crear aplicación Express
const app: Application = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Importar rutas desde el proyecto principal
import analyticsRoutes from './routes/analytics.routes';
import chatRoutes from './routes/chat.routes';
import healthRoutes from './routes/health.routes';
import llmRoutes from './routes/llm.routes';
import menuItemRoutes from './routes/menuItem.routes';
import ordersRoutes from './routes/orders.routes';
import recommendationsRoutes from './routes/recommendations.route';
import sessionRoutes from './routes/session.routes';

// Importar middleware de error handling
import { errorHandler, notFoundHandler } from './middleware/error-handler.middleware';

// Root endpoint
app.get('/', (_req, res) => {
  res.status(200).json({
    name: 'Menu Inteligente API',
    version: '1.0.0',
    environment: 'production',
    endpoints: {
      health: '/health',
      healthDetailed: '/health/detailed',
      metrics: '/metrics',
      chat: '/chat',
      llm: '/llm',
      recommendations: '/recommendations',
      orders: '/orders',
      sessions: '/sessions',
      menuItems: '/menu-items',
      analytics: '/analytics'
    }
  });
});

// Rutas de la API (sin el prefijo /api ya que Cloud Functions lo maneja)
app.use('/analytics', analyticsRoutes);
app.use('/chat', chatRoutes);
app.use('/llm', llmRoutes);
app.use('/recommendations', recommendationsRoutes);
app.use('/orders', ordersRoutes);
app.use('/sessions', sessionRoutes);
app.use('/menu-items', menuItemRoutes);
app.use('/health', healthRoutes);
app.use('/metrics', healthRoutes);

// 404 para rutas no encontradas
app.use('*', notFoundHandler);

// Global error handler
app.use(errorHandler);

// Exportar la función HTTP para Cloud Functions
export const api = functions.https.onRequest(app);
