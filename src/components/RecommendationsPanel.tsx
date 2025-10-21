/**
 * Panel de Recomendaciones Personalizadas
 * Muestra recomendaciones del menú basadas en preferencias del usuario
 * @module components/RecommendationsPanel
 */

import React, { useState } from 'react';
import { Sparkles, SlidersHorizontal, X, AlertCircle, RefreshCw } from 'lucide-react';
import { useRecommendations } from '../hooks/useRecommendations';
import { RecommendationFilters, MenuRecommendation } from '../services/api';
import { MenuItem } from '../types';
import FoodCarousel from './FoodCarousel';

interface RecommendationsPanelProps {
  /** ID de sesión del usuario */
  sessionId?: string;
  /** Preferencias iniciales del usuario */
  initialPreferences?: string[];
  /** Alergias del usuario */
  allergies?: string[];
  /** Restricciones dietéticas */
  dietaryRestrictions?: string[];
  /** Callback cuando se hace clic en un item */
  onItemClick?: (item: MenuItem) => void;
  /** Callback cuando se añade al carrito */
  onAddToCart?: (item: MenuItem) => void;
  /** Callback cuando el usuario muestra interés */
  onInterested?: (item: MenuItem) => void;
  /** Callback para ver alternativas */
  onViewAlternatives?: (item: MenuItem) => void;
  /** Mostrar filtros expandidos por defecto */
  defaultFiltersExpanded?: boolean;
  /** Clase CSS adicional */
  className?: string;
}

type CategoryType = 'entrada' | 'plato_principal' | 'postre' | 'bebida' | 'acompañamiento';

/**
 * Panel de recomendaciones con filtros dinámicos
 */
export const RecommendationsPanel: React.FC<RecommendationsPanelProps> = ({
  sessionId,
  initialPreferences = [],
  allergies = [],
  dietaryRestrictions = [],
  onItemClick,
  onAddToCart,
  onInterested,
  onViewAlternatives,
  defaultFiltersExpanded = false,
  className = '',
}) => {
  const [showFilters, setShowFilters] = useState(defaultFiltersExpanded);
  
  // Estados locales para filtros
  const [selectedCategories, setSelectedCategories] = useState<CategoryType[]>([]);
  const [priceMin, setPriceMin] = useState<number | undefined>();
  const [priceMax, setPriceMax] = useState<number | undefined>();
  const [excludeAllergens, setExcludeAllergens] = useState<string[]>(allergies);
  const [availableOnly, setAvailableOnly] = useState(true);
  
  const {
    recommendations,
    isLoading,
    error,
    totalCount,
    currentFilters,
    applyFilters,
    clearFilters,
    refresh,
    rateRecommendation,
  } = useRecommendations({
    autoFetch: true,
    sessionId,
    initialContext: {
      preferences: initialPreferences,
      allergies,
      dietary_restrictions: dietaryRestrictions,
    },
    maxRecommendations: 20,
    minConfidence: 0.6,
    onError: (err) => {
      console.error('Error en recomendaciones:', err);
    },
  });

  /**
   * Convertir MenuRecommendation a MenuItem para el FoodCarousel
   */
  const convertToMenuItem = (rec: MenuRecommendation): MenuItem & { score?: number; reason?: string } => ({
    id: rec.id,
    categoryId: rec.category,
    name: rec.name,
    description: rec.description || '',
    price: rec.price || 0,
    currency: 'USD',
    spicyLevel: 0,
    isVegan: rec.allergens?.includes('vegano') || false,
    isVegetarian: rec.allergens?.includes('vegetariano') || false,
    isGlutenFree: rec.allergens?.includes('sin gluten') || false,
    allergens: rec.allergens || [],
    available: rec.availabilityStatus === 'available',
    imageUrl: rec.image,
    // Campos adicionales de recomendación
    score: rec.score,
    reason: rec.reason,
  });

  const menuItems = recommendations.map(convertToMenuItem);


  /**
   * Construir objeto de filtros desde estado local
   */
  const buildFilters = (): RecommendationFilters => {
    const filters: RecommendationFilters = {
      availableOnly,
    };

    if (selectedCategories.length > 0) {
      filters.categories = selectedCategories;
    }

    if (excludeAllergens.length > 0) {
      filters.excludeAllergens = excludeAllergens;
    }

    if (priceMin !== undefined || priceMax !== undefined) {
      filters.priceRange = {
        min: priceMin,
        max: priceMax,
      };
    }

    return filters;
  };

  /**
   * Aplicar filtros locales
   */
  const handleApplyFilters = () => {
    const filters = buildFilters();
    applyFilters(filters);
    setShowFilters(false);
  };

  /**
   * Limpiar todos los filtros
   */
  const handleClearFilters = () => {
    setSelectedCategories([]);
    setPriceMin(undefined);
    setPriceMax(undefined);
    setExcludeAllergens([]);
    setAvailableOnly(true);
    clearFilters();
  };

  /**
   * Toggle categoría seleccionada
   */
  const toggleCategory = (category: CategoryType) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  /**
   * Callback cuando se añade al carrito
   * También califica la recomendación como aceptada
   */
  const handleAddToCart = (item: MenuItem) => {
    onAddToCart?.(item);
    
    // Calificar como aceptada (rating alto)
    rateRecommendation(item.id, 5, 'Añadido al carrito', true);
  };

  /**
   * Callback cuando el usuario muestra interés
   */
  const handleInterested = (item: MenuItem) => {
    onInterested?.(item);
    
    // Calificar con rating medio-alto
    rateRecommendation(item.id, 4, 'Usuario mostró interés', false);
  };

  return (
    <div className={`recommendations-panel ${className}`}>
      {/* Header con título y controles */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-500" />
          <h2 className="text-xl font-semibold text-gray-800">
            Recomendaciones para ti
          </h2>
          {totalCount > 0 && (
            <span className="text-sm text-gray-500">({totalCount})</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Botón refrescar */}
          <button
            onClick={refresh}
            disabled={isLoading}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            title="Refrescar recomendaciones"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Botón filtros */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${
              showFilters
                ? 'bg-blue-100 text-blue-600'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
            title="Mostrar filtros"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Panel de filtros expandible */}
      {showFilters && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="space-y-4">
            {/* Categorías (checkboxes) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categorías
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  { value: 'entrada' as CategoryType, label: 'Entradas' },
                  { value: 'plato_principal' as CategoryType, label: 'Platos Principales' },
                  { value: 'postre' as CategoryType, label: 'Postres' },
                  { value: 'bebida' as CategoryType, label: 'Bebidas' },
                  { value: 'acompañamiento' as CategoryType, label: 'Acompañamientos' },
                ].map(category => (
                  <label key={category.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category.value)}
                      onChange={() => toggleCategory(category.value)}
                      className="mr-2 rounded text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{category.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Rango de precio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rango de precio (USD)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Mín"
                  value={priceMin ?? ''}
                  onChange={(e) => setPriceMin(e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  placeholder="Máx"
                  value={priceMax ?? ''}
                  onChange={(e) => setPriceMax(e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Excluir alérgenos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Excluir alérgenos
              </label>
              <div className="flex flex-wrap gap-2">
                {['nueces', 'lácteos', 'gluten', 'mariscos', 'soja', 'huevo'].map(allergen => (
                  <label key={allergen} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={excludeAllergens.includes(allergen)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setExcludeAllergens(prev => [...prev, allergen]);
                        } else {
                          setExcludeAllergens(prev => prev.filter(a => a !== allergen));
                        }
                      }}
                      className="mr-2 rounded text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">{allergen}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Solo disponibles */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={availableOnly}
                  onChange={(e) => setAvailableOnly(e.target.checked)}
                  className="mr-2 rounded text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Solo mostrar items disponibles
                </span>
              </label>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Limpiar
            </button>
            <button
              onClick={handleApplyFilters}
              disabled={isLoading}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Aplicar filtros
            </button>
          </div>
        </div>
      )}

      {/* Indicador de filtros activos */}
      {currentFilters && Object.values(currentFilters).some(v => v !== undefined && v !== false && (Array.isArray(v) ? v.length > 0 : true)) && (
        <div className="mb-3 flex items-center gap-2 text-sm text-gray-600">
          <SlidersHorizontal className="w-4 h-4" />
          <span>Filtros activos</span>
          <button
            onClick={handleClearFilters}
            className="ml-2 text-blue-600 hover:text-blue-800 underline"
          >
            Limpiar todos
          </button>
        </div>
      )}

      {/* Estado de carga */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Cargando recomendaciones...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 mb-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Error al cargar recomendaciones</p>
            <p className="text-sm text-red-600 mt-1">{error.message}</p>
          </div>
          <button
            onClick={refresh}
            className="text-sm text-red-600 hover:text-red-800 underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Recomendaciones (FoodCarousel) */}
      {!isLoading && !error && menuItems.length > 0 && (
        <FoodCarousel
          items={menuItems}
          onItemClick={onItemClick}
          onAddToCart={handleAddToCart}
          onInterested={handleInterested}
          onViewAlternatives={onViewAlternatives}
          variant="chat"
        />
      )}

      {/* Estado vacío */}
      {!isLoading && !error && menuItems.length === 0 && (
        <div className="text-center py-12">
          <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            No hay recomendaciones disponibles
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {currentFilters
              ? 'Intenta ajustar los filtros para ver más opciones'
              : 'Comienza a chatear para recibir recomendaciones personalizadas'}
          </p>
          {currentFilters && (
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors"
            >
              <X className="w-4 h-4" />
              Limpiar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default RecommendationsPanel;
