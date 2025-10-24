import { Server, Socket } from 'socket.io';
import { Order, OrderStatus } from '../models/order.model';
import { logger } from '../utils/logger';

/**
 * Eventos que el servidor puede emitir al cliente
 */
export enum OrderSocketEvents {
  // Servidor -> Cliente
  ORDER_CREATED = 'order:created',
  ORDER_UPDATED = 'order:updated',
  ORDER_STATUS_CHANGED = 'order:status-changed',
  ORDER_DELETED = 'order:deleted',
  ORDERS_LIST = 'orders:list',
  
  // Cliente -> Servidor
  JOIN_KITCHEN = 'kitchen:join',
  LEAVE_KITCHEN = 'kitchen:leave',
  REQUEST_ORDERS = 'orders:request',
  UPDATE_ORDER_STATUS = 'order:update-status',
}

/**
 * Gestiona las conexiones WebSocket para el tablero de comandas
 */
export class OrderSocketHandler {
  private io: Server;
  private kitchenRoom = 'kitchen-board';

  constructor(io: Server) {
    this.io = io;
    this.setupSocketHandlers();
  }

  /**
   * Configura los manejadores de eventos de Socket.io
   */
  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      logger.info('Client connected to orders socket', { socketId: socket.id });

      // Cliente se une al tablero de cocina
      socket.on(OrderSocketEvents.JOIN_KITCHEN, () => {
        socket.join(this.kitchenRoom);
        logger.info('Client joined kitchen board', { socketId: socket.id });
        
        socket.emit('kitchen:joined', {
          message: 'Successfully joined kitchen board',
          room: this.kitchenRoom
        });
      });

      // Cliente sale del tablero de cocina
      socket.on(OrderSocketEvents.LEAVE_KITCHEN, () => {
        socket.leave(this.kitchenRoom);
        logger.info('Client left kitchen board', { socketId: socket.id });
      });

      // Cliente solicita lista de comandas
      socket.on(OrderSocketEvents.REQUEST_ORDERS, async () => {
        logger.info('Client requested orders list', { socketId: socket.id });
        // La lógica de obtener órdenes se manejará desde el componente
        // que usa el servicio de orders
      });

      // Desconexión
      socket.on('disconnect', () => {
        logger.info('Client disconnected from orders socket', { socketId: socket.id });
      });
    });
  }

  /**
   * Emitir evento cuando se crea una nueva comanda
   */
  notifyOrderCreated(order: Order): void {
    logger.info('Broadcasting new order', { orderId: order.id, table: order.tableNumber });
    
    this.io.to(this.kitchenRoom).emit(OrderSocketEvents.ORDER_CREATED, {
      order,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Emitir evento cuando se actualiza una comanda
   */
  notifyOrderUpdated(order: Order): void {
    logger.info('Broadcasting order update', { orderId: order.id });
    
    this.io.to(this.kitchenRoom).emit(OrderSocketEvents.ORDER_UPDATED, {
      order,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Emitir evento cuando cambia el estado de una comanda
   */
  notifyOrderStatusChanged(order: Order, previousStatus: OrderStatus): void {
    logger.info('Broadcasting order status change', {
      orderId: order.id,
      from: previousStatus,
      to: order.status
    });
    
    this.io.to(this.kitchenRoom).emit(OrderSocketEvents.ORDER_STATUS_CHANGED, {
      order,
      previousStatus,
      newStatus: order.status,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Emitir evento cuando se elimina una comanda
   */
  notifyOrderDeleted(orderId: string): void {
    logger.info('Broadcasting order deletion', { orderId });
    
    this.io.to(this.kitchenRoom).emit(OrderSocketEvents.ORDER_DELETED, {
      orderId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Enviar lista completa de comandas activas
   */
  sendOrdersList(orders: Order[]): void {
    this.io.to(this.kitchenRoom).emit(OrderSocketEvents.ORDERS_LIST, {
      orders,
      count: orders.length,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Obtener número de clientes conectados al tablero de cocina
   */
  async getKitchenBoardClients(): Promise<number> {
    const sockets = await this.io.in(this.kitchenRoom).fetchSockets();
    return sockets.length;
  }
}

let orderSocketHandler: OrderSocketHandler | null = null;

/**
 * Inicializar el manejador de sockets de comandas
 */
export function initializeOrderSocket(io: Server): OrderSocketHandler {
  if (!orderSocketHandler) {
    orderSocketHandler = new OrderSocketHandler(io);
    logger.info('Order socket handler initialized');
  }
  return orderSocketHandler;
}

/**
 * Obtener instancia del manejador de sockets
 */
export function getOrderSocketHandler(): OrderSocketHandler {
  if (!orderSocketHandler) {
    throw new Error('Order socket handler not initialized. Call initializeOrderSocket first.');
  }
  return orderSocketHandler;
}

export default {
  initializeOrderSocket,
  getOrderSocketHandler
};
