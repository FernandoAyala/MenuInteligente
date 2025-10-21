/**
 * Punto de entrada centralizado para servicios de API
 * @module services/api
 */

// Cliente HTTP base
export { apiClient } from './client';

// Servicio de Chat
export {
  chatService,
  type ChatMessage,
  type ChatSession,
  type ChatResponse,
  type ChatHistory,
  type SendMessageRequest,
} from './chatService';

// Servicio de LLM
export {
  llmService,
  type LLMModel,
  type LLMProviderConfig,
  type ConnectionTestResult,
  type LLMUsageStats,
} from './llmService';

// Servicio de Recomendaciones
export {
  recommendationService,
  type MenuRecommendation,
  type RecommendationRequest,
  type RecommendationResponse,
  type RecommendationRating,
  type RecommendationFilters,
} from './recommendationService';
