/**
 * Tests para RecommendationsPanel
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RecommendationsPanel } from '../RecommendationsPanel';
import * as useRecommendationsHook from '../../hooks/useRecommendations';

// Mock servicios que usan import.meta
jest.mock('../../services/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }
}));

// Mock del hook useRecommendations
jest.mock('../../hooks/useRecommendations');

const mockUseRecommendations = useRecommendationsHook as jest.Mocked<
  typeof useRecommendationsHook
>;

describe('RecommendationsPanel', () => {
  const mockRecommendations = [
    {
      id: '1',
      name: 'Pizza Margarita',
      description: 'Pizza clásica italiana',
      price: 1500,
      category: 'plato_principal' as const,
      ingredients: ['tomate', 'mozzarella', 'albahaca'],
      allergens: [],
      dietaryRestrictions: ['vegetarian'],
      available: true,
      imageUrl: '/pizza.jpg',
      score: 0.95,
      reason: 'Coincide con tus preferencias vegetarianas',
    },
    {
      id: '2',
      name: 'Ensalada César',
      description: 'Ensalada fresca con pollo',
      price: 1200,
      category: 'entrada' as const,
      ingredients: ['lechuga', 'pollo', 'queso'],
      allergens: [],
      dietaryRestrictions: [],
      available: true,
      imageUrl: '/ensalada.jpg',
      score: 0.85,
      reason: 'Opción ligera y saludable',
    },
  ];

  const defaultMockHook = {
    recommendations: mockRecommendations,
    isLoading: false,
    error: null,
    totalCount: 2,
    hasMore: false,
    currentFilters: undefined,
    currentContext: undefined,
    fetchRecommendations: jest.fn(),
    applyFilters: jest.fn(),
    updateContext: jest.fn(),
    clearFilters: jest.fn(),
    rateRecommendation: jest.fn(),
    getRecommendationById: jest.fn(),
    searchRecommendations: jest.fn(),
    fetchTrending: jest.fn(),
    refresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRecommendations.useRecommendations.mockReturnValue(defaultMockHook);
  });

  describe('Rendering', () => {
    it('debe renderizar correctamente con recomendaciones', () => {
      render(<RecommendationsPanel sessionId="test-session" />);

      expect(screen.getByText('Recomendaciones para ti')).toBeInTheDocument();
      expect(screen.getByText('Pizza Margarita')).toBeInTheDocument();
      expect(screen.getByText('Ensalada César')).toBeInTheDocument();
    });

    it('debe mostrar estado de carga', () => {
      mockUseRecommendations.useRecommendations.mockReturnValue({
        ...defaultMockHook,
        isLoading: true,
        recommendations: [],
      });

      render(<RecommendationsPanel sessionId="test-session" />);

      expect(screen.getByText(/cargando recomendaciones/i)).toBeInTheDocument();
    });

    it('debe mostrar mensaje de error', () => {
      mockUseRecommendations.useRecommendations.mockReturnValue({
        ...defaultMockHook,
        error: 'Error al cargar recomendaciones',
        recommendations: [],
      });

      render(<RecommendationsPanel sessionId="test-session" />);

      expect(screen.getByText(/error al cargar recomendaciones/i)).toBeInTheDocument();
    });

    it('debe mostrar mensaje cuando no hay recomendaciones', () => {
      mockUseRecommendations.useRecommendations.mockReturnValue({
        ...defaultMockHook,
        recommendations: [],
      });

      render(<RecommendationsPanel sessionId="test-session" />);

      expect(
        screen.getByText(/no hay recomendaciones disponibles/i)
      ).toBeInTheDocument();
    });
  });

  describe('Filtros', () => {
    it('debe mostrar botón de filtros', () => {
      render(<RecommendationsPanel sessionId="test-session" />);

      const filterButton = screen.getByRole('button', { name: /filtros/i });
      expect(filterButton).toBeInTheDocument();
    });

    it('debe expandir/contraer panel de filtros al hacer clic', () => {
      render(<RecommendationsPanel sessionId="test-session" />);

      const filterButton = screen.getByRole('button', { name: /filtros/i });
      
      // Inicialmente no debe estar expandido
      expect(screen.queryByText(/precio máximo/i)).not.toBeInTheDocument();

      // Expandir
      fireEvent.click(filterButton);
      expect(screen.getByText(/precio máximo/i)).toBeInTheDocument();

      // Contraer
      fireEvent.click(filterButton);
      expect(screen.queryByText(/precio máximo/i)).not.toBeInTheDocument();
    });

    it('debe aplicar filtros y actualizar recomendaciones', async () => {
      const applyFilters = jest.fn();
      mockUseRecommendations.useRecommendations.mockReturnValue({
        ...defaultMockHook,
        applyFilters,
      });

      render(<RecommendationsPanel sessionId="test-session" />);

      // Expandir filtros
      const filterButton = screen.getByRole('button', { name: /filtros/i });
      fireEvent.click(filterButton);

      // Cambiar precio máximo
      const priceInput = screen.getByLabelText(/precio máximo/i);
      fireEvent.change(priceInput, { target: { value: '1500' } });

      await waitFor(() => {
        expect(applyFilters).toHaveBeenCalledWith(
          expect.objectContaining({ maxPrice: 1500 })
        );
      });
    });

    it('debe filtrar por categoría', async () => {
      const applyFilters = jest.fn();
      mockUseRecommendations.useRecommendations.mockReturnValue({
        ...defaultMockHook,
        applyFilters,
      });

      render(<RecommendationsPanel sessionId="test-session" />);

      // Expandir filtros
      const filterButton = screen.getByRole('button', { name: /filtros/i });
      fireEvent.click(filterButton);

      // Seleccionar categoría
      const categorySelect = screen.getByLabelText(/categoría/i);
      fireEvent.change(categorySelect, { target: { value: 'entrada' } });

      await waitFor(() => {
        expect(applyFilters).toHaveBeenCalledWith(
          expect.objectContaining({ category: 'entrada' })
        );
      });
    });
  });

  describe('Interacciones', () => {
    it('debe llamar onItemClick cuando se hace clic en un item', () => {
      const onItemClick = jest.fn();
      render(
        <RecommendationsPanel sessionId="test-session" onItemClick={onItemClick} />
      );

      const pizzaCard = screen.getByText('Pizza Margarita').closest('div');
      if (pizzaCard) {
        fireEvent.click(pizzaCard);
        expect(onItemClick).toHaveBeenCalledWith(
          expect.objectContaining({ id: '1', name: 'Pizza Margarita' })
        );
      }
    });

    it('debe llamar onAddToCart cuando se añade al carrito', () => {
      const onAddToCart = jest.fn();
      render(
        <RecommendationsPanel sessionId="test-session" onAddToCart={onAddToCart} />
      );

      const addButtons = screen.getAllByRole('button', { name: /añadir/i });
      fireEvent.click(addButtons[0]);

      expect(onAddToCart).toHaveBeenCalledWith(
        expect.objectContaining({ id: '1', name: 'Pizza Margarita' })
      );
    });

    it('debe llamar refresh al hacer clic en refrescar', () => {
      const refresh = jest.fn();
      mockUseRecommendations.useRecommendations.mockReturnValue({
        ...defaultMockHook,
        refresh,
      });

      render(<RecommendationsPanel sessionId="test-session" />);

      const refreshButton = screen.getByRole('button', { name: /refrescar/i });
      fireEvent.click(refreshButton);

      expect(refresh).toHaveBeenCalled();
    });
  });

  describe('Props opcionales', () => {
    it('debe usar initialPreferences', () => {
      const fetchRecommendations = jest.fn();
      mockUseRecommendations.useRecommendations.mockReturnValue({
        ...defaultMockHook,
        fetchRecommendations,
      });

      render(
        <RecommendationsPanel
          sessionId="test-session"
          initialPreferences={['vegetarian', 'spicy']}
        />
      );

      expect(fetchRecommendations).toHaveBeenCalled();
    });

    it('debe usar allergies', () => {
      render(
        <RecommendationsPanel
          sessionId="test-session"
          allergies={['nuts', 'shellfish']}
        />
      );

      expect(screen.getByText('Recomendaciones para ti')).toBeInTheDocument();
    });

    it('debe aplicar className personalizada', () => {
      const { container } = render(
        <RecommendationsPanel sessionId="test-session" className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('debe mostrar filtros expandidos por defecto si defaultFiltersExpanded es true', () => {
      render(
        <RecommendationsPanel
          sessionId="test-session"
          defaultFiltersExpanded={true}
        />
      );

      expect(screen.getByText(/precio máximo/i)).toBeInTheDocument();
    });
  });

  describe('Manejo de errores', () => {
    it('debe mostrar botón de reintentar cuando hay error', () => {
      mockUseRecommendations.useRecommendations.mockReturnValue({
        ...defaultMockHook,
        error: 'Network error',
        recommendations: [],
      });

      render(<RecommendationsPanel sessionId="test-session" />);

      const retryButton = screen.getByRole('button', { name: /reintentar/i });
      expect(retryButton).toBeInTheDocument();
    });

    it('debe recargar recomendaciones al hacer clic en reintentar', () => {
      const fetchRecommendations = jest.fn();
      mockUseRecommendations.useRecommendations.mockReturnValue({
        ...defaultMockHook,
        error: 'Network error',
        recommendations: [],
        fetchRecommendations,
      });

      render(<RecommendationsPanel sessionId="test-session" />);

      const retryButton = screen.getByRole('button', { name: /reintentar/i });
      fireEvent.click(retryButton);

      expect(fetchRecommendations).toHaveBeenCalled();
    });
  });

  describe('Accesibilidad', () => {
    it('debe tener roles ARIA apropiados', () => {
      render(<RecommendationsPanel sessionId="test-session" />);

      expect(screen.getByRole('region')).toBeInTheDocument();
    });

    it('debe tener labels accesibles en los filtros', () => {
      render(<RecommendationsPanel sessionId="test-session" />);

      const filterButton = screen.getByRole('button', { name: /filtros/i });
      fireEvent.click(filterButton);

      expect(screen.getByLabelText(/precio máximo/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/categoría/i)).toBeInTheDocument();
    });
  });
});
