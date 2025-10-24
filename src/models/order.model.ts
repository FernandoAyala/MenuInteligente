/**
 * Estado de la comanda
 */
export enum OrderStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in-progress',
  READY = 'ready',
  SERVED = 'served',
  CANCELLED = 'cancelled',
}

/**
 * Plato dentro de una comanda
 */
export interface OrderDish {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  specifications?: string[];
  specialInstructions?: string;
}

/**
 * Modelo de una comanda/pedido
 */
export interface Order {
  id: string;
  tableNumber: number;
  sessionId: string; // Relacionado con la sesión de chat
  status: OrderStatus;
  dishes: OrderDish[];
  totalAmount: number;
  customerNotes?: string;
  estimatedTime?: number; // En minutos
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date; // Cuando comenzó la preparación
  readyAt?: Date; // Cuando estuvo listo
  servedAt?: Date; // Cuando fue servido
  cancelledAt?: Date;
  cancelReason?: string;
}

/**
 * DTO para crear una nueva comanda
 */
export interface CreateOrderDto {
  tableNumber: number;
  sessionId: string;
  dishes: OrderDish[];
  customerNotes?: string;
  estimatedTime?: number;
}

/**
 * DTO para actualizar el estado de una comanda
 */
export interface UpdateOrderStatusDto {
  status: OrderStatus;
  cancelReason?: string;
}

/**
 * Estadísticas de comandas del día
 */
export interface DailyOrderStats {
  date: string;
  totalOrders: number;
  totalRevenue: number;
  averagePreparationTime: number; // En minutos
  ordersByStatus: Record<OrderStatus, number>;
  popularDishes: Array<{
    dishName: string;
    count: number;
  }>;
  peakHours: Array<{
    hour: number;
    orderCount: number;
  }>;
}
