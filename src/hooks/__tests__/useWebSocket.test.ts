/**
 * Tests para useWebSocket hook
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useWebSocket, useMessageHistory, useShoppingCart } from '../useWebSocket';
import { io } from 'socket.io-client';
import type { BotResponseEvent, ChatMessageEvent } from '../useWebSocket';

// Mock de socket.io-client
const mockSocket = {
  connected: false,
  id: 'mock-socket-id',
  connect: jest.fn(),
  disconnect: jest.fn(),
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
};

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}));

const mockIo = io as jest.MockedFunction<typeof io>;

// Mock de localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useWebSocket', () => {
  let eventHandlers: { [key: string]: Function } = {};

  beforeEach(() => {
    jest.clearAllMocks();
    eventHandlers = {};
    
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();

    // Reset mock socket
    Object.assign(mockSocket, {
      connected: false,
      id: 'mock-socket-id',
      connect: jest.fn(),
      disconnect: jest.fn(),
      emit: jest.fn(),
      on: jest.fn((event: string, handler: Function) => {
        eventHandlers[event] = handler;
        return mockSocket;
      }),
      off: jest.fn(),
    });

    mockIo.mockReturnValue(mockSocket as any);

    // Mock env variables
    Object.defineProperty(import.meta, 'env', {
      value: { VITE_WS_URL: 'http://localhost:3000' },
      writable: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Inicialización', () => {
    it('debe tener valores iniciales correctos con autoConnect', () => {
      const { result } = renderHook(() => useWebSocket({ autoConnect: true }));

      expect(result.current.connectionStatus).toBe('connecting');
      expect(result.current.isConnected).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.lastMessage).toBe(null);
      expect(result.current.reconnectAttempts).toBe(0);
    });

    it('debe tener valores iniciales correctos sin autoConnect', () => {
      const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

      expect(result.current.connectionStatus).toBe('disconnected');
      expect(result.current.isConnected).toBe(false);
    });

    it('debe usar configuración por defecto', () => {
      renderHook(() => useWebSocket());

      expect(mockIo).toHaveBeenCalledWith('http://localhost:3000/chat', {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
        transports: ['websocket', 'polling'],
      });
    });

    it('debe usar configuración personalizada', () => {
      const customOptions = {
        url: 'http://custom-server:4000',
        namespace: '/custom',
        reconnectionAttempts: 3,
        reconnectionDelay: 2000,
        timeout: 5000,
      };

      renderHook(() => useWebSocket(customOptions));

      expect(mockIo).toHaveBeenCalledWith('http://custom-server:4000/custom', {
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 2000,
        timeout: 5000,
        transports: ['websocket', 'polling'],
      });
    });
  });

  describe('Eventos de conexión', () => {
    it('debe manejar evento connect', () => {
      const onConnect = jest.fn();
      const { result } = renderHook(() => useWebSocket({ onConnect }));

      act(() => {
        eventHandlers['connect']();
      });

      expect(result.current.connectionStatus).toBe('connected');
      expect(result.current.isConnected).toBe(true);
      expect(result.current.error).toBe(null);
      expect(onConnect).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('✅ WebSocket conectado:', 'mock-socket-id');
    });

    it('debe manejar evento disconnect', () => {
      const onDisconnect = jest.fn();
      const { result } = renderHook(() => useWebSocket({ onDisconnect }));

      // Conectar primero
      act(() => {
        eventHandlers['connect']();
      });

      // Luego desconectar
      act(() => {
        eventHandlers['disconnect']('transport close');
      });

      expect(result.current.connectionStatus).toBe('disconnected');
      expect(result.current.isConnected).toBe(false);
      expect(onDisconnect).toHaveBeenCalledWith('transport close');
    });

    it('debe reconectar automáticamente cuando servidor desconecta', () => {
      renderHook(() => useWebSocket());

      act(() => {
        eventHandlers['disconnect']('io server disconnect');
      });

      expect(mockSocket.connect).toHaveBeenCalled();
    });

    it('debe manejar errores de conexión', () => {
      const onError = jest.fn();
      const { result } = renderHook(() => useWebSocket({ onError }));

      const error = new Error('Connection failed');

      act(() => {
        eventHandlers['connect_error'](error);
      });

      expect(result.current.connectionStatus).toBe('disconnected');
      expect(result.current.error).toBe(error);
      expect(onError).toHaveBeenCalledWith(error);
    });

    it('debe manejar intentos de reconexión', () => {
      const { result } = renderHook(() => useWebSocket());

      act(() => {
        eventHandlers['reconnect_attempt'](2);
      });

      expect(result.current.connectionStatus).toBe('reconnecting');
      expect(result.current.reconnectAttempts).toBe(2);
    });

    it('debe manejar reconexión exitosa', () => {
      const { result } = renderHook(() => useWebSocket());

      act(() => {
        eventHandlers['reconnect'](3);
      });

      expect(result.current.connectionStatus).toBe('connected');
      expect(result.current.isConnected).toBe(true);
      expect(result.current.error).toBe(null);
      expect(result.current.reconnectAttempts).toBe(0);
    });

    it('debe manejar fallo de reconexión', () => {
      const { result } = renderHook(() => useWebSocket());

      act(() => {
        eventHandlers['reconnect_failed']();
      });

      expect(result.current.connectionStatus).toBe('disconnected');
      expect(result.current.error?.message).toBe('No se pudo reconectar al servidor');
    });
  });

  describe('Eventos de mensajes', () => {
    it('debe manejar respuesta del bot', () => {
      const onMessage = jest.fn();
      const { result } = renderHook(() => useWebSocket({ onMessage }));

      const botResponse: BotResponseEvent = {
        sessionId: 'session-123',
        message: 'Hola, ¿en qué puedo ayudarte?',
        timestamp: '2024-01-01T10:00:00Z',
        metadata: {
          model: 'gpt-4',
          tokensUsed: 150,
          processingTime: 1200,
        },
      };

      act(() => {
        eventHandlers['bot:response'](botResponse);
      });

      expect(result.current.lastMessage).toEqual(botResponse);
      expect(onMessage).toHaveBeenCalledWith(botResponse);
    });

    it('debe manejar errores del servidor', () => {
      const onError = jest.fn();
      const { result } = renderHook(() => useWebSocket({ onError }));

      const errorEvent = {
        message: 'Server error',
        code: 'INTERNAL_ERROR',
        timestamp: '2024-01-01T10:00:00Z',
      };

      act(() => {
        eventHandlers['error'](errorEvent);
      });

      expect(result.current.error?.message).toBe('Server error');
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Métodos del hook', () => {
    describe('connect', () => {
      it('debe conectar manualmente', () => {
        const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

        act(() => {
          result.current.connect();
        });

        expect(mockIo).toHaveBeenCalled();
        expect(result.current.connectionStatus).toBe('connecting');
      });

      it('no debe conectar si ya está conectado', () => {
        mockSocket.connected = true;
        const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

        mockIo.mockClear();

        act(() => {
          result.current.connect();
        });

        expect(mockIo).not.toHaveBeenCalled();
        expect(console.log).toHaveBeenCalledWith('🔌 WebSocket ya está conectado');
      });
    });

    describe('disconnect', () => {
      it('debe desconectar manualmente', () => {
        const { result } = renderHook(() => useWebSocket());

        act(() => {
          result.current.disconnect();
        });

        expect(mockSocket.disconnect).toHaveBeenCalled();
        expect(result.current.connectionStatus).toBe('disconnected');
        expect(result.current.isConnected).toBe(false);
      });
    });

    describe('sendMessage', () => {
      it('debe enviar mensaje cuando está conectado', () => {
        mockSocket.connected = true;
        const { result } = renderHook(() => useWebSocket());

        let sentMessage: ChatMessageEvent;

        act(() => {
          sentMessage = result.current.sendMessage('session-123', 'Hola mundo');
        });

        expect(mockSocket.emit).toHaveBeenCalledWith('user:message', {
          sessionId: 'session-123',
          message: 'Hola mundo',
          timestamp: expect.any(String),
          type: 'user',
        });

        expect(sentMessage!.sessionId).toBe('session-123');
        expect(sentMessage!.message).toBe('Hola mundo');
        expect(sentMessage!.type).toBe('user');
      });

      it('debe enviar mensaje con contexto', () => {
        mockSocket.connected = true;
        const { result } = renderHook(() => useWebSocket());

        const context = { cartItems: ['pizza', 'coca-cola'] };

        act(() => {
          result.current.sendMessage('session-123', 'Agregar al carrito', context);
        });

        expect(mockSocket.emit).toHaveBeenCalledWith('user:message', {
          sessionId: 'session-123',
          message: 'Agregar al carrito',
          timestamp: expect.any(String),
          type: 'user',
          context,
        });
      });

      it('debe lanzar error si no está conectado', () => {
        mockSocket.connected = false;
        const { result } = renderHook(() => useWebSocket());

        expect(() => {
          act(() => {
            result.current.sendMessage('session-123', 'Test message');
          });
        }).toThrow('WebSocket no está conectado');
      });
    });

    describe('reconnect', () => {
      it('debe reconectar manualmente', () => {
        jest.useFakeTimers();
        
        const { result } = renderHook(() => useWebSocket());

        act(() => {
          result.current.reconnect();
        });

        expect(mockSocket.disconnect).toHaveBeenCalled();

        act(() => {
          jest.advanceTimersByTime(100);
        });

        expect(mockIo).toHaveBeenCalledTimes(2); // Initial + reconnect

        jest.useRealTimers();
      });
    });
  });

  describe('Cleanup', () => {
    it('debe limpiar al desmontar', () => {
      const { unmount } = renderHook(() => useWebSocket());

      unmount();

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('🧹 Limpiando WebSocket al desmontar');
    });
  });

  describe('Casos de uso realistas', () => {
    it('debe manejar flujo completo de conexión y comunicación', () => {
      const onConnect = jest.fn();
      const onMessage = jest.fn();
      
      const { result } = renderHook(() => useWebSocket({ onConnect, onMessage }));

      // Simular conexión
      act(() => {
        eventHandlers['connect']();
      });

      expect(result.current.isConnected).toBe(true);
      expect(onConnect).toHaveBeenCalled();

      // Enviar mensaje
      mockSocket.connected = true;
      
      act(() => {
        result.current.sendMessage('session-123', 'Mostrar menú');
      });

      expect(mockSocket.emit).toHaveBeenCalled();

      // Recibir respuesta
      const response: BotResponseEvent = {
        sessionId: 'session-123',
        message: 'Aquí tienes el menú',
        timestamp: new Date().toISOString(),
        menuItems: [{ id: 1, name: 'Pizza' }],
      };

      act(() => {
        eventHandlers['bot:response'](response);
      });

      expect(result.current.lastMessage).toEqual(response);
      expect(onMessage).toHaveBeenCalledWith(response);
    });
  });
});

describe('useMessageHistory', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  it('debe cargar mensajes desde localStorage', () => {
    const savedMessages = [
      { id: '1', message: 'Hola', sender: 'user', timestamp: new Date() },
    ];
    localStorageMock.getItem.mockReturnValue(JSON.stringify(savedMessages));

    const { result } = renderHook(() => useMessageHistory('session-123'));

    expect(result.current.messages).toEqual(savedMessages);
    expect(localStorageMock.getItem).toHaveBeenCalledWith('chat_messages_session-123');
  });

  it('debe agregar nuevos mensajes', () => {
    const { result } = renderHook(() => useMessageHistory('session-123'));

    const newMessage = {
      id: '1',
      message: 'Nuevo mensaje',
      sender: 'user' as const,
      timestamp: new Date(),
    };

    act(() => {
      result.current.addMessage(newMessage);
    });

    expect(result.current.messages).toContainEqual(newMessage);
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('debe actualizar mensajes existentes', () => {
    const { result } = renderHook(() => useMessageHistory('session-123'));

    const initialMessage = {
      id: '1',
      message: 'Mensaje inicial',
      sender: 'user' as const,
      timestamp: new Date(),
    };

    act(() => {
      result.current.addMessage(initialMessage);
    });

    act(() => {
      result.current.updateMessage('1', { message: 'Mensaje actualizado' });
    });

    expect(result.current.messages[0].message).toBe('Mensaje actualizado');
  });

  it('debe limpiar todos los mensajes', () => {
    const { result } = renderHook(() => useMessageHistory('session-123'));

    act(() => {
      result.current.addMessage({
        id: '1',
        message: 'Test',
        sender: 'user',
        timestamp: new Date(),
      });
    });

    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.messages).toEqual([]);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('chat_messages_session-123');
  });
});

describe('useShoppingCart', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  const mockMenuItem = {
    id: 'pizza-1',
    name: 'Pizza Margherita',
    price: 1200,
    category: 'main',
  };

  it('debe cargar carrito desde localStorage', () => {
    const savedCart = [
      { menuItem: mockMenuItem, quantity: 2, notes: '' },
    ];
    localStorageMock.getItem.mockReturnValue(JSON.stringify(savedCart));

    const { result } = renderHook(() => useShoppingCart());

    expect(result.current.cartItems).toEqual(savedCart);
  });

  it('debe agregar item al carrito', () => {
    const { result } = renderHook(() => useShoppingCart());

    act(() => {
      result.current.addToCart(mockMenuItem, 2);
    });

    expect(result.current.cartItems).toHaveLength(1);
    expect(result.current.cartItems[0]).toEqual({
      menuItem: mockMenuItem,
      quantity: 2,
      notes: '',
    });
  });

  it('debe actualizar cantidad de item existente', () => {
    const { result } = renderHook(() => useShoppingCart());

    act(() => {
      result.current.addToCart(mockMenuItem, 1);
    });

    act(() => {
      result.current.addToCart(mockMenuItem, 2);
    });

    expect(result.current.cartItems).toHaveLength(1);
    expect(result.current.cartItems[0].quantity).toBe(3);
  });

  it('debe remover item del carrito', () => {
    const { result } = renderHook(() => useShoppingCart());

    act(() => {
      result.current.addToCart(mockMenuItem, 1);
    });

    act(() => {
      result.current.removeFromCart(mockMenuItem.id);
    });

    expect(result.current.cartItems).toHaveLength(0);
  });

  it('debe actualizar cantidad específica', () => {
    const { result } = renderHook(() => useShoppingCart());

    act(() => {
      result.current.addToCart(mockMenuItem, 1);
    });

    act(() => {
      result.current.updateQuantity(mockMenuItem.id, 5);
    });

    expect(result.current.cartItems[0].quantity).toBe(5);
  });

  it('debe remover item si cantidad es 0', () => {
    const { result } = renderHook(() => useShoppingCart());

    act(() => {
      result.current.addToCart(mockMenuItem, 1);
    });

    act(() => {
      result.current.updateQuantity(mockMenuItem.id, 0);
    });

    expect(result.current.cartItems).toHaveLength(0);
  });

  it('debe calcular total de items', () => {
    const { result } = renderHook(() => useShoppingCart());

    const item2 = { ...mockMenuItem, id: 'pizza-2' };

    act(() => {
      result.current.addToCart(mockMenuItem, 2);
      result.current.addToCart(item2, 3);
    });

    expect(result.current.getTotalItems()).toBe(5);
  });

  it('debe calcular precio total', () => {
    const { result } = renderHook(() => useShoppingCart());

    act(() => {
      result.current.addToCart(mockMenuItem, 2); // 2 * 1200 = 2400
    });

    expect(result.current.getTotalPrice()).toBe(2400);
  });

  it('debe limpiar carrito completamente', () => {
    const { result } = renderHook(() => useShoppingCart());

    act(() => {
      result.current.addToCart(mockMenuItem, 2);
    });

    act(() => {
      result.current.clearCart();
    });

    expect(result.current.cartItems).toEqual([]);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('shopping_cart');
  });
});