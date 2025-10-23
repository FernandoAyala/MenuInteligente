import {
    CreateOrderDto,
    DailyOrderStats,
    Order,
    OrderDish,
    OrderStatus,
    UpdateOrderStatusDto,
} from '../models/order.model';
import { CartItem } from '../models/session.model';
import { MenuItemRepository } from '../repositories/menuItem.repository';
import orderRepository, { OrderRepository } from '../repositories/order.repository';
import { getOrderSocketHandler } from '../sockets/order.socket';

/**
 * Servicio para gestionar comandas/pedidos
 */
export class OrderService {
  private orderRepository: OrderRepository;
  private menuItemRepository: MenuItemRepository;

  constructor(repository: OrderRepository = orderRepository) {
    this.orderRepository = repository;
    this.menuItemRepository = new MenuItemRepository();
  }

  /**
   * Crear una nueva comanda desde el carrito del usuario
   */
  async createFromCart(
    tableNumber: number,
    sessionId: string,
    cartItems: CartItem[],
    customerNotes?: string,
  ): Promise<Order> {
    // Obtener información completa de los items del menú
    const dishes: OrderDish[] = [];

    for (const item of cartItems) {
      const menuItem = await this.menuItemRepository.findById(item.menuItemId);

      if (!menuItem) {
        throw new Error(`Menu item not found: ${item.menuItemId}`);
      }

      if (!menuItem.available) {
        throw new Error(`Menu item not available: ${menuItem.name}`);
      }

      const specifications: string[] = [];
      
      // Agregar restricciones dietéticas como especificaciones
      if (menuItem.isVegan) specifications.push('Vegano');
      if (menuItem.isVegetarian) specifications.push('Vegetariano');
      if (menuItem.isGlutenFree) specifications.push('Sin gluten');
      if (menuItem.spicyLevel && menuItem.spicyLevel > 0) {
        specifications.push(`Picante nivel ${menuItem.spicyLevel}`);
      }

      dishes.push({
        menuItemId: menuItem.id,
        name: menuItem.name,
        quantity: item.quantity,
        price: menuItem.price,
        specifications: specifications.length > 0 ? specifications : undefined,
        specialInstructions: item.specialInstructions,
      });
    }

    const createOrderDto: CreateOrderDto = {
      tableNumber,
      sessionId,
      dishes,
      customerNotes,
      estimatedTime: this.calculateEstimatedTime(dishes),
    };

    const order = await this.orderRepository.create(createOrderDto);

    // Notificar a través de WebSocket
    try {
      const socketHandler = getOrderSocketHandler();
      socketHandler.notifyOrderCreated(order);
    } catch (error) {
      // Si el socket no está inicializado, continuar sin error
      console.warn('Could not notify order creation via WebSocket:', error);
    }

    return order;
  }

  /**
   * Obtener una comanda por ID
   */
  async getById(id: string): Promise<Order | null> {
    return await this.orderRepository.findById(id);
  }

  /**
   * Obtener todas las comandas activas (para el tablero de cocina)
   */
  async getActiveOrders(): Promise<Order[]> {
    return await this.orderRepository.findActive();
  }

  /**
   * Obtener comandas por estado
   */
  async getOrdersByStatus(status: OrderStatus): Promise<Order[]> {
    return await this.orderRepository.findByStatus(status);
  }

  /**
   * Obtener comandas de una mesa
   */
  async getOrdersByTable(tableNumber: number): Promise<Order[]> {
    return await this.orderRepository.findByTable(tableNumber);
  }

  /**
   * Obtener comandas de una sesión
   */
  async getOrdersBySession(sessionId: string): Promise<Order[]> {
    return await this.orderRepository.findBySession(sessionId);
  }

  /**
   * Actualizar el estado de una comanda
   */
  async updateStatus(id: string, status: OrderStatus, cancelReason?: string): Promise<Order> {
    const order = await this.orderRepository.findById(id);

    if (!order) {
      throw new Error(`Order not found: ${id}`);
    }

    const previousStatus = order.status;

    // Validar transiciones de estado
    this.validateStatusTransition(order.status, status);

    const updateDto: UpdateOrderStatusDto = {
      status,
      cancelReason,
    };

    const updatedOrder = await this.orderRepository.updateStatus(id, updateDto);

    if (!updatedOrder) {
      throw new Error(`Failed to update order: ${id}`);
    }

    // Notificar a través de WebSocket
    try {
      const socketHandler = getOrderSocketHandler();
      socketHandler.notifyOrderStatusChanged(updatedOrder, previousStatus);
    } catch (error) {
      console.warn('Could not notify order status change via WebSocket:', error);
    }

    return updatedOrder;
  }

  /**
   * Obtener estadísticas del día
   */
  async getDailyStats(date: Date = new Date()): Promise<DailyOrderStats> {
    return await this.orderRepository.getDailyStats(date);
  }

  /**
   * Obtener comandas del día
   */
  async getTodayOrders(): Promise<Order[]> {
    return await this.orderRepository.findByDate(new Date());
  }

  /**
   * Cancelar una comanda
   */
  async cancelOrder(id: string, reason: string): Promise<Order> {
    return await this.updateStatus(id, OrderStatus.CANCELLED, reason);
  }

  /**
   * Calcular tiempo estimado de preparación basado en los platos
   */
  private calculateEstimatedTime(dishes: OrderDish[]): number {
    // Tiempo base por plato (en minutos)
    const baseTimePerDish = 10;
    const maxTime = 45;
    const minTime = 15;

    const totalDishes = dishes.reduce((sum, dish) => sum + dish.quantity, 0);
    const estimatedTime = Math.min(maxTime, Math.max(minTime, totalDishes * baseTimePerDish));

    return estimatedTime;
  }

  /**
   * Validar transiciones de estado permitidas
   */
  private validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): void {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.IN_PROGRESS, OrderStatus.CANCELLED],
      [OrderStatus.IN_PROGRESS]: [OrderStatus.READY, OrderStatus.CANCELLED],
      [OrderStatus.READY]: [OrderStatus.SERVED, OrderStatus.CANCELLED],
      [OrderStatus.SERVED]: [], // Estado final
      [OrderStatus.CANCELLED]: [], // Estado final
    };

    const allowedTransitions = validTransitions[currentStatus];

    if (!allowedTransitions.includes(newStatus)) {
      throw new Error(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  /**
   * Obtener tiempo de preparación real de una comanda
   */
  getPreparationTime(order: Order): number | null {
    if (!order.startedAt || !order.readyAt) {
      return null;
    }

    const startTime = new Date(order.startedAt).getTime();
    const readyTime = new Date(order.readyAt).getTime();

    return Math.round((readyTime - startTime) / 60000); // En minutos
  }

  /**
   * Obtener tiempo de espera actual de una comanda
   */
  getWaitingTime(order: Order): number {
    const now = new Date().getTime();
    const createdTime = new Date(order.createdAt).getTime();

    return Math.round((now - createdTime) / 60000); // En minutos
  }
}

export default new OrderService();
