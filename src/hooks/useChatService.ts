/**
 * Hook personalizado para gestión del chat con API y WebSocket
 * @module hooks/useChatService
 */

import { useCallback, useEffect, useState } from 'react';
import { chatService, ChatResponse, SendMessageRequest } from '../services/api';
import { ChatMessage } from '../types';
import { useWebSocket, BotResponseEvent } from './useWebSocket';

/**
 * Opciones de configuración del chat
 */
export interface UseChatServiceOptions {
  /** ID de la sesión (se crea una automáticamente si no se proporciona) */
  sessionId?: string;
  /** Habilitar WebSocket para tiempo real */
  enableWebSocket?: boolean;
  /** Callback cuando se recibe un mensaje del bot */
  onBotMessage?: (message: ChatMessage) => void;
  /** Callback cuando ocurre un error */
  onError?: (error: Error) => void;
}

/**
 * Estado del chat
 */
export interface ChatState {
  messages: ChatMessage[];
  sessionId: string | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook useChatService - Gestiona el chat con API REST y WebSocket
 * 
 * @example
 * ```tsx
 * const { 
 *   messages, 
 *   sendMessage, 
 *   isLoading, 
 *   connectionStatus 
 * } = useChatService({
 *   enableWebSocket: true,
 *   onBotMessage: (msg) => console.log('Bot:', msg.content),
 * });
 * 
 * // Enviar mensaje
 * await sendMessage('¿Qué recomiendas hoy?');
 * ```
 */
export function useChatService(options: UseChatServiceOptions = {}) {
  const {
    sessionId: initialSessionId,
    enableWebSocket = false, // WebSocket deshabilitado por defecto - backend no implementado aún
    onBotMessage,
    onError,
  } = options;

  const [state, setState] = useState<ChatState>({
    messages: [],
    sessionId: initialSessionId || null,
    isLoading: false,
    error: null,
  });

  // Hook de WebSocket
  const {
    connectionStatus,
    isConnected: wsConnected,
    sendMessage: wsSendMessage,
    lastMessage: wsLastMessage,
  } = useWebSocket({
    autoConnect: enableWebSocket,
    onConnect: () => console.log('✅ Chat conectado via WebSocket'),
    onDisconnect: (reason) => console.log('❌ Chat desconectado:', reason),
    onError: (error) => {
      console.error('❌ Error WebSocket:', error);
      onError?.(error);
    },
  });

  /**
   * Crear sesión de chat si no existe
   * Nota: El backend crea la sesión automáticamente en el primer mensaje
   */
  const ensureSession = useCallback(async () => {
    // El backend maneja la creación de sesión automáticamente
    // Solo retornamos el sessionId actual o undefined
    return state.sessionId || undefined;
  }, [state.sessionId]);

  /**
   * Agregar mensaje al estado
   */
  const addMessage = useCallback((message: ChatMessage) => {
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, message],
    }));
  }, []);

  /**
   * Actualizar mensaje en el estado
   */
  const updateMessage = useCallback((messageId: string, updates: Partial<ChatMessage>) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(msg =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      ),
    }));
  }, []);

  /**
   * Convertir respuesta del bot a ChatMessage
   */
  const botResponseToMessage = useCallback((response: ChatResponse | BotResponseEvent): ChatMessage => {
    // ChatResponse del backend tiene 'response', BotResponseEvent tiene 'message'
    const content = 'response' in response ? response.response : response.message;
    const timestamp = 'metadata' in response 
      ? new Date() 
      : new Date(response.timestamp);
    
    // Mapear recommendations del backend a menuItems del frontend
    let menuItems: any[] | undefined = undefined;
    
    if ('menuItems' in response && response.menuItems) {
      menuItems = response.menuItems;
    } else if ('recommendations' in response && response.recommendations) {
      // Transformar Recommendation[] a MenuItem[]
      menuItems = response.recommendations.map((rec: any) => ({
        ...rec.dish,
        // Agregar campos adicionales de la recomendación
        score: rec.score,
        justification: rec.justification,
        matchReasons: rec.matchReasons,
        rank: rec.rank
      }));
    }
    
    return {
      id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content,
      type: 'bot',
      timestamp,
      status: 'sent',
      menuItems,
    };
  }, []);

  /**
   * Enviar mensaje (vía WebSocket si está conectado, sino vía HTTP)
   */
  const sendMessage = useCallback(async (
    content: string,
    context?: Record<string, any>
  ): Promise<void> => {
    try {
      // Obtener sessionId actual (puede ser undefined en el primer mensaje)
      const sessionId = await ensureSession();

      // Crear mensaje del usuario
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        content,
        type: 'user',
        timestamp: new Date(),
        status: 'sending',
      };

      // Agregar mensaje del usuario al estado
      addMessage(userMessage);
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Actualizar estado a "sent"
      setTimeout(() => {
        updateMessage(userMessage.id, { status: 'sent' });
      }, 500);

      // Enviar vía WebSocket si está conectado
      if (enableWebSocket && wsConnected) {
        console.log('📤 Enviando vía WebSocket');
        wsSendMessage(sessionId || '', content, context);
        
        // Actualizar estado a "delivered"
        setTimeout(() => {
          updateMessage(userMessage.id, { status: 'delivered' });
        }, 1000);
      } else {
        // Fallback a HTTP si WebSocket no está disponible
        console.log('📤 Enviando vía HTTP');
        
        const request: SendMessageRequest = {
          message: content,
          sessionId, // Puede ser undefined, el backend lo creará
          context,
        };

        const response = await chatService.sendMessage(request);
        
        // Guardar el sessionId si fue creado por el backend
        if (response.sessionId && response.sessionId !== sessionId) {
          setState(prev => ({ ...prev, sessionId: response.sessionId }));
          console.log('✅ Sesión creada por backend:', response.sessionId);
        }
        
        // Actualizar mensaje del usuario
        updateMessage(userMessage.id, { status: 'delivered' });

        // Agregar respuesta del bot
        const botMessage = botResponseToMessage(response);
        addMessage(botMessage);
        onBotMessage?.(botMessage);

        setState(prev => ({ ...prev, isLoading: false }));
      }

    } catch (error) {
      console.error('❌ Error al enviar mensaje:', error);
      const err = error instanceof Error ? error : new Error('Error desconocido');
      setState(prev => ({ ...prev, isLoading: false, error: err }));
      onError?.(err);
      throw err;
    }
  }, [
    ensureSession,
    addMessage,
    updateMessage,
    botResponseToMessage,
    enableWebSocket,
    wsConnected,
    wsSendMessage,
    onBotMessage,
    onError,
  ]);

  /**
   * Obtener historial de chat
   */
  const loadHistory = useCallback(async (sessionId?: string) => {
    const sid = sessionId || state.sessionId;
    if (!sid) {
      console.warn('⚠️ No hay sessionId para cargar historial');
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const history = await chatService.getChatHistory(sid);
      
      // Convertir historial a ChatMessages
      const messages: ChatMessage[] = history.messages.map((msg, index) => ({
        id: `history-${index}-${Date.now()}`,
        content: msg.content,
        type: msg.role === 'user' ? 'user' : 'bot',
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
        status: 'delivered',
      }));

      setState(prev => ({
        ...prev,
        messages,
        isLoading: false,
      }));

      console.log('✅ Historial cargado:', messages.length, 'mensajes');
    } catch (error) {
      console.error('❌ Error al cargar historial:', error);
      const err = error instanceof Error ? error : new Error('Error desconocido');
      setState(prev => ({ ...prev, isLoading: false, error: err }));
      onError?.(err);
    }
  }, [state.sessionId, onError]);

  /**
   * Limpiar chat
   */
  const clearChat = useCallback(async () => {
    try {
      if (state.sessionId) {
        await chatService.deleteSession(state.sessionId);
      }
      
      setState({
        messages: [],
        sessionId: null,
        isLoading: false,
        error: null,
      });

      console.log('✅ Chat limpiado');
    } catch (error) {
      console.error('❌ Error al limpiar chat:', error);
    }
  }, [state.sessionId]);

  // Procesar mensajes recibidos vía WebSocket
  useEffect(() => {
    if (wsLastMessage && enableWebSocket) {
      console.log('📨 Procesando mensaje WebSocket:', wsLastMessage);
      
      const botMessage = botResponseToMessage(wsLastMessage);
      addMessage(botMessage);
      onBotMessage?.(botMessage);
      
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [wsLastMessage, enableWebSocket, botResponseToMessage, addMessage, onBotMessage]);

  return {
    // Estado
    messages: state.messages,
    sessionId: state.sessionId,
    isLoading: state.isLoading,
    error: state.error,
    connectionStatus: enableWebSocket ? connectionStatus : 'connected', // HTTP siempre disponible
    isConnected: enableWebSocket ? wsConnected : true, // HTTP siempre conectado

    // Métodos
    sendMessage,
    loadHistory,
    clearChat,
    addMessage,
    updateMessage,
  };
}

export default useChatService;
