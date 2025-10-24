/**
 * Servicio API para gestión de comandas/pedidos
 * Conecta el frontend con el backend de órdenes
 */

import type { Command } from '../../commandpage/types/command.types';

// Tipo para crear comandas
export interface CreateOrderDto {
  tableNumber: number;
  dishes: {
    menuItemId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    specialInstructions?: string;
  }[];
  customerNotes?: string;
  sessionId?: string;
}

// Tipo para el estado de la orden
export type OrderStatus = 'pending' | 'in-progress' | 'ready' | 'served' | 'cancelled';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Transformar una orden del backend al formato del frontend (Command)
 */
const transformOrderToCommand = (order: any): Command => {
  // Normalizar el estado
  const normalizedStatus = (order.status || 'pending').toString().trim();
  
  console.log('📦 Transformando orden API:', {
    id: order.id,
    statusOriginal: order.status,
    statusNormalizado: normalizedStatus,
  });
  
  return {
    id: order.id,
    tableNumber: order.tableNumber,
    timestamp: order.createdAt || new Date(),
    dishes: order.dishes.map((dish: any) => ({
      id: dish.menuItemId,
      name: dish.name,
      category: 'main' as const, // Valor por defecto
      price: dish.price || 0,
      quantity: dish.quantity,
      // Transformar specialInstructions (string) a specifications (array)
      specifications: dish.specialInstructions 
        ? [dish.specialInstructions] 
        : (dish.specifications || []),
    })),
    status: normalizedStatus as Command['status'],
    totalAmount: order.totalAmount,
    customerNotes: order.customerNotes,
    estimatedTime: order.estimatedTime,
  };
};

/**
 * Servicio de órdenes para el frontend
 */
export const ordersService = {
  /**
   * Obtener todas las comandas activas
   */
  async getActiveOrders(): Promise<Command[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Error fetching orders: ${response.statusText}`);
      }

      const data = await response.json();
      const orders = data.data || [];
      return orders.map(transformOrderToCommand);
    } catch (error) {
      console.error('Error getting active orders:', error);
      throw error;
    }
  },

  /**
   * Obtener una comanda por ID
   */
  async getOrderById(orderId: string): Promise<Command> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Error fetching order: ${response.statusText}`);
      }

      const data = await response.json();
      return transformOrderToCommand(data.data);
    } catch (error) {
      console.error('Error getting order by ID:', error);
      throw error;
    }
  },

  /**
   * Obtener comandas por estado
   */
  async getOrdersByStatus(status: OrderStatus): Promise<Command[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/status/${status}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Error fetching orders by status: ${response.statusText}`);
      }

      const data = await response.json();
      const orders = data.data || [];
      return orders.map(transformOrderToCommand);
    } catch (error) {
      console.error('Error getting orders by status:', error);
      throw error;
    }
  },

  /**
   * Actualizar el estado de una comanda
   */
  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    cancelReason?: string
  ): Promise<Command> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, cancelReason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Error updating order status: ${response.statusText}`);
      }

      const data = await response.json();
      return transformOrderToCommand(data.data);
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  },

  /**
   * Confirmar pedido desde la sesión de chat
   */
  async confirmOrder(
    sessionId: string,
    tableNumber: number,
    customerNotes?: string
  ): Promise<Command> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/${sessionId}/confirm-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tableNumber, customerNotes }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Error confirming order: ${response.statusText}`);
      }

      const data = await response.json();
      return transformOrderToCommand(data.data.order);
    } catch (error) {
      console.error('Error confirming order:', error);
      throw error;
    }
  },

  /**
   * Crear comanda manualmente (sin sesión de chat)
   */
  async createOrder(orderData: CreateOrderDto): Promise<Command> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Error creating order: ${response.statusText}`);
      }

      const data = await response.json();
      return transformOrderToCommand(data.data);
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  },

  /**
   * Obtener comandas de una mesa
   */
  async getOrdersByTable(tableNumber: number): Promise<Command[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/table/${tableNumber}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Error fetching orders by table: ${response.statusText}`);
      }

      const data = await response.json();
      const orders = data.data || [];
      return orders.map(transformOrderToCommand);
    } catch (error) {
      console.error('Error getting orders by table:', error);
      throw error;
    }
  },

  /**
   * Obtener estadísticas del día
   */
  async getDailyStats(date?: string): Promise<any> {
    try {
      const url = date
        ? `${API_BASE_URL}/api/orders/stats/daily?date=${date}`
        : `${API_BASE_URL}/api/orders/stats/daily`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Error fetching daily stats: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error getting daily stats:', error);
      throw error;
    }
  },

  /**
   * Cancelar una comanda
   */
  async cancelOrder(orderId: string, reason: string): Promise<Command> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/cancel`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Error cancelling order: ${response.statusText}`);
      }

      const data = await response.json();
      return transformOrderToCommand(data.data);
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  },
};

export default ordersService;
