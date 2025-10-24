import { v4 as uuidv4 } from 'uuid';
import { getFirestore } from '../config/firebase.config';
import {
    CreateOrderDto,
    DailyOrderStats,
    Order,
    OrderStatus,
    UpdateOrderStatusDto,
} from '../models/order.model';

const COLLECTION_NAME = 'orders';

/**
 * Repository para gestionar comandas/pedidos en Firestore
 */
export class OrderRepository {
  private db: FirebaseFirestore.Firestore;
  private collection: FirebaseFirestore.CollectionReference;

  constructor() {
    this.db = getFirestore();
    this.collection = this.db.collection(COLLECTION_NAME);
  }

  /**
   * Crear una nueva comanda
   */
  async create(data: CreateOrderDto): Promise<Order> {
    const now = new Date();
    const orderId = uuidv4();

    // Calcular el monto total
    const totalAmount = data.dishes.reduce((sum, dish) => sum + (dish.price * dish.quantity), 0);

    const order: Omit<Order, 'id'> = {
      ...data,
      totalAmount,
      status: OrderStatus.PENDING,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = this.collection.doc(orderId);
    await docRef.set(order);

    return {
      id: orderId,
      ...order,
    };
  }

  /**
   * Obtener una comanda por ID
   */
  async findById(id: string): Promise<Order | null> {
    const doc = await this.collection.doc(id).get();

    if (!doc.exists) {
      return null;
    }

    return this.mapToOrder(doc);
  }

  /**
   * Obtener todas las comandas activas (no servidas ni canceladas)
   */
  async findActive(): Promise<Order[]> {
    const snapshot = await this.collection
      .where('status', 'in', [OrderStatus.PENDING, OrderStatus.IN_PROGRESS, OrderStatus.READY])
      .orderBy('createdAt', 'asc')
      .get();

    return snapshot.docs.map(doc => this.mapToOrder(doc));
  }

  /**
   * Obtener todas las comandas
   */
  async findAll(limit?: number): Promise<Order[]> {
    let query = this.collection.orderBy('createdAt', 'desc');

    if (limit) {
      query = query.limit(limit) as FirebaseFirestore.Query;
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => this.mapToOrder(doc));
  }

  /**
   * Obtener comandas por estado
   */
  async findByStatus(status: OrderStatus): Promise<Order[]> {
    const snapshot = await this.collection
      .where('status', '==', status)
      .orderBy('createdAt', 'asc')
      .get();

    return snapshot.docs.map(doc => this.mapToOrder(doc));
  }

  /**
   * Obtener comandas por número de mesa
   */
  async findByTable(tableNumber: number): Promise<Order[]> {
    const snapshot = await this.collection
      .where('tableNumber', '==', tableNumber)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => this.mapToOrder(doc));
  }

  /**
   * Obtener comandas por sesión
   */
  async findBySession(sessionId: string): Promise<Order[]> {
    const snapshot = await this.collection
      .where('sessionId', '==', sessionId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => this.mapToOrder(doc));
  }

  /**
   * Actualizar el estado de una comanda
   */
  async updateStatus(id: string, data: UpdateOrderStatusDto): Promise<Order | null> {
    const docRef = this.collection.doc(id);
    const now = new Date();

    const updateData: Record<string, unknown> = {
      status: data.status,
      updatedAt: now,
    };

    // Agregar timestamp según el estado
    switch (data.status) {
      case OrderStatus.IN_PROGRESS:
        updateData.startedAt = now;
        break;
      case OrderStatus.READY:
        updateData.readyAt = now;
        break;
      case OrderStatus.SERVED:
        updateData.servedAt = now;
        break;
      case OrderStatus.CANCELLED:
        updateData.cancelledAt = now;
        if (data.cancelReason) {
          updateData.cancelReason = data.cancelReason;
        }
        break;
    }

    await docRef.update(updateData);

    const doc = await docRef.get();
    if (!doc.exists) {
      return null;
    }

    return this.mapToOrder(doc);
  }

  /**
   * Obtener comandas del día
   */
  async findByDate(date: Date): Promise<Order[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const snapshot = await this.collection
      .where('createdAt', '>=', startOfDay)
      .where('createdAt', '<=', endOfDay)
      .orderBy('createdAt', 'asc')
      .get();

    return snapshot.docs.map(doc => this.mapToOrder(doc));
  }

  /**
   * Obtener estadísticas del día
   */
  async getDailyStats(date: Date): Promise<DailyOrderStats> {
    const orders = await this.findByDate(date);

    const stats: DailyOrderStats = {
      date: date.toISOString().split('T')[0],
      totalOrders: orders.length,
      totalRevenue: 0,
      averagePreparationTime: 0,
      ordersByStatus: {
        [OrderStatus.PENDING]: 0,
        [OrderStatus.IN_PROGRESS]: 0,
        [OrderStatus.READY]: 0,
        [OrderStatus.SERVED]: 0,
        [OrderStatus.CANCELLED]: 0,
      },
      popularDishes: [],
      peakHours: [],
    };

    if (orders.length === 0) {
      return stats;
    }

    // Calcular estadísticas
    const dishCounts = new Map<string, number>();
    const hourCounts = new Map<number, number>();
    let totalPreparationTime = 0;
    let preparedOrdersCount = 0;

    orders.forEach(order => {
      // Revenue total
      stats.totalRevenue += order.totalAmount;

      // Contar por estado
      stats.ordersByStatus[order.status]++;

      // Platos populares
      order.dishes.forEach(dish => {
        const currentCount = dishCounts.get(dish.name) || 0;
        dishCounts.set(dish.name, currentCount + dish.quantity);
      });

      // Horas pico
      const hour = new Date(order.createdAt).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);

      // Tiempo de preparación (solo para órdenes servidas o listas)
      if (order.readyAt && order.startedAt) {
        const prepTime = (new Date(order.readyAt).getTime() - new Date(order.startedAt).getTime()) / 60000;
        totalPreparationTime += prepTime;
        preparedOrdersCount++;
      }
    });

    // Calcular promedio de tiempo de preparación
    if (preparedOrdersCount > 0) {
      stats.averagePreparationTime = Math.round(totalPreparationTime / preparedOrdersCount);
    }

    // Top 10 platos populares
    stats.popularDishes = Array.from(dishCounts.entries())
      .map(([dishName, count]) => ({ dishName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Horas pico
    stats.peakHours = Array.from(hourCounts.entries())
      .map(([hour, orderCount]) => ({ hour, orderCount }))
      .sort((a, b) => b.orderCount - a.orderCount);

    return stats;
  }

  /**
   * Eliminar una comanda (soft delete o hard delete según necesidad)
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.collection.doc(id).delete();
      return true;
    } catch (error) {
      console.error('Error deleting order:', error);
      return false;
    }
  }

  /**
   * Mapear documento de Firestore a objeto Order
   */
  private mapToOrder(doc: FirebaseFirestore.DocumentSnapshot): Order {
    const data = doc.data() as Omit<Order, 'id'>;

    return {
      id: doc.id,
      ...data,
      createdAt: this.toDate(data.createdAt),
      updatedAt: this.toDate(data.updatedAt),
      startedAt: data.startedAt ? this.toDate(data.startedAt) : undefined,
      readyAt: data.readyAt ? this.toDate(data.readyAt) : undefined,
      servedAt: data.servedAt ? this.toDate(data.servedAt) : undefined,
      cancelledAt: data.cancelledAt ? this.toDate(data.cancelledAt) : undefined,
    };
  }

  /**
   * Convertir Timestamp de Firestore a Date
   */
  private toDate(timestamp: unknown): Date {
    if (timestamp instanceof Date) {
      return timestamp;
    }
    if (typeof timestamp === 'object' && timestamp !== null && 'toDate' in timestamp) {
      return (timestamp as FirebaseFirestore.Timestamp).toDate();
    }
    return new Date(timestamp as string);
  }
}

export default new OrderRepository();
