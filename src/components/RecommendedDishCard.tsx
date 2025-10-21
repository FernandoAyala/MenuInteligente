/**
 * Tarjeta de plato recomendado con score y explicación
 * Extiende DishCard para mostrar información de recomendación
 * @module components/RecommendedDishCard
 */

import React, { useState } from 'react';
import { Star, Info, ChevronDown, ChevronUp } from 'lucide-react';
import DishCard from './DishCard';
import { MenuItem } from '../types';

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
}) => {
  const [showReason, setShowReason] = useState(defaultExpanded);

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
    if (score >= 0.9) return 'Altamente recomendado';
    if (score >= 0.8) return 'Muy recomendado';
    if (score >= 0.7) return 'Recomendado';
    if (score >= 0.6) return 'Buena opción';
    return 'Opción disponible';
  };

  const starRating = getStarRating(menuItem.score);
  const scorePercentage = Math.round(menuItem.score * 100);

  return (
    <div className={`relative ${className}`}>
      {/* Badge de confianza (superpuesto en esquina superior derecha) */}
      <div className="absolute top-2 right-2 z-10">
        <div
          className={`px-2 py-1 rounded-full text-xs font-semibold border ${getScoreColor(
            menuItem.score
          )} shadow-sm flex items-center gap-1`}
        >
          <Star className="w-3 h-3 fill-current" />
          <span>{scorePercentage}%</span>
        </div>
      </div>

      {/* Tarjeta base (DishCard) */}
      <DishCard
        menuItem={menuItem}
        onClick={onClick}
        showAddButton={showAddButton}
        onAddToCart={onAddToCart}
        onInterested={onInterested}
        onViewAlternatives={onViewAlternatives}
        variant={variant}
        className="pb-0"
      />

      {/* Sección de explicación (dentro de la tarjeta) */}
      {menuItem.reason && (
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
                  {getScoreLabel(menuItem.score)}
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
