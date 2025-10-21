/**
 * Servicio para gestión de recomendaciones de menú
 * @module services/api/recommendationService
 */

import { apiClient } from './client';
import { AxiosResponse } from 'axios';

/**
 * Tipo para una recomendación de menú
 */
export interface MenuRecommendation {
  id: string;
  name: string;
  description: string;
  category: 'entrada' | 'plato_principal' | 'postre' | 'bebida' | 'acompañamiento';
  price?: number;
  image?: string;
  ingredients?: string[];
  allergens?: string[];
  nutritionalInfo?: {
    calories?: number;
    protein?: number;
    carbohydrates?: number;
    fat?: number;
  };
  score: number; // Confianza de la recomendación (0-1)
  reason?: string; // Razón de la recomendación
  availabilityStatus?: 'available' | 'limited' | 'unavailable';
}

/**
 * Tipo para request de recomendaciones
 */
export interface RecommendationRequest {
  sessionId?: string;
  context?: {
    preferences?: string[];
    dietary_restrictions?: string[];
    allergies?: string[];
    budget?: number;
    occasion?: string;
    companions?: number;
  };
  maxRecommendations?: number;
  minConfidence?: number;
}

/**
 * Tipo para respuesta de recomendaciones
 */
export interface RecommendationResponse {
  recommendations: MenuRecommendation[];
  totalCount: number;
  sessionId?: string;
  metadata?: {
    processingTime?: number;
    algorithm?: string;
    confidence?: number;
  };
}

/**
 * Tipo para rating de recomendación
 */
export interface RecommendationRating {
  recommendationId: string;
  rating: number; // 1-5
  feedback?: string;
  accepted: boolean;
  timestamp: string;
}

/**
 * Tipo para filtros de recomendaciones
 */
export interface RecommendationFilters {
  categories?: Array<'entrada' | 'plato_principal' | 'postre' | 'bebida' | 'acompañamiento'>;
  excludeAllergens?: string[];
  priceRange?: {
    min?: number;
    max?: number;
  };
  availableOnly?: boolean;
}

/**
 * Servicio de Recomendaciones - Gestiona recomendaciones de menú personalizadas
 */
export const recommendationService = {
  /**
   * Obtiene recomendaciones de menú basadas en contexto y preferencias
   * @param request - Parámetros de la solicitud de recomendaciones
   * @returns Promise con las recomendaciones generadas
   */
  async getRecommendations(request: RecommendationRequest): Promise<RecommendationResponse> {
    try {
      const response: AxiosResponse<RecommendationResponse> = await apiClient.post(
        '/api/recommendations',
        request
      );
      return response.data;
    } catch (error) {
      console.error('Error getting recommendations:', error);
      throw error;
    }
  },

  /**
   * Obtiene recomendaciones con filtros específicos
   * @param filters - Filtros a aplicar
   * @param request - Parámetros adicionales de la solicitud
   * @returns Promise con las recomendaciones filtradas
   */
  async getFilteredRecommendations(
    filters: RecommendationFilters,
    request?: Partial<RecommendationRequest>
  ): Promise<RecommendationResponse> {
    try {
      const response: AxiosResponse<RecommendationResponse> = await apiClient.post(
        '/api/recommendations/filtered',
        {
          ...request,
          filters,
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error getting filtered recommendations:', error);
      throw error;
    }
  },

  /**
   * Obtiene una recomendación específica por ID
   * @param recommendationId - ID de la recomendación
   * @returns Promise con la información de la recomendación
   */
  async getRecommendationById(recommendationId: string): Promise<MenuRecommendation> {
    try {
      const response: AxiosResponse<MenuRecommendation> = await apiClient.get(
        `/api/recommendations/${recommendationId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error getting recommendation by ID:', error);
      throw error;
    }
  },

  /**
   * Envía un rating/feedback sobre una recomendación
   * @param recommendationId - ID de la recomendación
   * @param rating - Puntuación (1-5)
   * @param feedback - Comentario opcional
   * @param accepted - Si el usuario aceptó la recomendación
   * @returns Promise con el rating registrado
   */
  async rateRecommendation(
    recommendationId: string,
    rating: number,
    feedback?: string,
    accepted?: boolean
  ): Promise<RecommendationRating> {
    try {
      const response: AxiosResponse<RecommendationRating> = await apiClient.post(
        `/api/recommendations/${recommendationId}/rate`,
        {
          rating,
          feedback,
          accepted,
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error rating recommendation:', error);
      throw error;
    }
  },

  /**
   * Obtiene el historial de recomendaciones de una sesión
   * @param sessionId - ID de la sesión
   * @returns Promise con el historial de recomendaciones
   */
  async getRecommendationHistory(sessionId: string): Promise<MenuRecommendation[]> {
    try {
      const response: AxiosResponse<MenuRecommendation[]> = await apiClient.get(
        '/api/recommendations/history',
        { params: { sessionId } }
      );
      return response.data;
    } catch (error) {
      console.error('Error getting recommendation history:', error);
      throw error;
    }
  },

  /**
   * Obtiene recomendaciones populares del momento
   * @param limit - Número máximo de recomendaciones
   * @returns Promise con las recomendaciones populares
   */
  async getTrendingRecommendations(limit: number = 10): Promise<MenuRecommendation[]> {
    try {
      const response: AxiosResponse<MenuRecommendation[]> = await apiClient.get(
        '/api/recommendations/trending',
        { params: { limit } }
      );
      return response.data;
    } catch (error) {
      console.error('Error getting trending recommendations:', error);
      throw error;
    }
  },

  /**
   * Busca recomendaciones por nombre o ingredientes
   * @param query - Término de búsqueda
   * @param filters - Filtros opcionales
   * @returns Promise con recomendaciones que coinciden con la búsqueda
   */
  async searchRecommendations(
    query: string,
    filters?: RecommendationFilters
  ): Promise<MenuRecommendation[]> {
    try {
      const response: AxiosResponse<MenuRecommendation[]> = await apiClient.get(
        '/api/recommendations/search',
        {
          params: { query },
          data: filters,
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error searching recommendations:', error);
      throw error;
    }
  },
};

export default recommendationService;
