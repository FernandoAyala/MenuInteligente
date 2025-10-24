/**
 * Hook para gestionar las comandas con actualización en tiempo real vía WebSocket
 */

import { useCallback, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import type { Command } from '../commandpage/types/command.types';
import { ordersService, OrderStatus } from '../services/api/ordersService';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface UseOrdersReturn {
  orders: Command[];
  loading: boolean;
  error: string | null;
  refreshOrders: () => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  getOrdersByStatus: (status: OrderStatus) => Promise<void>;
  connected: boolean;
}

/**
 * Transformar datos del WebSocket al formato Command
 */
const transformWebSocketOrder = (order: any): Command => {
  // Normalizar el estado (trim y lowercase para comparación)
  const normalizedStatus = (order.status || 'pending').toString().trim();
  
  console.log('🔄 Transformando orden WebSocket:', {
    id: order.id,
    statusOriginal: order.status,
    statusNormalizado: normalizedStatus,
    statusType: typeof order.status,
  });
  
  return {
    id: order.id,
    tableNumber: order.tableNumber,
    timestamp: order.createdAt || new Date(),
    dishes: (order.dishes || []).map((dish: any) => ({
      id: dish.menuItemId,
      name: dish.name,
      category: 'main' as const,
      price: dish.price || 0,
      quantity: dish.quantity,
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
 * Hook para gestionar comandas con sincronización en tiempo real
 */
export const useOrders = (): UseOrdersReturn => {
  const [orders, setOrders] = useState<Command[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean>(false);

  // Conectar al WebSocket
  useEffect(() => {
    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    // Unirse a la sala de la brigada
    socketInstance.emit('join-kitchen-board');

    // Eventos de conexión
    socketInstance.on('connect', () => {
      console.log('✅ WebSocket conectado');
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('❌ WebSocket desconectado');
      setConnected(false);
    });

    socketInstance.on('connect_error', (err) => {
      console.error('Error de conexión WebSocket:', err);
      setConnected(false);
    });

    // Eventos de comandas
    socketInstance.on('order:created', (data: { order: Command }) => {
      console.log('🆕 Nueva comanda recibida:', data.order);
      const transformedOrder = transformWebSocketOrder(data.order);
      setOrders((prev) => [transformedOrder, ...prev]);
    });

    socketInstance.on('order:status-changed', (data: { order: Command; previousStatus: string }) => {
      console.log('🔄 Estado de comanda actualizado:', data.order.id, data.previousStatus, '->', data.order.status);
      console.log('🔄 Orden completa recibida:', data.order);
      const transformedOrder = transformWebSocketOrder(data.order);
      console.log('🔄 Orden transformada:', transformedOrder);
      setOrders((prev) => {
        const updated = prev.map((order) => (order.id === transformedOrder.id ? transformedOrder : order));
        console.log('🔄 Estado de órdenes actualizado:', updated.find(o => o.id === transformedOrder.id));
        return updated;
      });
    });

    socketInstance.on('order:updated', (data: { order: Command }) => {
      console.log('✏️ Comanda actualizada:', data.order);
      const transformedOrder = transformWebSocketOrder(data.order);
      setOrders((prev) =>
        prev.map((order) => (order.id === transformedOrder.id ? transformedOrder : order))
      );
    });

    socketInstance.on('order:deleted', (data: { orderId: string }) => {
      console.log('🗑️ Comanda eliminada:', data.orderId);
      setOrders((prev) => prev.filter((order) => order.id !== data.orderId));
    });

    // Cleanup al desmontar
    return () => {
      socketInstance.emit('leave-kitchen-board');
      socketInstance.disconnect();
    };
  }, []);

  // Cargar comandas iniciales
  const refreshOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ordersService.getActiveOrders();
      setOrders(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar las comandas';
      setError(errorMessage);
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar comandas al montar
  useEffect(() => {
    refreshOrders();
  }, [refreshOrders]);

  // Actualizar estado de una comanda
  const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus) => {
    try {
      setError(null);
      console.log(`🔄 Hook: Actualizando estado de ${orderId} a ${status}`);
      
      // Actualización optimista: actualizar el estado local inmediatamente
      setOrders((prev) => 
        prev.map((order) => 
          order.id === orderId 
            ? { ...order, status: status as Command['status'] }
            : order
        )
      );
      
      // Llamar al servicio para persistir en el backend
      const updatedOrder = await ordersService.updateOrderStatus(orderId, status);
      console.log(`✅ Hook: Orden actualizada desde API:`, updatedOrder);
      
      // Actualizar con los datos reales del servidor (por si hay diferencias)
      setOrders((prev) => 
        prev.map((order) => 
          order.id === orderId ? updatedOrder : order
        )
      );
      
      // La actualización también llegará vía WebSocket (redundante pero asegura sincronización)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar el estado';
      setError(errorMessage);
      console.error('❌ Hook: Error updating order status:', err);
      
      // Revertir a estado original si falla
      await refreshOrders();
      throw err;
    }
  }, [refreshOrders]);

  // Filtrar comandas por estado
  const getOrdersByStatus = useCallback(async (status: OrderStatus) => {
    try {
      setLoading(true);
      setError(null);
      const data = await ordersService.getOrdersByStatus(status);
      setOrders(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al filtrar comandas';
      setError(errorMessage);
      console.error('Error getting orders by status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    orders,
    loading,
    error,
    refreshOrders,
    updateOrderStatus,
    getOrdersByStatus,
    connected,
  };
};

export default useOrders;
