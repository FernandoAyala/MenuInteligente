/**
 * Hook personalizado para gestión de WebSocket con Socket.io
 * @module hooks/useWebSocket
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { ChatMessage, ConnectionStatus } from '../types';

/**
 * Evento de mensaje del chat
 */
export interface ChatMessageEvent {
  sessionId: string;
  message: string;
  timestamp: string;
  type?: 'user' | 'bot';
}

/**
 * Evento de respuesta del agente IA
 */
export interface BotResponseEvent {
  sessionId: string;
  message: string;
  timestamp: string;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    processingTime?: number;
  };
  menuItems?: any[];
}

/**
 * Evento de error del WebSocket
 */
export interface WebSocketErrorEvent {
  message: string;
  code?: string;
  timestamp: string;
}

/**
 * Opciones de configuración del WebSocket
 */
export interface UseWebSocketOptions {
  /** URL del servidor WebSocket */
  url?: string;
  /** Namespace de Socket.io */
  namespace?: string;
  /** Auto-conectar al montar el componente */
  autoConnect?: boolean;
  /** Auto-reconectar en caso de desconexión */
  reconnection?: boolean;
  /** Intentos de reconexión */
  reconnectionAttempts?: number;
  /** Delay entre reconexiones (ms) */
  reconnectionDelay?: number;
  /** Timeout de conexión (ms) */
  timeout?: number;
  /** Callbacks de eventos */
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
  onMessage?: (data: BotResponseEvent) => void;
}

/**
 * Hook useWebSocket - Gestiona conexión Socket.io para chat en tiempo real
 */
export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const {
    url = import.meta.env.VITE_WS_URL || 'http://localhost:3000',
    namespace = '/chat',
    autoConnect = true,
    reconnection = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000,
    timeout = 10000,
    onConnect,
    onDisconnect,
    onError,
    onMessage,
  } = options;

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    autoConnect ? 'connecting' : 'disconnected'
  );
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<BotResponseEvent | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptsRef = useRef(0);

  /**
   * Conectar al servidor WebSocket
   */
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      console.log('🔌 WebSocket ya está conectado');
      return;
    }

    console.log('� Conectando WebSocket:', `${url}${namespace}`);
    setConnectionStatus('connecting');
    setError(null);

    try {
      const socket = io(`${url}${namespace}`, {
        reconnection,
        reconnectionAttempts,
        reconnectionDelay,
        timeout,
        transports: ['websocket', 'polling'],
      });

      socketRef.current = socket;

      // Evento: Conexión exitosa
      socket.on('connect', () => {
        console.log('✅ WebSocket conectado:', socket.id);
        setConnectionStatus('connected');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        onConnect?.();
      });

      // Evento: Desconexión
      socket.on('disconnect', (reason) => {
        console.log('❌ WebSocket desconectado:', reason);
        setConnectionStatus('disconnected');
        setIsConnected(false);
        onDisconnect?.(reason);

        if (reason === 'io server disconnect') {
          socket.connect();
        }
      });

      // Evento: Error de conexión
      socket.on('connect_error', (err) => {
        console.error('❌ Error de conexión WebSocket:', err.message);
        setConnectionStatus('disconnected');
        setError(err);
        onError?.(err);
      });

      // Evento: Intento de reconexión
      socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`🔄 Intento de reconexión #${attemptNumber}`);
        setConnectionStatus('reconnecting');
        reconnectAttemptsRef.current = attemptNumber;
      });

      // Evento: Reconexión exitosa
      socket.on('reconnect', (attemptNumber) => {
        console.log(`✅ Reconectado después de ${attemptNumber} intentos`);
        setConnectionStatus('connected');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      });

      // Evento: Fallo de reconexión
      socket.on('reconnect_failed', () => {
        console.error('❌ Fallo al reconectar');
        setConnectionStatus('disconnected');
        setError(new Error('No se pudo reconectar al servidor'));
      });

      // Evento: Mensaje del bot
      socket.on('bot:response', (data: BotResponseEvent) => {
        console.log('� Mensaje del bot recibido:', data);
        setLastMessage(data);
        onMessage?.(data);
      });

      // Evento: Error del servidor
      socket.on('error', (errorData: WebSocketErrorEvent) => {
        console.error('❌ Error del servidor:', errorData);
        const error = new Error(errorData.message);
        setError(error);
        onError?.(error);
      });

    } catch (err) {
      console.error('❌ Error al crear socket:', err);
      const error = err instanceof Error ? err : new Error('Error desconocido');
      setConnectionStatus('disconnected');
      setError(error);
      onError?.(error);
    }
  }, [
    url,
    namespace,
    reconnection,
    reconnectionAttempts,
    reconnectionDelay,
    timeout,
    onConnect,
    onDisconnect,
    onError,
    onMessage,
  ]);

  /**
   * Desconectar del servidor WebSocket
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('🔌 Desconectando WebSocket...');
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnectionStatus('disconnected');
      setIsConnected(false);
    }
  }, []);

  /**
   * Enviar mensaje al servidor
   */
  const sendMessage = useCallback((sessionId: string, message: string, context?: any) => {
    if (!socketRef.current?.connected) {
      console.error('❌ WebSocket no está conectado');
      throw new Error('WebSocket no está conectado');
    }

    const payload: ChatMessageEvent = {
      sessionId,
      message,
      timestamp: new Date().toISOString(),
      type: 'user',
    };

    console.log('📤 Enviando mensaje:', payload);
    socketRef.current.emit('user:message', { ...payload, context });

    return payload;
  }, []);

  /**
   * Reconectar manualmente
   */
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => connect(), 100);
  }, [disconnect, connect]);

  // Auto-conectar al montar si está habilitado
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      if (socketRef.current) {
        console.log('🧹 Limpiando WebSocket al desmontar');
        disconnect();
      }
    };
  }, [autoConnect, connect, disconnect]);

  return {
    connectionStatus,
    isConnected,
    error,
    lastMessage,
    reconnectAttempts: reconnectAttemptsRef.current,
    socket: socketRef.current,
    connect,
    disconnect,
    sendMessage,
    reconnect,
  };
};

// Hook para manejar el historial de mensajes con persistencia local
export const useMessageHistory = (sessionId: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Cargar mensajes del localStorage si existen
    try {
      const saved = localStorage.getItem(`chat_messages_${sessionId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Guardar mensajes en localStorage cuando cambien
  useEffect(() => {
    try {
      localStorage.setItem(`chat_messages_${sessionId}`, JSON.stringify(messages));
    } catch (error) {
      console.warn('No se pudo guardar el historial de mensajes:', error);
    }
  }, [messages, sessionId]);

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const updateMessage = useCallback((messageId: string, updates: Partial<ChatMessage>) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, ...updates }
          : msg
      )
    );
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    try {
      localStorage.removeItem(`chat_messages_${sessionId}`);
    } catch (error) {
      console.warn('No se pudo limpiar el historial:', error);
    }
  }, [sessionId]);

  return {
    messages,
    addMessage,
    updateMessage,
    clearMessages
  };
};

// Hook para manejar el carrito de compras
export const useShoppingCart = () => {
  const [cartItems, setCartItems] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('shopping_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('shopping_cart', JSON.stringify(cartItems));
    } catch (error) {
      console.warn('No se pudo guardar el carrito:', error);
    }
  }, [cartItems]);

  const addToCart = useCallback(async (item: any, quantity: number = 1) => {
    // 1. Actualizar estado local inmediatamente
    setCartItems(prev => {
      const existingIndex = prev.findIndex(cartItem => cartItem.menuItem.id === item.id);
      
      if (existingIndex > -1) {
        // Actualizar cantidad si ya existe
        return prev.map((cartItem, index) => 
          index === existingIndex 
            ? { ...cartItem, quantity: cartItem.quantity + quantity }
            : cartItem
        );
      } else {
        // Agregar nuevo item
        return [...prev, { menuItem: item, quantity, notes: '' }];
      }
    });

    // 2. Sincronizar con el backend si hay sessionId
    const urlSessionId = new URLSearchParams(window.location.search).get('sessionId');
    if (urlSessionId) {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        
        // Obtener el carrito actual de la sesión
        const sessionResponse = await fetch(`${API_URL}/api/sessions/${urlSessionId}`);
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          const currentCart = sessionData.cart || [];
          
          // Actualizar el carrito
          const existingItemIndex = currentCart.findIndex((cartItem: any) => cartItem.menuItemId === item.id);
          
          let updatedCart;
          if (existingItemIndex > -1) {
            // Incrementar cantidad
            updatedCart = currentCart.map((cartItem: any, index: number) =>
              index === existingItemIndex
                ? { ...cartItem, quantity: cartItem.quantity + quantity }
                : cartItem
            );
          } else {
            // Agregar nuevo item
            updatedCart = [
              ...currentCart,
              {
                menuItemId: item.id,
                quantity: quantity,
                specialInstructions: ''
              }
            ];
          }
          
          // Guardar el carrito actualizado
          const updateResponse = await fetch(`${API_URL}/api/sessions/${urlSessionId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cart: updatedCart })
          });
          
          if (updateResponse.ok) {
            console.log('✅ Carrito sincronizado con el backend');
          }
        }
      } catch (error) {
        console.error('❌ Error sincronizando carrito con backend:', error);
        // No lanzar error, el usuario ya ve el item en su carrito local
      }
    }
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCartItems(prev => prev.filter(item => item.menuItem.id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    setCartItems(prev => 
      prev.map(item => 
        item.menuItem.id === itemId 
          ? { ...item, quantity }
          : item
      )
    );
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setCartItems([]);
    try {
      localStorage.removeItem('shopping_cart');
    } catch (error) {
      console.warn('No se pudo limpiar el carrito:', error);
    }
  }, []);

  const getTotalItems = useCallback(() => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  }, [cartItems]);

  const getTotalPrice = useCallback(() => {
    return cartItems.reduce((total, item) => 
      total + (item.menuItem.price * item.quantity), 0
    );
  }, [cartItems]);

  return {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalItems,
    getTotalPrice
  };
};