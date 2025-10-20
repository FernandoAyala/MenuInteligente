import express, { Application } from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { config } from './config/env.config';
import { initializeFirebase } from './config/firebase.config';

// Inicialización de la aplicación Express
const app: Application = express();
const httpServer = createServer(app);

// Configuración de Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: config.allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors({ origin: config.allowedOrigins }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Inicializar Firebase
initializeFirebase();

// Importar rutas
import llmRoutes from './routes/llm.routes';
import recommendationsRoutes from './routes/recommendations.route';
import chatRoutes from './routes/chat.routes';

// Importar middleware de error handling
import { errorHandler, notFoundHandler } from './middleware/error-handler.middleware';

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Menu Inteligente API' 
  });
});

// Rutas de la API
app.use('/api/chat', chatRoutes); // Epic #60: API Conversacional
app.use('/api/llm', llmRoutes);
app.use('/api/recommendations', recommendationsRoutes);

// Middleware de manejo de errores (DEBE ir al final)
app.use(notFoundHandler); // 404 para rutas no encontradas
app.use(errorHandler); // Global error handler

// Socket.io connection handling
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

export { app, io };
