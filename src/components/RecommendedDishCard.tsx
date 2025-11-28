/**
 * Tarjeta de plato recomendado con score y explicación
 * Extiende DishCard para mostrar información de recomendación
 * @module components/RecommendedDishCard
 */

import { ChevronDown, ChevronUp, Info, Star } from 'lucide-react';
import React, { useState } from 'react';
import { MenuItem } from '../types';
import DishCard from './DishCard';

/**
 * MenuItem extendido con información de recomendación
 */
export interface RecommendedMenuItem extends MenuItem {
  /** Score de confianza de la recomendación (0-1) */
  score: number;
  /** Razón por la cual se recomienda este plato */
  reason?: string;
}

interface RecommendedDishCardProps {
  menuItem: RecommendedMenuItem;
  onClick?: (item: MenuItem) => void;
  showAddButton?: boolean;
  onAddToCart?: (item: MenuItem) => void;
  onInterested?: (item: MenuItem) => void;
  onViewAlternatives?: (item: MenuItem) => void;
  className?: string;
  variant?: 'default' | 'chat';
  /** Mostrar score expandido por defecto */
  defaultExpanded?: boolean;
  /** Solo mostrar confirmación (sin botones interactivos ni texto de recomendación) */
  confirmationOnly?: boolean;
}

/**
 * Componente RecommendedDishCard
 * 
 * Extiende DishCard con un badge de confianza y sección expandible
 * para mostrar por qué se recomienda el plato.
 */
const RecommendedDishCard: React.FC<RecommendedDishCardProps> = ({
  menuItem,
  onClick,
  showAddButton = true,
  onAddToCart,
  onInterested,
  onViewAlternatives,
  className = '',
  variant = 'default',
  defaultExpanded = false,
  confirmationOnly = false,
}) => {
  const [showReason, setShowReason] = useState(defaultExpanded);

  // Normalizar score: si ya está en formato 0-100, dividir por 100; si está en 0-1, usar directamente
  const normalizedScore = menuItem.score > 1 ? menuItem.score / 100 : menuItem.score;

  /**
   * Convertir score (0-1) a estrellas (0-5)
   */
  const getStarRating = (score: number): number => {
    return Math.round(score * 5);
  };

  /**
   * Obtener color del badge según score
   */
  const getScoreColor = (score: number): string => {
    if (score >= 0.8) return 'bg-green-100 text-green-800 border-green-300';
    if (score >= 0.6) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-orange-100 text-orange-800 border-orange-300';
  };

  /**
   * Obtener texto descriptivo del score
   */
  const getScoreLabel = (score: number): string => {
    console.log('Normalized Score:', score);
    if (score >= 0.9) return 'Altamente recomendado';
    if (score >= 0.8) return 'Muy recomendado';
    if (score >= 0.7) return 'Recomendado';
    if (score >= 0.6) return 'Buena opción';
    return 'Opción disponible';
  };

  const starRating = getStarRating(normalizedScore);
  const scorePercentage = Math.round(normalizedScore * 100);
  const calculatedPercentage = Math.abs(scorePercentage - 100);
  const displayPercentage = calculatedPercentage === 0 ? 100 : calculatedPercentage;

  const handleClick = () => {
    if (onClick) {
      onClick(menuItem);
    }
  };

  return (
    <div 
      className={`relative ${className} overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
      onClick={handleClick}
    >
      {/* Badge de confianza en la parte superior */}
      {!confirmationOnly && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 px-3 py-2 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`px-2 py-1 rounded-full text-xs font-semibold border ${getScoreColor(
                  normalizedScore
                )} flex items-center gap-1`}
              >
                <Star className="w-3 h-3 fill-current" />
                <span>{displayPercentage}%</span>
              </div>
              <span className="text-xs text-gray-700 font-medium">{getScoreLabel(normalizedScore)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tarjeta base (DishCard) - sin el wrapper clickeable */}
      <div className="relative">
        <DishCard
          menuItem={menuItem}
          onClick={undefined}
          showAddButton={confirmationOnly ? false : showAddButton}
          onAddToCart={confirmationOnly ? undefined : onAddToCart}
          onInterested={confirmationOnly ? undefined : onInterested}
          onViewAlternatives={confirmationOnly ? undefined : onViewAlternatives}
          variant={variant}
          className="pb-0 rounded-none border-0 shadow-none hover:shadow-none"
        />
      </div>

      {/* Sección de explicación (dentro de la tarjeta) */}
      {!confirmationOnly && menuItem.reason && (
        <div className="bg-white border-t border-gray-200">
          {/* Header colapsable */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowReason(!showReason);
            }}
            className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Info className="w-4 h-4 text-blue-600" />
              <span className="font-medium">¿Por qué esta recomendación?</span>
            </div>
            {showReason ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {/* Contenido expandible */}
          {showReason && (
            <div className="px-4 pb-3 text-sm text-gray-600 animate-fadeIn">
              {/* Estrellas visuales */}
              <div className="flex items-center gap-1 mb-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < starRating
                        ? 'text-yellow-500 fill-yellow-500'
                        : 'text-gray-300 fill-gray-300'
                    }`}
                  />
                ))}
                <span className="ml-2 text-xs text-gray-500">
                  {getScoreLabel(normalizedScore)}
                </span>
              </div>

              {/* Razón de la recomendación */}
              <p className="text-sm leading-relaxed">{menuItem.reason}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecommendedDishCard;
