import { useCallback, useEffect, useState } from 'react';
import { ChatMessage, ConnectionStatus } from '../types';

// Simulación de WebSocket para desarrollo/testing
export interface MockWebSocket {
  send: (data: string) => void;
  close: () => void;
  addEventListener: (event: string, handler: (data: any) => void) => void;
  removeEventListener: (event: string, handler: (data: any) => void) => void;
  readyState: number;
}

class MockWebSocketClient implements MockWebSocket {
  readyState: number = 1; // OPEN
  private eventHandlers: Map<string, ((data: any) => void)[]> = new Map();
  private connectionStatus: ConnectionStatus = 'connected';

  constructor(private onStatusChange?: (status: ConnectionStatus) => void) {
    this.simulateConnection();
  }

  private simulateConnection() {
    // Simular cambios de conexión ocasionales
    setInterval(() => {
      if (Math.random() > 0.98) { // 2% de probabilidad
        this.connectionStatus = 'reconnecting';
        this.readyState = 0; // CONNECTING
        this.onStatusChange?.('reconnecting');
        
        setTimeout(() => {
          this.connectionStatus = 'connected';
          this.readyState = 1; // OPEN
          this.onStatusChange?.('connected');
        }, 1000 + Math.random() * 2000);
      }
    }, 5000);
  }

  send(data: string) {
    if (this.readyState !== 1) {
      throw new Error('WebSocket no está conectado');
    }

    try {
      const message = JSON.parse(data);
      console.log('📤 Enviando mensaje:', message);

      // Simular respuesta del servidor
      setTimeout(() => {
        this.triggerEvent('message', {
          data: JSON.stringify({
            type: 'response',
            content: message.content,
            timestamp: new Date().toISOString()
          })
        });
      }, 500 + Math.random() * 1500);

    } catch (error) {
      console.error('Error al enviar mensaje:', error);
    }
  }

  close() {
    this.readyState = 3; // CLOSED
    this.connectionStatus = 'disconnected';
    this.onStatusChange?.('disconnected');
    this.triggerEvent('close', {});
  }

  addEventListener(event: string, handler: (data: any) => void) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  removeEventListener(event: string, handler: (data: any) => void) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private triggerEvent(event: string, data: any) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }
}

// Hook para manejar la conexión WebSocket
export const useWebSocket = (url?: string) => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [socket, setSocket] = useState<MockWebSocket | null>(null);
  const [lastMessage, setLastMessage] = useState<any>(null);

  useEffect(() => {
    // En desarrollo usamos el mock, en producción sería WebSocket real
    const mockSocket = new MockWebSocketClient(setConnectionStatus);
    
    const handleMessage = (event: any) => {
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data);
        console.log('📨 Mensaje recibido:', data);
      } catch (error) {
        console.error('Error al procesar mensaje:', error);
      }
    };

    const handleOpen = () => {
      setConnectionStatus('connected');
      console.log('🔗 WebSocket conectado');
    };

    const handleClose = () => {
      setConnectionStatus('disconnected');
      console.log('🔌 WebSocket desconectado');
    };

    const handleError = (error: any) => {
      console.error('❌ Error de WebSocket:', error);
      setConnectionStatus('disconnected');
    };

    mockSocket.addEventListener('message', handleMessage);
    mockSocket.addEventListener('open', handleOpen);
    mockSocket.addEventListener('close', handleClose);
    mockSocket.addEventListener('error', handleError);

    setSocket(mockSocket);
    setConnectionStatus('connected');

    return () => {
      mockSocket.removeEventListener('message', handleMessage);
      mockSocket.removeEventListener('open', handleOpen);
      mockSocket.removeEventListener('close', handleClose);
      mockSocket.removeEventListener('error', handleError);
      mockSocket.close();
    };
  }, [url]);

  const sendMessage = useCallback((message: any) => {
    if (socket && connectionStatus === 'connected') {
      try {
        socket.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error al enviar mensaje:', error);
      }
    }
  }, [socket, connectionStatus]);

  const reconnect = useCallback(() => {
    if (socket) {
      socket.close();
      // El efecto se encargará de recrear la conexión
    }
  }, [socket]);

  return {
    connectionStatus,
    lastMessage,
    sendMessage,
    reconnect,
    isConnected: connectionStatus === 'connected'
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

  const addToCart = useCallback((item: any, quantity: number = 1) => {
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