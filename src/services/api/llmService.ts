/**
 * Servicio para gestión de proveedores LLM
 * @module services/api/llmService
 */

import { apiClient } from './client';
import { AxiosResponse } from 'axios';

/**
 * Tipo para información de un modelo LLM
 */
export interface LLMModel {
  id: string;
  name: string;
  provider: 'openai' | 'gemini';
  description?: string;
  maxTokens?: number;
  costPer1kTokens?: number;
  capabilities?: string[];
  isAvailable: boolean;
}

/**
 * Tipo para configuración de un proveedor LLM
 */
export interface LLMProviderConfig {
  provider: 'openai' | 'gemini';
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

/**
 * Tipo para resultado de test de conexión
 */
export interface ConnectionTestResult {
  provider: 'openai' | 'gemini';
  status: 'connected' | 'failed' | 'unavailable';
  message: string;
  responseTime?: number;
  modelVersion?: string;
  error?: string;
}

/**
 * Tipo para estadísticas de uso de LLM
 */
export interface LLMUsageStats {
  provider: 'openai' | 'gemini';
  totalRequests: number;
  totalTokens: number;
  averageResponseTime: number;
  errorRate: number;
  lastUsed?: string;
}

/**
 * Servicio de LLM - Gestiona proveedores y modelos de lenguaje
 */
export const llmService = {
  /**
   * Obtiene la lista de modelos LLM disponibles
   * @returns Promise con array de modelos disponibles
   */
  async getAvailableModels(): Promise<LLMModel[]> {
    try {
      const response: AxiosResponse<LLMModel[]> = await apiClient.get(
        '/api/llm/models'
      );
      return response.data;
    } catch (error) {
      console.error('Error getting available models:', error);
      throw error;
    }
  },

  /**
   * Obtiene información de un modelo específico
   * @param modelId - ID del modelo
   * @returns Promise con información del modelo
   */
  async getModelInfo(modelId: string): Promise<LLMModel> {
    try {
      const response: AxiosResponse<LLMModel> = await apiClient.get(
        `/api/llm/models/${modelId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error getting model info:', error);
      throw error;
    }
  },

  /**
   * Prueba la conexión con un proveedor LLM específico
   * @param provider - Proveedor a testear ('openai' | 'gemini')
   * @returns Promise con resultado del test
   */
  async testConnection(provider: 'openai' | 'gemini'): Promise<ConnectionTestResult> {
    try {
      const response: AxiosResponse<ConnectionTestResult> = await apiClient.post(
        '/api/llm/test-connection',
        { provider }
      );
      return response.data;
    } catch (error) {
      console.error('Error testing connection:', error);
      throw error;
    }
  },

  /**
   * Obtiene la configuración actual del proveedor LLM
   * @returns Promise con la configuración activa
   */
  async getCurrentConfig(): Promise<LLMProviderConfig> {
    try {
      const response: AxiosResponse<LLMProviderConfig> = await apiClient.get(
        '/api/llm/config'
      );
      return response.data;
    } catch (error) {
      console.error('Error getting LLM config:', error);
      throw error;
    }
  },

  /**
   * Actualiza la configuración del proveedor LLM
   * @param config - Nueva configuración
   * @returns Promise con la configuración actualizada
   */
  async updateConfig(config: Partial<LLMProviderConfig>): Promise<LLMProviderConfig> {
    try {
      const response: AxiosResponse<LLMProviderConfig> = await apiClient.put(
        '/api/llm/config',
        config
      );
      return response.data;
    } catch (error) {
      console.error('Error updating LLM config:', error);
      throw error;
    }
  },

  /**
   * Obtiene estadísticas de uso de los proveedores LLM
   * @param provider - Proveedor específico (opcional)
   * @returns Promise con estadísticas de uso
   */
  async getUsageStats(provider?: 'openai' | 'gemini'): Promise<LLMUsageStats[]> {
    try {
      const response: AxiosResponse<LLMUsageStats[]> = await apiClient.get(
        '/api/llm/stats',
        { params: { provider } }
      );
      return response.data;
    } catch (error) {
      console.error('Error getting usage stats:', error);
      throw error;
    }
  },

  /**
   * Reinicia las credenciales de un proveedor (útil cuando expiran)
   * @param provider - Proveedor a reiniciar
   * @returns Promise que se resuelve cuando las credenciales se reinician
   */
  async resetProviderCredentials(provider: 'openai' | 'gemini'): Promise<void> {
    try {
      await apiClient.post('/api/llm/reset-credentials', { provider });
    } catch (error) {
      console.error('Error resetting provider credentials:', error);
      throw error;
    }
  },
};

export default llmService;
