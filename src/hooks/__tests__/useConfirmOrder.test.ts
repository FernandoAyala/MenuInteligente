/**
 * Tests para useConfirmOrder hook
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useConfirmOrder } from '../useConfirmOrder';
import { ordersService } from '../../services/api/ordersService';
import type { Command } from '../../commandpage/types/command.types';

// Mock del servicio de órdenes
jest.mock('../../services/api/ordersService', () => ({
  ordersService: {
    confirmOrder: jest.fn(),
  },
}));

const mockOrdersService = ordersService as jest.Mocked<typeof ordersService>;

describe('useConfirmOrder', () => {
  const mockOrder: Command = {
    id: 'order-123',
    tableNumber: 5,
    totalAmount: 1500,
    estimatedTime: 20,
    sessionId: 'session-456',
    items: [],
    status: 'confirmed',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Estado inicial', () => {
    it('debe tener valores iniciales correctos', () => {
      const { result } = renderHook(() => useConfirmOrder());

      expect(result.current.confirming).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.confirmedOrder).toBe(null);
      expect(typeof result.current.confirmOrder).toBe('function');
      expect(typeof result.current.clearConfirmedOrder).toBe('function');
    });
  });

  describe('confirmOrder', () => {
    it('debe confirmar pedido exitosamente', async () => {
      mockOrdersService.confirmOrder.mockResolvedValue(mockOrder);

      const { result } = renderHook(() => useConfirmOrder());

      let returnedOrder: Command | null = null;

      await act(async () => {
        returnedOrder = await result.current.confirmOrder({
          sessionId: 'session-456',
          tableNumber: 5,
          customerNotes: 'Mesa cerca de la ventana',
        });
      });

      expect(mockOrdersService.confirmOrder).toHaveBeenCalledWith(
        'session-456',
        5,
        'Mesa cerca de la ventana'
      );

      expect(returnedOrder).toEqual(mockOrder);
      expect(result.current.confirming).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.confirmedOrder).toEqual(mockOrder);
    });

    it('debe confirmar pedido sin notas opcionales', async () => {
      mockOrdersService.confirmOrder.mockResolvedValue(mockOrder);

      const { result } = renderHook(() => useConfirmOrder());

      await act(async () => {
        await result.current.confirmOrder({
          sessionId: 'session-456',
          tableNumber: 3,
        });
      });

      expect(mockOrdersService.confirmOrder).toHaveBeenCalledWith(
        'session-456',
        3,
        undefined
      );
    });

    it('debe manejar errores durante la confirmación', async () => {
      const errorMessage = 'Error de conexión';
      mockOrdersService.confirmOrder.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useConfirmOrder());

      let returnedOrder: Command | null = null;

      await act(async () => {
        returnedOrder = await result.current.confirmOrder({
          sessionId: 'session-456',
          tableNumber: 5,
        });
      });

      expect(returnedOrder).toBe(null);
      expect(result.current.confirming).toBe(false);
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.confirmedOrder).toBe(null);
    });

    it('debe manejar errores no-Error', async () => {
      mockOrdersService.confirmOrder.mockRejectedValue('String error');

      const { result } = renderHook(() => useConfirmOrder());

      await act(async () => {
        await result.current.confirmOrder({
          sessionId: 'session-456',
          tableNumber: 5,
        });
      });

      expect(result.current.error).toBe('Error al confirmar el pedido');
    });

    it('debe limpiar error previo al confirmar nuevo pedido', async () => {
      // Primer intento - error
      mockOrdersService.confirmOrder.mockRejectedValueOnce(new Error('Error inicial'));

      const { result } = renderHook(() => useConfirmOrder());

      await act(async () => {
        await result.current.confirmOrder({
          sessionId: 'session-456',
          tableNumber: 5,
        });
      });

      expect(result.current.error).toBe('Error inicial');

      // Segundo intento - éxito
      mockOrdersService.confirmOrder.mockResolvedValue(mockOrder);

      await act(async () => {
        await result.current.confirmOrder({
          sessionId: 'session-456',
          tableNumber: 5,
        });
      });

      expect(result.current.error).toBe(null);
      expect(result.current.confirmedOrder).toEqual(mockOrder);
    });
  });

  describe('Estados durante confirmación', () => {
    it('debe establecer confirming=true durante la operación', async () => {
      let resolvePromise: (value: Command) => void;
      const promise = new Promise<Command>((resolve) => {
        resolvePromise = resolve;
      });

      mockOrdersService.confirmOrder.mockReturnValue(promise);

      const { result } = renderHook(() => useConfirmOrder());

      // Iniciar confirmación
      act(() => {
        result.current.confirmOrder({
          sessionId: 'session-456',
          tableNumber: 5,
        });
      });

      // Verificar que está en estado de confirmación
      expect(result.current.confirming).toBe(true);
      expect(result.current.error).toBe(null);

      // Resolver la promesa
      await act(async () => {
        resolvePromise!(mockOrder);
        await promise;
      });

      // Verificar que terminó la confirmación
      expect(result.current.confirming).toBe(false);
    });

    it('debe establecer confirming=false después de error', async () => {
      mockOrdersService.confirmOrder.mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() => useConfirmOrder());

      await act(async () => {
        await result.current.confirmOrder({
          sessionId: 'session-456',
          tableNumber: 5,
        });
      });

      expect(result.current.confirming).toBe(false);
    });
  });

  describe('clearConfirmedOrder', () => {
    it('debe limpiar pedido confirmado y error', async () => {
      // Primero confirmar un pedido
      mockOrdersService.confirmOrder.mockResolvedValue(mockOrder);

      const { result } = renderHook(() => useConfirmOrder());

      await act(async () => {
        await result.current.confirmOrder({
          sessionId: 'session-456',
          tableNumber: 5,
        });
      });

      expect(result.current.confirmedOrder).toEqual(mockOrder);

      // Ahora limpiar
      act(() => {
        result.current.clearConfirmedOrder();
      });

      expect(result.current.confirmedOrder).toBe(null);
      expect(result.current.error).toBe(null);
    });

    it('debe limpiar error sin pedido confirmado', async () => {
      // Primero generar un error
      mockOrdersService.confirmOrder.mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() => useConfirmOrder());

      await act(async () => {
        await result.current.confirmOrder({
          sessionId: 'session-456',
          tableNumber: 5,
        });
      });

      expect(result.current.error).toBe('Test error');

      // Limpiar
      act(() => {
        result.current.clearConfirmedOrder();
      });

      expect(result.current.error).toBe(null);
      expect(result.current.confirmedOrder).toBe(null);
    });
  });

  describe('Logging', () => {
    it('debe loguear pedido confirmado exitosamente', async () => {
      mockOrdersService.confirmOrder.mockResolvedValue(mockOrder);

      const { result } = renderHook(() => useConfirmOrder());

      await act(async () => {
        await result.current.confirmOrder({
          sessionId: 'session-456',
          tableNumber: 5,
        });
      });

      expect(console.log).toHaveBeenCalledWith('✅ Pedido confirmado:', mockOrder);
    });

    it('debe loguear errores', async () => {
      const error = new Error('Test error');
      mockOrdersService.confirmOrder.mockRejectedValue(error);

      const { result } = renderHook(() => useConfirmOrder());

      await act(async () => {
        await result.current.confirmOrder({
          sessionId: 'session-456',
          tableNumber: 5,
        });
      });

      expect(console.error).toHaveBeenCalledWith('Error confirmando pedido:', error);
    });
  });

  describe('Casos de uso realistas', () => {
    it('debe manejar múltiples confirmaciones secuenciales', async () => {
      const order1 = { ...mockOrder, id: 'order-1', tableNumber: 1 };
      const order2 = { ...mockOrder, id: 'order-2', tableNumber: 2 };

      mockOrdersService.confirmOrder
        .mockResolvedValueOnce(order1)
        .mockResolvedValueOnce(order2);

      const { result } = renderHook(() => useConfirmOrder());

      // Primera confirmación
      await act(async () => {
        await result.current.confirmOrder({
          sessionId: 'session-1',
          tableNumber: 1,
        });
      });

      expect(result.current.confirmedOrder).toEqual(order1);

      // Segunda confirmación
      await act(async () => {
        await result.current.confirmOrder({
          sessionId: 'session-2',
          tableNumber: 2,
        });
      });

      expect(result.current.confirmedOrder).toEqual(order2);
    });

    it('debe manejar confirmación seguida de limpieza y nueva confirmación', async () => {
      mockOrdersService.confirmOrder.mockResolvedValue(mockOrder);

      const { result } = renderHook(() => useConfirmOrder());

      // Confirmación inicial
      await act(async () => {
        await result.current.confirmOrder({
          sessionId: 'session-456',
          tableNumber: 5,
        });
      });

      expect(result.current.confirmedOrder).toEqual(mockOrder);

      // Limpiar
      act(() => {
        result.current.clearConfirmedOrder();
      });

      expect(result.current.confirmedOrder).toBe(null);

      // Nueva confirmación
      const newOrder = { ...mockOrder, id: 'order-new', tableNumber: 10 };
      mockOrdersService.confirmOrder.mockResolvedValue(newOrder);

      await act(async () => {
        await result.current.confirmOrder({
          sessionId: 'session-new',
          tableNumber: 10,
        });
      });

      expect(result.current.confirmedOrder).toEqual(newOrder);
    });
  });

  describe('Integración con interfaz', () => {
    it('debe proporcionar toda la interfaz esperada', () => {
      const { result } = renderHook(() => useConfirmOrder());

      // Verificar que todas las propiedades están presentes
      expect(result.current).toHaveProperty('confirmOrder');
      expect(result.current).toHaveProperty('confirming');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('confirmedOrder');
      expect(result.current).toHaveProperty('clearConfirmedOrder');

      // Verificar tipos
      expect(typeof result.current.confirmOrder).toBe('function');
      expect(typeof result.current.confirming).toBe('boolean');
      expect(result.current.error === null || typeof result.current.error === 'string').toBe(true);
      expect(result.current.confirmedOrder === null || typeof result.current.confirmedOrder === 'object').toBe(true);
      expect(typeof result.current.clearConfirmedOrder).toBe('function');
    });
  });
});