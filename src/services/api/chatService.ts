/**
 * Servicio para gestión de chat conversacional con la API
 * @module services/api/chatService
 */

import { apiClient } from './client';
import { AxiosResponse } from 'axios';

/**
 * Tipo para mensaje de chat
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

/**
 * Tipo para sesión de chat
 */
export interface ChatSession {
  sessionId: string;
  userId?: string;
  startedAt: string;
  lastActivity: string;
  messageCount: number;
}

/**
 * Tipo para respuesta de envío de mensaje
 */
export interface ChatResponse {
  response: string;
  sessionId: string;
  suggestions?: string[];
  actions?: Array<{
    type: string;
    data?: any;
    label: string;
  }>;
  recommendations?: any[];
  cart?: {
    items: any[];
    total: number;
    itemCount: number;
  };
  metadata: {
    processingTime: number;
    llmProvider: string;
    fromCache: boolean;
    stage: string;
    sessionCreated?: boolean;
  };
}

/**
 * Tipo para historial de chat
 */
export interface ChatHistory {
  sessionId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Tipo para request de envío de mensaje
 */
export interface SendMessageRequest {
  message: string;
  sessionId?: string;
  context?: Record<string, any>;
}

/**
 * Servicio de Chat - Gestiona la comunicación con el endpoint de chat
 */
export const chatService = {
  /**
   * Envía un mensaje al chat y obtiene la respuesta del LLM
   * @param request - Objeto con el mensaje y contexto opcional
   * @returns Promise con la respuesta del chat
   * @updated 2025-10-21 - Fixed endpoint path
   */
  async sendMessage(request: SendMessageRequest): Promise<ChatResponse> {
    console.log('🚀 Sending to:', '/api/chat'); // Debug log
    try {
      const response: AxiosResponse<ChatResponse> = await apiClient.post(
        '/api/chat',
        request
      );
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  /**
   * Obtiene información de una sesión de chat específica
   * @param sessionId - ID de la sesión
   * @returns Promise con la información de la sesión
   */
  async getSession(sessionId: string): Promise<ChatSession> {
    try {
      const response: AxiosResponse<ChatSession> = await apiClient.get(
        `/api/chat/session/${sessionId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error getting session:', error);
      throw error;
    }
  },

  /**
   * Obtiene el historial completo de una sesión de chat
   * @param sessionId - ID de la sesión
   * @returns Promise con el historial de mensajes
   */
  async getChatHistory(sessionId: string): Promise<ChatHistory> {
    try {
      const response: AxiosResponse<ChatHistory> = await apiClient.get(
        `/api/chat/history/${sessionId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error getting chat history:', error);
      throw error;
    }
  },

  /**
   * Crea una nueva sesión de chat
   * @param userId - ID opcional del usuario
   * @returns Promise con la información de la nueva sesión
   */
  async createSession(userId?: string): Promise<ChatSession> {
    try {
      const response: AxiosResponse<ChatSession> = await apiClient.post(
        '/api/chat/session',
        { userId }
      );
      return response.data;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  },

  /**
   * Elimina una sesión de chat y su historial
   * @param sessionId - ID de la sesión a eliminar
   * @returns Promise que se resuelve cuando la sesión es eliminada
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      await apiClient.delete(`/api/chat/session/${sessionId}`);
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  },

  /**
   * Obtiene todas las sesiones activas del usuario
   * @param userId - ID del usuario (opcional)
   * @returns Promise con array de sesiones
   */
  async getUserSessions(userId?: string): Promise<ChatSession[]> {
    try {
      const response: AxiosResponse<ChatSession[]> = await apiClient.get(
        '/api/chat/sessions',
        { params: { userId } }
      );
      return response.data;
    } catch (error) {
      console.error('Error getting user sessions:', error);
      throw error;
    }
  },
};

export default chatService;
