/**
 * Tests para useChatService hook
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useChatService } from '../useChatService';
import { chatService } from '../../services/api';
import { useWebSocket } from '../useWebSocket';
import type { ChatResponse, SendMessageRequest } from '../../services/api';

// Mock del servicio de chat
jest.mock('../../services/api', () => ({
  chatService: {
    sendMessage: jest.fn(),
    getChatHistory: jest.fn(),
    deleteSession: jest.fn(),
  },
}));

// Mock del hook useWebSocket
jest.mock('../useWebSocket', () => ({
  useWebSocket: jest.fn(),
}));

const mockChatService = chatService as jest.Mocked<typeof chatService>;
const mockUseWebSocket = useWebSocket as jest.MockedFunction<typeof useWebSocket>;

describe('useChatService', () => {
  const mockChatResponse: ChatResponse = {
    response: 'Hola, ¿en qué puedo ayudarte hoy?',
    sessionId: 'session-123',
    metadata: {
      processingTime: 1500,
      llmProvider: 'openai',
      fromCache: false,
      stage: 'response',
    },
    recommendations: [
      {
        dish: {
          id: 'pizza-1',
          name: 'Pizza Margherita',
          description: 'Pizza clásica',
          price: 1200,
          category: 'main',
        },
        score: 0.9,
        justification: 'Muy popular',
        matchReasons: ['popular'],
        rank: 1,
      },
    ],
  };

  const mockWebSocketReturn = {
    connectionStatus: 'connected' as const,
    isConnected: true,
    error: null,
    lastMessage: null,
    reconnectAttempts: 0,
    socket: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
    sendMessage: jest.fn(),
    reconnect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();

    mockUseWebSocket.mockReturnValue(mockWebSocketReturn);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Inicialización', () => {
    it('debe tener estado inicial correcto', () => {
      const { result } = renderHook(() => useChatService());

      expect(result.current.messages).toEqual([]);
      expect(result.current.sessionId).toBe(null);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.isConnected).toBe(true); // HTTP siempre conectado
    });

    it('debe usar sessionId inicial si se proporciona', () => {
      const { result } = renderHook(() =>
        useChatService({ sessionId: 'initial-session' })
      );

      expect(result.current.sessionId).toBe('initial-session');
    });

    it('debe configurar WebSocket si está habilitado', () => {
      renderHook(() =>
        useChatService({ enableWebSocket: true })
      );

      expect(mockUseWebSocket).toHaveBeenCalledWith({
        autoConnect: true,
        onConnect: expect.any(Function),
        onDisconnect: expect.any(Function),
        onError: expect.any(Function),
      });
    });

    it('no debe configurar WebSocket por defecto', () => {
      renderHook(() => useChatService());

      expect(mockUseWebSocket).toHaveBeenCalledWith({
        autoConnect: false,
        onConnect: expect.any(Function),
        onDisconnect: expect.any(Function),
        onError: expect.any(Function),
      });
    });
  });

  describe('sendMessage - HTTP', () => {
    beforeEach(() => {
      mockUseWebSocket.mockReturnValue({
        ...mockWebSocketReturn,
        isConnected: false,
      });
    });

    it('debe enviar mensaje vía HTTP exitosamente', async () => {
      jest.useFakeTimers();
      mockChatService.sendMessage.mockResolvedValue(mockChatResponse);

      const { result } = renderHook(() => useChatService());

      await act(async () => {
        await result.current.sendMessage('Hola mundo');
        jest.advanceTimersByTime(1500); // Avanzar timers para status updates
      });

      expect(mockChatService.sendMessage).toHaveBeenCalledWith({
        message: 'Hola mundo',
        sessionId: undefined,
        context: undefined,
      });

      expect(result.current.messages).toHaveLength(2); // User + Bot
      expect(result.current.messages[0].content).toBe('Hola mundo');
      expect(result.current.messages[0].type).toBe('user');
      expect(result.current.messages[1].content).toBe('Hola, ¿en qué puedo ayudarte hoy?');
      expect(result.current.messages[1].type).toBe('bot');
      expect(result.current.sessionId).toBe('session-123');

      jest.useRealTimers();
    });

    it('debe enviar mensaje con contexto', async () => {
      mockChatService.sendMessage.mockResolvedValue(mockChatResponse);

      const { result } = renderHook(() => useChatService());

      const context = { cartItems: ['pizza'], tableNumber: 5 };

      await act(async () => {
        await result.current.sendMessage('Confirmar pedido', context);
      });

      expect(mockChatService.sendMessage).toHaveBeenCalledWith({
        message: 'Confirmar pedido',
        sessionId: undefined,
        context,
      });
    });

    it('debe usar sessionId existente', async () => {
      mockChatService.sendMessage.mockResolvedValue(mockChatResponse);

      const { result } = renderHook(() =>
        useChatService({ sessionId: 'existing-session' })
      );

      await act(async () => {
        await result.current.sendMessage('Test message');
      });

      expect(mockChatService.sendMessage).toHaveBeenCalledWith({
        message: 'Test message',
        sessionId: 'existing-session',
        context: undefined,
      });
    });

    it('debe manejar errores en envío', async () => {
      const error = new Error('Network error');
      mockChatService.sendMessage.mockRejectedValue(error);

      const onError = jest.fn();
      const { result } = renderHook(() => useChatService({ onError }));

      await expect(
        act(async () => {
          await result.current.sendMessage('Test message');
        })
      ).rejects.toThrow('Network error');

      expect(result.current.error).toBe(error);
      expect(result.current.isLoading).toBe(false);
      expect(onError).toHaveBeenCalledWith(error);
    });

    it('debe actualizar estados de mensaje correctamente', async () => {
      jest.useFakeTimers();
      mockChatService.sendMessage.mockResolvedValue(mockChatResponse);

      const { result } = renderHook(() => useChatService());

      await act(async () => {
        result.current.sendMessage('Test message');
      });

      // Estado inicial: sending
      expect(result.current.messages[0].status).toBe('sending');

      // Después de 500ms: sent
      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(result.current.messages[0].status).toBe('sent');
      });

      // Resolver promesa de envío
      await act(async () => {
        await Promise.resolve();
      });

      // Estado final: delivered
      expect(result.current.messages[0].status).toBe('delivered');

      jest.useRealTimers();
    });

    it('debe transformar recomendaciones a menuItems', async () => {
      mockChatService.sendMessage.mockResolvedValue(mockChatResponse);

      const { result } = renderHook(() => useChatService());

      await act(async () => {
        await result.current.sendMessage('Qué recomiendas');
      });

      const botMessage = result.current.messages[1];
      expect(botMessage.menuItems).toHaveLength(1);
      expect(botMessage.menuItems![0]).toEqual({
        id: 'pizza-1',
        name: 'Pizza Margherita',
        description: 'Pizza clásica',
        price: 1200,
        category: 'main',
        score: 0.9,
        justification: 'Muy popular',
        matchReasons: ['popular'],
        rank: 1,
      });
    });
  });

  describe('sendMessage - WebSocket', () => {
    beforeEach(() => {
      mockUseWebSocket.mockReturnValue({
        ...mockWebSocketReturn,
        isConnected: true,
      });
    });

    it('debe enviar mensaje vía WebSocket cuando está conectado', async () => {
      jest.useFakeTimers();

      const { result } = renderHook(() =>
        useChatService({ enableWebSocket: true })
      );

      await act(async () => {
        await result.current.sendMessage('Hola WebSocket');
        jest.advanceTimersByTime(1500);
      });

      expect(mockWebSocketReturn.sendMessage).toHaveBeenCalledWith(
        '',
        'Hola WebSocket',
        undefined
      );

      expect(mockChatService.sendMessage).not.toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('loadHistory', () => {
    it('debe cargar historial exitosamente', async () => {
      const mockHistory = {
        sessionId: 'session-123',
        createdAt: '2024-01-01T09:00:00Z',
        updatedAt: '2024-01-01T10:00:02Z',
        messages: [
          {
            content: 'Hola',
            role: 'user' as const,
            timestamp: '2024-01-01T10:00:00Z',
          },
          {
            content: 'Hola, ¿cómo estás?',
            role: 'assistant' as const,
            timestamp: '2024-01-01T10:00:01Z',
          },
        ],
      };

      mockChatService.getChatHistory.mockResolvedValue(mockHistory);

      const { result } = renderHook(() =>
        useChatService({ sessionId: 'session-123' })
      );

      await act(async () => {
        await result.current.loadHistory();
      });

      expect(mockChatService.getChatHistory).toHaveBeenCalledWith('session-123');
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0].content).toBe('Hola');
      expect(result.current.messages[0].type).toBe('user');
      expect(result.current.messages[1].content).toBe('Hola, ¿cómo estás?');
      expect(result.current.messages[1].type).toBe('bot');
    });

    it('debe usar sessionId especificado', async () => {
      const mockHistory = {
        sessionId: 'custom-session',
        createdAt: '2024-01-01T09:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        messages: [],
      };

      mockChatService.getChatHistory.mockResolvedValue(mockHistory);

      const { result } = renderHook(() => useChatService());

      await act(async () => {
        await result.current.loadHistory('custom-session');
      });

      expect(mockChatService.getChatHistory).toHaveBeenCalledWith('custom-session');
    });

    it('debe manejar falta de sessionId', async () => {
      const { result } = renderHook(() => useChatService());

      await act(async () => {
        await result.current.loadHistory();
      });

      expect(mockChatService.getChatHistory).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith('⚠️ No hay sessionId para cargar historial');
    });

    it('debe manejar errores al cargar historial', async () => {
      const error = new Error('History load failed');
      mockChatService.getChatHistory.mockRejectedValue(error);

      const onError = jest.fn();
      const { result } = renderHook(() =>
        useChatService({ sessionId: 'session-123', onError })
      );

      await act(async () => {
        await result.current.loadHistory();
      });

      expect(result.current.error).toBe(error);
      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  describe('clearChat', () => {
    it('debe limpiar chat exitosamente', async () => {
      mockChatService.deleteSession.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useChatService({ sessionId: 'session-123' })
      );

      // Agregar algunos mensajes primero
      act(() => {
        result.current.addMessage({
          id: '1',
          content: 'Test',
          type: 'user',
          timestamp: new Date(),
          status: 'sent',
        });
      });

      await act(async () => {
        await result.current.clearChat();
      });

      expect(mockChatService.deleteSession).toHaveBeenCalledWith('session-123');
      expect(result.current.messages).toEqual([]);
      expect(result.current.sessionId).toBe(null);
      expect(result.current.error).toBe(null);
    });

    it('debe limpiar sin sessionId', async () => {
      const { result } = renderHook(() => useChatService());

      await act(async () => {
        await result.current.clearChat();
      });

      expect(mockChatService.deleteSession).not.toHaveBeenCalled();
      expect(result.current.messages).toEqual([]);
    });

    it('debe manejar errores al limpiar', async () => {
      const error = new Error('Delete failed');
      mockChatService.deleteSession.mockRejectedValue(error);

      const { result } = renderHook(() =>
        useChatService({ sessionId: 'session-123' })
      );

      await act(async () => {
        await result.current.clearChat();
      });

      expect(console.error).toHaveBeenCalledWith('❌ Error al limpiar chat:', error);
    });
  });

  describe('Métodos de mensajes', () => {
    it('debe agregar mensajes', () => {
      const { result } = renderHook(() => useChatService());

      const message = {
        id: '1',
        content: 'Test message',
        type: 'user' as const,
        timestamp: new Date(),
        status: 'sent' as const,
      };

      act(() => {
        result.current.addMessage(message);
      });

      expect(result.current.messages).toContainEqual(message);
    });

    it('debe actualizar mensajes', () => {
      const { result } = renderHook(() => useChatService());

      const message = {
        id: '1',
        content: 'Original message',
        type: 'user' as const,
        timestamp: new Date(),
        status: 'sending' as const,
      };

      act(() => {
        result.current.addMessage(message);
      });

      act(() => {
        result.current.updateMessage('1', { status: 'delivered', content: 'Updated message' });
      });

      expect(result.current.messages[0].status).toBe('delivered');
      expect(result.current.messages[0].content).toBe('Updated message');
    });
  });

  describe('Procesamiento de mensajes WebSocket', () => {
    it('debe procesar mensajes recibidos vía WebSocket', () => {
      const wsMessage = {
        sessionId: 'session-123',
        message: 'Respuesta vía WebSocket',
        timestamp: '2024-01-01T10:00:00Z',
        metadata: {
          model: 'gpt-4',
          tokensUsed: 100,
        },
      };

      mockUseWebSocket.mockReturnValue({
        ...mockWebSocketReturn,
        lastMessage: wsMessage,
      });

      const onBotMessage = jest.fn();

      const { result } = renderHook(() =>
        useChatService({ enableWebSocket: true, onBotMessage })
      );

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].content).toBe('Respuesta vía WebSocket');
      expect(result.current.messages[0].type).toBe('bot');
      expect(onBotMessage).toHaveBeenCalled();
    });
  });

  describe('Callbacks', () => {
    it('debe llamar onBotMessage cuando recibe respuesta', async () => {
      mockChatService.sendMessage.mockResolvedValue(mockChatResponse);

      const onBotMessage = jest.fn();
      const { result } = renderHook(() => useChatService({ onBotMessage }));

      await act(async () => {
        await result.current.sendMessage('Test message');
      });

      expect(onBotMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Hola, ¿en qué puedo ayudarte hoy?',
          type: 'bot',
        })
      );
    });

    it('debe llamar onError cuando ocurre error', async () => {
      const error = new Error('Test error');
      mockChatService.sendMessage.mockRejectedValue(error);

      const onError = jest.fn();
      const { result } = renderHook(() => useChatService({ onError }));

      await expect(
        act(async () => {
          await result.current.sendMessage('Test message');
        })
      ).rejects.toThrow('Test error');

      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  describe('Estados de conexión', () => {
    it('debe mostrar estado de WebSocket cuando está habilitado', () => {
      mockUseWebSocket.mockReturnValue({
        ...mockWebSocketReturn,
        connectionStatus: 'reconnecting',
        isConnected: false,
      });

      const { result } = renderHook(() =>
        useChatService({ enableWebSocket: true })
      );

      expect(result.current.connectionStatus).toBe('reconnecting');
      expect(result.current.isConnected).toBe(false);
    });

    it('debe mostrar estado conectado para HTTP', () => {
      const { result } = renderHook(() =>
        useChatService({ enableWebSocket: false })
      );

      expect(result.current.connectionStatus).toBe('connected');
      expect(result.current.isConnected).toBe(true);
    });
  });

  describe('Casos de uso realistas', () => {
    it('debe manejar conversación completa', async () => {
      jest.useFakeTimers();
      
      const responses = [
        { ...mockChatResponse, response: 'Hola! ¿En qué puedo ayudarte?' },
        { ...mockChatResponse, response: 'Te recomiendo nuestra pizza especial' },
        { ...mockChatResponse, response: 'Perfecto, agregado al carrito' },
      ];

      mockChatService.sendMessage
        .mockResolvedValueOnce(responses[0])
        .mockResolvedValueOnce(responses[1])
        .mockResolvedValueOnce(responses[2]);

      const { result } = renderHook(() => useChatService());

      // Mensaje 1
      await act(async () => {
        await result.current.sendMessage('Hola');
        jest.advanceTimersByTime(1500);
      });

      // Mensaje 2
      await act(async () => {
        await result.current.sendMessage('¿Qué recomiendas?');
        jest.advanceTimersByTime(1500);
      });

      // Mensaje 3
      await act(async () => {
        await result.current.sendMessage('Agregar al carrito');
        jest.advanceTimersByTime(1500);
      });

      expect(result.current.messages).toHaveLength(6); // 3 user + 3 bot
      expect(result.current.messages[1].content).toBe('Hola! ¿En qué puedo ayudarte?');
      expect(result.current.messages[3].content).toBe('Te recomiendo nuestra pizza especial');
      expect(result.current.messages[5].content).toBe('Perfecto, agregado al carrito');

      jest.useRealTimers();
    });
  });
});