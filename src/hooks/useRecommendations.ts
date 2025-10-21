/**
 * Hook personalizado para gestión de recomendaciones personalizadas
 * @module hooks/useRecommendations
 */

import { useCallback, useEffect, useState } from 'react';
import {
  recommendationService,
  MenuRecommendation,
  RecommendationFilters,
  RecommendationRequest,
} from '../services/api';

/**
 * Estado de las recomendaciones
 */
export interface RecommendationsState {
  recommendations: MenuRecommendation[];
  isLoading: boolean;
  error: Error | null;
  totalCount: number;
  hasMore: boolean;
}

/**
 * Opciones del hook de recomendaciones
 */
export interface UseRecommendationsOptions {
  /** Obtener recomendaciones automáticamente al montar */
  autoFetch?: boolean;
  /** ID de sesión para contexto */
  sessionId?: string;
  /** Contexto inicial de preferencias */
  initialContext?: RecommendationRequest['context'];
  /** Filtros iniciales */
  initialFilters?: RecommendationFilters;
  /** Número máximo de recomendaciones */
  maxRecommendations?: number;
  /** Confianza mínima (0-1) */
  minConfidence?: number;
  /** Callback cuando se cargan recomendaciones */
  onRecommendationsLoaded?: (recommendations: MenuRecommendation[]) => void;
  /** Callback cuando ocurre un error */
  onError?: (error: Error) => void;
}

/**
 * Hook useRecommendations - Gestiona recomendaciones personalizadas del menú
 * 
 * @example
 * ```tsx
 * const {
 *   recommendations,
 *   isLoading,
 *   fetchRecommendations,
 *   applyFilters,
 *   rateRecommendation,
 * } = useRecommendations({
 *   autoFetch: true,
 *   sessionId: 'session-123',
 *   initialContext: {
 *     preferences: ['vegetariano'],
 *     allergies: ['nueces'],
 *   },
 * });
 * ```
 */
export function useRecommendations(options: UseRecommendationsOptions = {}) {
  const {
    autoFetch = false,
    sessionId,
    initialContext,
    initialFilters,
    maxRecommendations = 10,
    minConfidence = 0.6,
    onRecommendationsLoaded,
    onError,
  } = options;

  const [state, setState] = useState<RecommendationsState>({
    recommendations: [],
    isLoading: false,
    error: null,
    totalCount: 0,
    hasMore: false,
  });

  const [filters, setFilters] = useState<RecommendationFilters | undefined>(initialFilters);
  const [context, setContext] = useState<RecommendationRequest['context'] | undefined>(
    initialContext
  );

  /**
   * Obtener recomendaciones del servidor
   */
  const fetchRecommendations = useCallback(
    async (customFilters?: RecommendationFilters, customContext?: RecommendationRequest['context']) => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        const request: RecommendationRequest = {
          sessionId,
          context: customContext || context,
          maxRecommendations,
          minConfidence,
        };

        let response;
        
        if (customFilters || filters) {
          // Usar endpoint con filtros
          response = await recommendationService.getFilteredRecommendations(
            customFilters || filters!,
            request
          );
        } else {
          // Usar endpoint estándar
          response = await recommendationService.getRecommendations(request);
        }

        setState(prev => ({
          ...prev,
          recommendations: response.recommendations,
          totalCount: response.totalCount,
          hasMore: response.totalCount > response.recommendations.length,
          isLoading: false,
          error: null,
        }));

        onRecommendationsLoaded?.(response.recommendations);
        console.log('✅ Recomendaciones cargadas:', response.recommendations.length);

      } catch (error) {
        console.error('❌ Error al obtener recomendaciones:', error);
        const err = error instanceof Error ? error : new Error('Error desconocido');
        
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: err,
        }));

        onError?.(err);
      }
    },
    [sessionId, context, filters, maxRecommendations, minConfidence, onRecommendationsLoaded, onError]
  );

  /**
   * Aplicar filtros a las recomendaciones
   */
  const applyFilters = useCallback(
    async (newFilters: RecommendationFilters) => {
      setFilters(newFilters);
      await fetchRecommendations(newFilters, context);
    },
    [fetchRecommendations, context]
  );

  /**
   * Actualizar contexto de preferencias
   */
  const updateContext = useCallback(
    async (newContext: RecommendationRequest['context']) => {
      setContext(newContext);
      await fetchRecommendations(filters, newContext);
    },
    [fetchRecommendations, filters]
  );

  /**
   * Limpiar filtros
   */
  const clearFilters = useCallback(async () => {
    setFilters(undefined);
    await fetchRecommendations(undefined, context);
  }, [fetchRecommendations, context]);

  /**
   * Calificar una recomendación
   */
  const rateRecommendation = useCallback(
    async (
      recommendationId: string,
      rating: number,
      feedback?: string,
      accepted?: boolean
    ) => {
      try {
        await recommendationService.rateRecommendation(
          recommendationId,
          rating,
          feedback,
          accepted
        );

        console.log('✅ Recomendación calificada:', recommendationId, rating);

        // Opcionalmente, actualizar el estado local
        setState(prev => ({
          ...prev,
          recommendations: prev.recommendations.map(rec =>
            rec.id === recommendationId
              ? { ...rec, userRating: rating }
              : rec
          ),
        }));

      } catch (error) {
        console.error('❌ Error al calificar recomendación:', error);
        throw error;
      }
    },
    []
  );

  /**
   * Obtener recomendación específica por ID
   */
  const getRecommendationById = useCallback(
    async (recommendationId: string): Promise<MenuRecommendation | null> => {
      try {
        const recommendation = await recommendationService.getRecommendationById(recommendationId);
        return recommendation;
      } catch (error) {
        console.error('❌ Error al obtener recomendación:', error);
        return null;
      }
    },
    []
  );

  /**
   * Buscar recomendaciones por query
   */
  const searchRecommendations = useCallback(
    async (query: string, searchFilters?: RecommendationFilters) => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        const results = await recommendationService.searchRecommendations(
          query,
          searchFilters || filters
        );

        setState(prev => ({
          ...prev,
          recommendations: results,
          totalCount: results.length,
          hasMore: false,
          isLoading: false,
          error: null,
        }));

        console.log('✅ Búsqueda completada:', results.length, 'resultados');

      } catch (error) {
        console.error('❌ Error en búsqueda:', error);
        const err = error instanceof Error ? error : new Error('Error desconocido');
        
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: err,
        }));

        onError?.(err);
      }
    },
    [filters, onError]
  );

  /**
   * Obtener recomendaciones populares/trending
   */
  const fetchTrending = useCallback(
    async (limit: number = 10) => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        const trending = await recommendationService.getTrendingRecommendations(limit);

        setState(prev => ({
          ...prev,
          recommendations: trending,
          totalCount: trending.length,
          hasMore: false,
          isLoading: false,
          error: null,
        }));

        console.log('✅ Trending cargado:', trending.length, 'items');

      } catch (error) {
        console.error('❌ Error al obtener trending:', error);
        const err = error instanceof Error ? error : new Error('Error desconocido');
        
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: err,
        }));

        onError?.(err);
      }
    },
    [onError]
  );

  /**
   * Refrescar recomendaciones (usar filtros y contexto actuales)
   */
  const refresh = useCallback(() => {
    return fetchRecommendations(filters, context);
  }, [fetchRecommendations, filters, context]);

  // Auto-fetch al montar si está habilitado
  useEffect(() => {
    if (autoFetch) {
      fetchRecommendations();
    }
  }, [autoFetch]); // Solo ejecutar una vez al montar

  return {
    // Estado
    recommendations: state.recommendations,
    isLoading: state.isLoading,
    error: state.error,
    totalCount: state.totalCount,
    hasMore: state.hasMore,
    currentFilters: filters,
    currentContext: context,

    // Métodos
    fetchRecommendations,
    applyFilters,
    updateContext,
    clearFilters,
    rateRecommendation,
    getRecommendationById,
    searchRecommendations,
    fetchTrending,
    refresh,
  };
}

export default useRecommendations;
