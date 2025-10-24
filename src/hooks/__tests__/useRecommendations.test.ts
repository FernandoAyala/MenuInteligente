/**
 * Tests para useRecommendations hook
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useRecommendations } from '../useRecommendations';
import { recommendationService } from '../../services/api';
import type { MenuRecommendation, RecommendationFilters, RecommendationRequest } from '../../services/api';

// Mock del servicio de recomendaciones
jest.mock('../../services/api', () => ({
  recommendationService: {
    getRecommendations: jest.fn(),
    getFilteredRecommendations: jest.fn(),
    rateRecommendation: jest.fn(),
    getRecommendationById: jest.fn(),
    searchRecommendations: jest.fn(),
    getTrendingRecommendations: jest.fn(),
  },
}));

const mockRecommendationService = recommendationService as jest.Mocked<typeof recommendationService>;

describe('useRecommendations', () => {
  const mockRecommendations: MenuRecommendation[] = [
    {
      id: 'rec-1',
      menuItemId: 'item-1',
      name: 'Pizza Margherita',
      description: 'Pizza clásica con mozzarella y albahaca',
      price: 1200,
      confidence: 0.8,
      reasons: ['Popular', 'Vegetariano'],
      category: 'main',
      image: 'pizza.jpg',
      nutritionalInfo: {
        calories: 280,
        protein: 12,
        carbs: 35,
        fat: 8,
      },
      userRating: null,
    },
    {
      id: 'rec-2',
      menuItemId: 'item-2',
      name: 'Ensalada César',
      description: 'Ensalada fresca con pollo y aderezo César',
      price: 950,
      confidence: 0.7,
      reasons: ['Saludable', 'Ligero'],
      category: 'salad',
      image: 'caesar.jpg',
      nutritionalInfo: {
        calories: 180,
        protein: 25,
        carbs: 8,
        fat: 6,
      },
      userRating: 4,
    },
  ];

  const mockResponse = {
    recommendations: mockRecommendations,
    totalCount: 2,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Inicialización', () => {
    it('debe tener valores iniciales correctos', () => {
      const { result } = renderHook(() => useRecommendations());

      expect(result.current.recommendations).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.totalCount).toBe(0);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.currentFilters).toBeUndefined();
      expect(result.current.currentContext).toBeUndefined();
    });

    it('debe configurar filtros y contexto inicial', () => {
      const initialFilters: RecommendationFilters = {
        category: 'main',
        priceRange: { min: 500, max: 2000 },
      };

      const initialContext: RecommendationRequest['context'] = {
        preferences: ['vegetariano'],
        allergies: ['nueces'],
      };

      const { result } = renderHook(() =>
        useRecommendations({
          initialFilters,
          initialContext,
        })
      );

      expect(result.current.currentFilters).toEqual(initialFilters);
      expect(result.current.currentContext).toEqual(initialContext);
    });

    it('debe hacer auto-fetch si está habilitado', async () => {
      mockRecommendationService.getRecommendations.mockResolvedValue(mockResponse);

      renderHook(() =>
        useRecommendations({
          autoFetch: true,
          sessionId: 'session-123',
        })
      );

      await waitFor(() => {
        expect(mockRecommendationService.getRecommendations).toHaveBeenCalledWith({
          sessionId: 'session-123',
          context: undefined,
          maxRecommendations: 10,
          minConfidence: 0.6,
        });
      });
    });
  });

  describe('fetchRecommendations', () => {
    it('debe obtener recomendaciones exitosamente', async () => {
      mockRecommendationService.getRecommendations.mockResolvedValue(mockResponse);

      const onRecommendationsLoaded = jest.fn();
      const { result } = renderHook(() =>
        useRecommendations({
          sessionId: 'session-123',
          onRecommendationsLoaded,
        })
      );

      await act(async () => {
        await result.current.fetchRecommendations();
      });

      expect(result.current.recommendations).toEqual(mockRecommendations);
      expect(result.current.totalCount).toBe(2);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(onRecommendationsLoaded).toHaveBeenCalledWith(mockRecommendations);
    });

    it('debe usar filtros cuando están disponibles', async () => {
      const filters: RecommendationFilters = {
        category: 'main',
        priceRange: { min: 1000, max: 2000 },
      };

      mockRecommendationService.getFilteredRecommendations.mockResolvedValue(mockResponse);

      const { result } = renderHook(() =>
        useRecommendations({
          sessionId: 'session-123',
          initialFilters: filters,
        })
      );

      await act(async () => {
        await result.current.fetchRecommendations();
      });

      expect(mockRecommendationService.getFilteredRecommendations).toHaveBeenCalledWith(
        filters,
        {
          sessionId: 'session-123',
          context: undefined,
          maxRecommendations: 10,
          minConfidence: 0.6,
        }
      );
    });

    it('debe manejar errores', async () => {
      const error = new Error('Error de red');
      mockRecommendationService.getRecommendations.mockRejectedValue(error);

      const onError = jest.fn();
      const { result } = renderHook(() =>
        useRecommendations({
          sessionId: 'session-123',
          onError,
        })
      );

      await act(async () => {
        await result.current.fetchRecommendations();
      });

      expect(result.current.error).toEqual(error);
      expect(result.current.isLoading).toBe(false);
      expect(onError).toHaveBeenCalledWith(error);
    });

    it('debe calcular hasMore correctamente', async () => {
      const responseWithMore = {
        recommendations: mockRecommendations,
        totalCount: 10,
      };

      mockRecommendationService.getRecommendations.mockResolvedValue(responseWithMore);

      const { result } = renderHook(() => useRecommendations());

      await act(async () => {
        await result.current.fetchRecommendations();
      });

      expect(result.current.hasMore).toBe(true);
    });
  });

  describe('applyFilters', () => {
    it('debe aplicar filtros y obtener recomendaciones', async () => {
      const filters: RecommendationFilters = {
        category: 'dessert',
        dietary: ['vegetarian'],
      };

      mockRecommendationService.getFilteredRecommendations.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useRecommendations({ sessionId: 'session-123' }));

      await act(async () => {
        await result.current.applyFilters(filters);
      });

      expect(result.current.currentFilters).toEqual(filters);
      expect(mockRecommendationService.getFilteredRecommendations).toHaveBeenCalledWith(
        filters,
        expect.objectContaining({ sessionId: 'session-123' })
      );
    });
  });

  describe('updateContext', () => {
    it('debe actualizar contexto y obtener recomendaciones', async () => {
      const newContext: RecommendationRequest['context'] = {
        preferences: ['spicy', 'meat'],
        allergies: ['dairy'],
      };

      mockRecommendationService.getRecommendations.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useRecommendations({ sessionId: 'session-123' }));

      await act(async () => {
        await result.current.updateContext(newContext);
      });

      expect(result.current.currentContext).toEqual(newContext);
      expect(mockRecommendationService.getRecommendations).toHaveBeenCalledWith(
        expect.objectContaining({ context: newContext })
      );
    });
  });

  describe('clearFilters', () => {
    it('debe limpiar filtros y obtener recomendaciones sin filtros', async () => {
      const initialFilters: RecommendationFilters = { category: 'main' };

      mockRecommendationService.getFilteredRecommendations.mockResolvedValue(mockResponse);
      mockRecommendationService.getRecommendations.mockResolvedValue(mockResponse);

      const { result } = renderHook(() =>
        useRecommendations({
          sessionId: 'session-123',
          initialFilters,
        })
      );

      await act(async () => {
        await result.current.clearFilters();
      });

      expect(result.current.currentFilters).toBeUndefined();
      expect(mockRecommendationService.getRecommendations).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: 'session-123' })
      );
    });
  });

  describe('rateRecommendation', () => {
    it('debe calificar recomendación exitosamente', async () => {
      mockRecommendationService.rateRecommendation.mockResolvedValue(undefined);

      const { result } = renderHook(() => useRecommendations());

      // Establecer recomendaciones iniciales
      act(() => {
        result.current.recommendations.push(...mockRecommendations);
      });

      await act(async () => {
        await result.current.rateRecommendation('rec-1', 5, 'Excelente', true);
      });

      expect(mockRecommendationService.rateRecommendation).toHaveBeenCalledWith(
        'rec-1',
        5,
        'Excelente',
        true
      );
    });

    it('debe actualizar rating local después de calificar', async () => {
      mockRecommendationService.getRecommendations.mockResolvedValue(mockResponse);
      mockRecommendationService.rateRecommendation.mockResolvedValue(undefined);

      const { result } = renderHook(() => useRecommendations());

      // Cargar recomendaciones primero
      await act(async () => {
        await result.current.fetchRecommendations();
      });

      // Calificar recomendación
      await act(async () => {
        await result.current.rateRecommendation('rec-1', 5);
      });

      const updatedRec = result.current.recommendations.find(r => r.id === 'rec-1');
      expect(updatedRec?.userRating).toBe(5);
    });

    it('debe manejar errores al calificar', async () => {
      const error = new Error('Error al calificar');
      mockRecommendationService.rateRecommendation.mockRejectedValue(error);

      const { result } = renderHook(() => useRecommendations());

      await expect(
        act(async () => {
          await result.current.rateRecommendation('rec-1', 5);
        })
      ).rejects.toThrow('Error al calificar');
    });
  });

  describe('getRecommendationById', () => {
    it('debe obtener recomendación por ID', async () => {
      mockRecommendationService.getRecommendationById.mockResolvedValue(mockRecommendations[0]);

      const { result } = renderHook(() => useRecommendations());

      let recommendation: any;
      await act(async () => {
        recommendation = await result.current.getRecommendationById('rec-1');
      });

      expect(recommendation).toEqual(mockRecommendations[0]);
      expect(mockRecommendationService.getRecommendationById).toHaveBeenCalledWith('rec-1');
    });

    it('debe retornar null en caso de error', async () => {
      mockRecommendationService.getRecommendationById.mockRejectedValue(new Error('Not found'));

      const { result } = renderHook(() => useRecommendations());

      let recommendation: any;
      await act(async () => {
        recommendation = await result.current.getRecommendationById('invalid-id');
      });

      expect(recommendation).toBe(null);
    });
  });

  describe('searchRecommendations', () => {
    it('debe buscar recomendaciones por query', async () => {
      mockRecommendationService.searchRecommendations.mockResolvedValue(mockRecommendations);

      const { result } = renderHook(() => useRecommendations());

      await act(async () => {
        await result.current.searchRecommendations('pizza');
      });

      expect(mockRecommendationService.searchRecommendations).toHaveBeenCalledWith(
        'pizza',
        undefined
      );
      expect(result.current.recommendations).toEqual(mockRecommendations);
      expect(result.current.hasMore).toBe(false);
    });

    it('debe buscar con filtros personalizados', async () => {
      const searchFilters: RecommendationFilters = { category: 'main' };
      mockRecommendationService.searchRecommendations.mockResolvedValue(mockRecommendations);

      const { result } = renderHook(() => useRecommendations());

      await act(async () => {
        await result.current.searchRecommendations('pizza', searchFilters);
      });

      expect(mockRecommendationService.searchRecommendations).toHaveBeenCalledWith(
        'pizza',
        searchFilters
      );
    });

    it('debe manejar errores en búsqueda', async () => {
      const error = new Error('Error de búsqueda');
      mockRecommendationService.searchRecommendations.mockRejectedValue(error);

      const onError = jest.fn();
      const { result } = renderHook(() => useRecommendations({ onError }));

      await act(async () => {
        await result.current.searchRecommendations('pizza');
      });

      expect(result.current.error).toEqual(error);
      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  describe('fetchTrending', () => {
    it('debe obtener recomendaciones trending', async () => {
      mockRecommendationService.getTrendingRecommendations.mockResolvedValue(mockRecommendations);

      const { result } = renderHook(() => useRecommendations());

      await act(async () => {
        await result.current.fetchTrending(5);
      });

      expect(mockRecommendationService.getTrendingRecommendations).toHaveBeenCalledWith(5);
      expect(result.current.recommendations).toEqual(mockRecommendations);
    });

    it('debe usar límite por defecto', async () => {
      mockRecommendationService.getTrendingRecommendations.mockResolvedValue(mockRecommendations);

      const { result } = renderHook(() => useRecommendations());

      await act(async () => {
        await result.current.fetchTrending();
      });

      expect(mockRecommendationService.getTrendingRecommendations).toHaveBeenCalledWith(10);
    });
  });

  describe('refresh', () => {
    it('debe refrescar con filtros y contexto actuales', async () => {
      const filters: RecommendationFilters = { category: 'main' };
      const context: RecommendationRequest['context'] = { preferences: ['spicy'] };

      mockRecommendationService.getFilteredRecommendations.mockResolvedValue(mockResponse);

      const { result } = renderHook(() =>
        useRecommendations({
          sessionId: 'session-123',
          initialFilters: filters,
          initialContext: context,
        })
      );

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockRecommendationService.getFilteredRecommendations).toHaveBeenCalledWith(
        filters,
        expect.objectContaining({
          sessionId: 'session-123',
          context,
        })
      );
    });
  });

  describe('Estados de carga', () => {
    it('debe manejar estados de carga correctamente', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockRecommendationService.getRecommendations.mockReturnValue(promise);

      const { result } = renderHook(() => useRecommendations());

      // Iniciar operación
      act(() => {
        result.current.fetchRecommendations();
      });

      expect(result.current.isLoading).toBe(true);

      // Resolver promesa
      await act(async () => {
        resolvePromise!(mockResponse);
        await promise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Opciones de configuración', () => {
    it('debe usar configuración personalizada', () => {
      const options = {
        maxRecommendations: 20,
        minConfidence: 0.8,
        sessionId: 'custom-session',
      };

      mockRecommendationService.getRecommendations.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useRecommendations(options));

      act(() => {
        result.current.fetchRecommendations();
      });

      expect(mockRecommendationService.getRecommendations).toHaveBeenCalledWith({
        sessionId: 'custom-session',
        context: undefined,
        maxRecommendations: 20,
        minConfidence: 0.8,
      });
    });
  });

  describe('Casos de uso realistas', () => {
    it('debe manejar flujo completo de usuario', async () => {
      mockRecommendationService.getRecommendations.mockResolvedValue(mockResponse);
      mockRecommendationService.getFilteredRecommendations.mockResolvedValue(mockResponse);
      mockRecommendationService.rateRecommendation.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useRecommendations({
          sessionId: 'user-session',
          autoFetch: true,
        })
      );

      // Esperar carga inicial
      await waitFor(() => {
        expect(result.current.recommendations).toEqual(mockRecommendations);
      });

      // Aplicar filtros
      await act(async () => {
        await result.current.applyFilters({ category: 'main' });
      });

      // Calificar recomendación
      await act(async () => {
        await result.current.rateRecommendation('rec-1', 5, 'Excelente');
      });

      // Buscar
      await act(async () => {
        await result.current.searchRecommendations('pizza');
      });

      expect(mockRecommendationService.getRecommendations).toHaveBeenCalled();
      expect(mockRecommendationService.getFilteredRecommendations).toHaveBeenCalled();
      expect(mockRecommendationService.rateRecommendation).toHaveBeenCalled();
      expect(mockRecommendationService.searchRecommendations).toHaveBeenCalled();
    });
  });
});