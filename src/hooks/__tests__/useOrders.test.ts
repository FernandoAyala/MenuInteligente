/**
 * Tests para useOrders hook
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useOrders } from '../useOrders';
import { ordersService, OrderStatus } from '../../services/api/ordersService';
import { io } from 'socket.io-client';
import type { Command } from '../../commandpage/types/command.types';

// Mock de socket.io-client
const mockSocket = {
  emit: jest.fn(),
  on: jest.fn(),
  disconnect: jest.fn(),
  connected: false,
};

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}));

// Mock del servicio de órdenes
jest.mock('../../services/api/ordersService', () => ({
  ordersService: {
    getActiveOrders: jest.fn(),
    updateOrderStatus: jest.fn(),
    getOrdersByStatus: jest.fn(),
  },
  OrderStatus: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    PREPARING: 'preparing',
    READY: 'ready',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
  },
}));

const mockOrdersService = ordersService as jest.Mocked<typeof ordersService>;
const mockIo = io as jest.MockedFunction<typeof io>;

describe('useOrders', () => {
  const mockOrders: Command[] = [
    {
      id: 'order-1',
      tableNumber: 1,
      timestamp: new Date('2024-01-01T10:00:00Z'),
      dishes: [
        {
          id: 'dish-1',
          name: 'Pizza Margherita',
          category: 'main',
          price: 1200,
          quantity: 2,
          specifications: ['Sin aceitunas'],
        },
      ],
      status: 'confirmed',
      totalAmount: 2400,
      customerNotes: 'Mesa cerca de la ventana',
      estimatedTime: 20,
    },
    {
      id: 'order-2',
      tableNumber: 2,
      timestamp: new Date('2024-01-01T10:05:00Z'),
      dishes: [
        {
          id: 'dish-2',
          name: 'Hamburguesa Classic',
          category: 'main',
          price: 1500,
          quantity: 1,
          specifications: [],
        },
      ],
      status: 'preparing',
      totalAmount: 1500,
      estimatedTime: 15,
    },
  ];

  let socketEventHandlers: { [key: string]: Function } = {};

  beforeEach(() => {
    jest.clearAllMocks();
    socketEventHandlers = {};
    
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();

    // Configurar mock del socket
    mockSocket.on.mockImplementation((event: string, handler: Function) => {
      socketEventHandlers[event] = handler;
      return mockSocket;
    });

    mockSocket.emit.mockReturnValue(mockSocket);
    mockSocket.disconnect.mockReturnValue(mockSocket);

    mockIo.mockReturnValue(mockSocket as any);

    // Mock de variables de entorno
    Object.defineProperty(import.meta, 'env', {
      value: { VITE_API_URL: 'http://localhost:3000' },
      writable: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Inicialización', () => {
    it('debe tener valores iniciales correctos', () => {
      mockOrdersService.getActiveOrders.mockResolvedValue([]);

      const { result } = renderHook(() => useOrders());

      expect(result.current.orders).toEqual([]);
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBe(null);
      expect(result.current.connected).toBe(false);
      expect(typeof result.current.refreshOrders).toBe('function');
      expect(typeof result.current.updateOrderStatus).toBe('function');
      expect(typeof result.current.getOrdersByStatus).toBe('function');
    });

    it('debe configurar WebSocket correctamente', () => {
      mockOrdersService.getActiveOrders.mockResolvedValue([]);

      renderHook(() => useOrders());

      expect(mockIo).toHaveBeenCalledWith('http://localhost:3000', {
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('join-kitchen-board');
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
    });

    it('debe cargar órdenes iniciales', async () => {
      mockOrdersService.getActiveOrders.mockResolvedValue(mockOrders);

      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockOrdersService.getActiveOrders).toHaveBeenCalled();
      expect(result.current.orders).toEqual(mockOrders);
      expect(result.current.error).toBe(null);
    });

    it('debe manejar errores al cargar órdenes iniciales', async () => {
      const errorMessage = 'Error de conexión';
      mockOrdersService.getActiveOrders.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.orders).toEqual([]);
      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('Eventos WebSocket', () => {
    it('debe manejar evento de conexión', async () => {
      mockOrdersService.getActiveOrders.mockResolvedValue([]);

      const { result } = renderHook(() => useOrders());

      act(() => {
        socketEventHandlers['connect']();
      });

      expect(result.current.connected).toBe(true);
      expect(console.log).toHaveBeenCalledWith('✅ WebSocket conectado');
    });

    it('debe manejar evento de desconexión', async () => {
      mockOrdersService.getActiveOrders.mockResolvedValue([]);

      const { result } = renderHook(() => useOrders());

      // Conectar primero
      act(() => {
        socketEventHandlers['connect']();
      });

      // Luego desconectar
      act(() => {
        socketEventHandlers['disconnect']();
      });

      expect(result.current.connected).toBe(false);
      expect(console.log).toHaveBeenCalledWith('❌ WebSocket desconectado');
    });

    it('debe manejar nueva orden creada', async () => {
      mockOrdersService.getActiveOrders.mockResolvedValue([]);

      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newOrder = {
        id: 'order-new',
        tableNumber: 5,
        createdAt: new Date(),
        dishes: [{ menuItemId: 'dish-1', name: 'Test Dish', price: 1000, quantity: 1 }],
        status: 'confirmed',
        totalAmount: 1000,
      };

      act(() => {
        socketEventHandlers['order:created']({ order: newOrder });
      });

      expect(result.current.orders).toHaveLength(1);
      expect(result.current.orders[0].id).toBe('order-new');
      expect(result.current.orders[0].tableNumber).toBe(5);
    });

    it('debe manejar actualización de estado de orden', async () => {
      mockOrdersService.getActiveOrders.mockResolvedValue(mockOrders);

      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.orders).toEqual(mockOrders);
      });

      const updatedOrder = {
        ...mockOrders[0],
        status: 'ready',
      };

      act(() => {
        socketEventHandlers['order:status-changed']({
          order: updatedOrder,
          previousStatus: 'confirmed',
        });
      });

      expect(result.current.orders[0].status).toBe('ready');
    });

    it('debe manejar orden actualizada', async () => {
      mockOrdersService.getActiveOrders.mockResolvedValue(mockOrders);

      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.orders).toEqual(mockOrders);
      });

      const updatedOrder = {
        ...mockOrders[0],
        customerNotes: 'Nueva nota',
      };

      act(() => {
        socketEventHandlers['order:updated']({ order: updatedOrder });
      });

      expect(result.current.orders[0].customerNotes).toBe('Nueva nota');
    });

    it('debe manejar orden eliminada', async () => {
      mockOrdersService.getActiveOrders.mockResolvedValue(mockOrders);

      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.orders).toEqual(mockOrders);
      });

      act(() => {
        socketEventHandlers['order:deleted']({ orderId: 'order-1' });
      });

      expect(result.current.orders).toHaveLength(1);
      expect(result.current.orders[0].id).toBe('order-2');
    });
  });

  describe('refreshOrders', () => {
    it('debe recargar órdenes exitosamente', async () => {
      const initialOrders = [mockOrders[0]];
      mockOrdersService.getActiveOrders
        .mockResolvedValueOnce(initialOrders)
        .mockResolvedValueOnce(mockOrders);

      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.orders).toEqual(initialOrders);
      });

      await act(async () => {
        await result.current.refreshOrders();
      });

      expect(result.current.orders).toEqual(mockOrders);
      expect(result.current.error).toBe(null);
    });

    it('debe manejar errores al recargar', async () => {
      mockOrdersService.getActiveOrders
        .mockResolvedValueOnce([])
        .mockRejectedValueOnce(new Error('Error de red'));

      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.refreshOrders();
      });

      expect(result.current.error).toBe('Error de red');
    });
  });

  describe('updateOrderStatus', () => {
    it('debe actualizar estado de orden exitosamente', async () => {
      const updatedOrder = { ...mockOrders[0], status: 'ready' as Command['status'] };
      mockOrdersService.getActiveOrders.mockResolvedValue(mockOrders);
      mockOrdersService.updateOrderStatus.mockResolvedValue(updatedOrder);

      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.orders).toEqual(mockOrders);
      });

      await act(async () => {
        await result.current.updateOrderStatus('order-1', OrderStatus.READY);
      });

      expect(mockOrdersService.updateOrderStatus).toHaveBeenCalledWith(
        'order-1',
        OrderStatus.READY
      );

      // Verificar actualización optimista primero
      expect(result.current.orders[0].status).toBe('ready');
    });

    it('debe revertir cambios en caso de error', async () => {
      mockOrdersService.getActiveOrders.mockResolvedValue(mockOrders);
      mockOrdersService.updateOrderStatus.mockRejectedValue(new Error('Error de API'));

      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.orders).toEqual(mockOrders);
      });

      await act(async () => {
        try {
          await result.current.updateOrderStatus('order-1', OrderStatus.READY);
        } catch (error) {
          // Error esperado
        }
      });

      expect(result.current.error).toBe('Error de API');
      expect(mockOrdersService.getActiveOrders).toHaveBeenCalledTimes(2); // Una inicial, una para revertir
    });
  });

  describe('getOrdersByStatus', () => {
    it('debe filtrar órdenes por estado', async () => {
      const readyOrders = mockOrders.filter(order => order.status === 'ready');
      mockOrdersService.getActiveOrders.mockResolvedValue(mockOrders);
      mockOrdersService.getOrdersByStatus.mockResolvedValue(readyOrders);

      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.orders).toEqual(mockOrders);
      });

      await act(async () => {
        await result.current.getOrdersByStatus(OrderStatus.READY);
      });

      expect(mockOrdersService.getOrdersByStatus).toHaveBeenCalledWith(OrderStatus.READY);
    });

    it('debe manejar errores al filtrar', async () => {
      mockOrdersService.getActiveOrders.mockResolvedValue(mockOrders);
      mockOrdersService.getOrdersByStatus.mockRejectedValue(new Error('Error de filtro'));

      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.orders).toEqual(mockOrders);
      });

      await act(async () => {
        await result.current.getOrdersByStatus(OrderStatus.READY);
      });

      expect(result.current.error).toBe('Error de filtro');
    });
  });

  describe('Transformación de datos WebSocket', () => {
    it('debe transformar datos de WebSocket correctamente', async () => {
      mockOrdersService.getActiveOrders.mockResolvedValue([]);

      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const webSocketOrder = {
        id: 'ws-order-1',
        tableNumber: 10,
        createdAt: new Date('2024-01-01T12:00:00Z'),
        dishes: [
          {
            menuItemId: 'menu-1',
            name: 'Pasta Carbonara',
            price: 1800,
            quantity: 1,
            specialInstructions: 'Sin bacon',
          },
        ],
        status: 'confirmed',
        totalAmount: 1800,
        customerNotes: 'Para llevar',
        estimatedTime: 25,
      };

      act(() => {
        socketEventHandlers['order:created']({ order: webSocketOrder });
      });

      const transformedOrder = result.current.orders[0];
      expect(transformedOrder.id).toBe('ws-order-1');
      expect(transformedOrder.tableNumber).toBe(10);
      expect(transformedOrder.dishes[0].id).toBe('menu-1');
      expect(transformedOrder.dishes[0].specifications).toEqual(['Sin bacon']);
      expect(transformedOrder.status).toBe('confirmed');
    });

    it('debe manejar datos incompletos de WebSocket', async () => {
      mockOrdersService.getActiveOrders.mockResolvedValue([]);

      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const incompleteOrder = {
        id: 'incomplete-order',
        tableNumber: 5,
        // Sin dishes, status, etc.
      };

      act(() => {
        socketEventHandlers['order:created']({ order: incompleteOrder });
      });

      const transformedOrder = result.current.orders[0];
      expect(transformedOrder.id).toBe('incomplete-order');
      expect(transformedOrder.dishes).toEqual([]);
      expect(transformedOrder.status).toBe('pending');
    });
  });

  describe('Cleanup', () => {
    it('debe limpiar WebSocket al desmontar', () => {
      mockOrdersService.getActiveOrders.mockResolvedValue([]);

      const { unmount } = renderHook(() => useOrders());

      unmount();

      expect(mockSocket.emit).toHaveBeenCalledWith('leave-kitchen-board');
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('Casos de uso realistas', () => {
    it('debe manejar flujo completo de orden (crear -> actualizar -> eliminar)', async () => {
      mockOrdersService.getActiveOrders.mockResolvedValue([]);

      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Crear nueva orden
      const newOrder = {
        id: 'flow-order',
        tableNumber: 7,
        status: 'confirmed',
        totalAmount: 2000,
      };

      act(() => {
        socketEventHandlers['order:created']({ order: newOrder });
      });

      expect(result.current.orders).toHaveLength(1);

      // Actualizar estado
      const updatedOrder = { ...newOrder, status: 'preparing' };

      act(() => {
        socketEventHandlers['order:status-changed']({
          order: updatedOrder,
          previousStatus: 'confirmed',
        });
      });

      expect(result.current.orders[0].status).toBe('preparing');

      // Eliminar orden
      act(() => {
        socketEventHandlers['order:deleted']({ orderId: 'flow-order' });
      });

      expect(result.current.orders).toHaveLength(0);
    });

    it('debe manejar múltiples órdenes concurrentes', async () => {
      mockOrdersService.getActiveOrders.mockResolvedValue([]);

      const { result } = renderHook(() => useOrders());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Crear múltiples órdenes
      const orders = [
        { id: 'order-a', tableNumber: 1, status: 'confirmed' },
        { id: 'order-b', tableNumber: 2, status: 'preparing' },
        { id: 'order-c', tableNumber: 3, status: 'ready' },
      ];

      orders.forEach(order => {
        act(() => {
          socketEventHandlers['order:created']({ order });
        });
      });

      expect(result.current.orders).toHaveLength(3);

      // Actualizar estado de orden específica
      act(() => {
        socketEventHandlers['order:status-changed']({
          order: { ...orders[1], status: 'ready' },
          previousStatus: 'preparing',
        });
      });

      const orderB = result.current.orders.find(o => o.id === 'order-b');
      expect(orderB?.status).toBe('ready');

      // Verificar que otras órdenes no se afectaron
      const orderA = result.current.orders.find(o => o.id === 'order-a');
      const orderC = result.current.orders.find(o => o.id === 'order-c');
      expect(orderA?.status).toBe('confirmed');
      expect(orderC?.status).toBe('ready');
    });
  });
});