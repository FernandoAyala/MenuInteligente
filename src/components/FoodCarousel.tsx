import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef, useState } from 'react';
import { MenuItem } from '../types';
import DishCard from './DishCard';
import RecommendedDishCard, { RecommendedMenuItem } from './RecommendedDishCard';

interface FoodCarouselProps {
  items: MenuItem[];
  onItemClick?: (item: MenuItem) => void;
  onAddToCart?: (item: MenuItem) => void;
  onInterested?: (item: MenuItem) => void;
  onViewAlternatives?: (item: MenuItem) => void;
  title?: string;
  className?: string;
  variant?: 'default' | 'chat';
}

/**
 * Verifica si un item tiene información de recomendación
 */
const isRecommendedItem = (item: MenuItem): item is RecommendedMenuItem => {
  return 'score' in item && typeof (item as any).score === 'number';
};

interface FoodCarouselProps {
  items: MenuItem[];
  onItemClick?: (item: MenuItem) => void;
  onAddToCart?: (item: MenuItem) => void;
  onInterested?: (item: MenuItem) => void;
  onViewAlternatives?: (item: MenuItem) => void;
  title?: string;
  className?: string;
  variant?: 'default' | 'chat';
}

const FoodCarousel: React.FC<FoodCarouselProps> = ({
  items,
  onItemClick,
  onAddToCart,
  onInterested,
  onViewAlternatives,
  title = "Recomendaciones",
  className = "",
  variant = 'default'
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  // const itemsPerView = 1.5; // Mostrar 1.5 items por vista para que se vean completos
  const maxIndex = Math.max(0, items.length - 1); // Permitir navegar hasta el último item

  const scrollToIndex = (index: number) => {
    if (carouselRef.current) {
      const itemWidth = carouselRef.current.scrollWidth / items.length;
      carouselRef.current.scrollTo({
        left: index * itemWidth,
        behavior: 'smooth'
      });
    }
    setCurrentIndex(index);
  };

  const handlePrevious = () => {
    const newIndex = Math.max(0, currentIndex - 1);
    scrollToIndex(newIndex);
  };

  const handleNext = () => {
    const newIndex = Math.min(maxIndex, currentIndex + 1);
    scrollToIndex(newIndex);
  };

  if (!items || items.length === 0) {
    return null;
  }

  // Debug: verificar que todos los items tengan ID único
  const hasValidIds = items.every(item => item && item.id);
  if (!hasValidIds) {
    console.warn('FoodCarousel: Some items are missing IDs', items);
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Título y controles */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        
        {items.length > 1 && (
          <div className="flex gap-2">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className={`p-2 rounded-full transition-colors ${
                currentIndex === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <button
              onClick={handleNext}
              disabled={currentIndex >= maxIndex}
              className={`p-2 rounded-full transition-colors ${
                currentIndex >= maxIndex
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Carrusel */}
      <div 
        ref={carouselRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 pr-6"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((item) => {
          const isRecommended = isRecommendedItem(item);
          
          return (
            <div
              key={item.id}
              className="flex-shrink-0 w-64 sm:w-72"
            >
              {isRecommended ? (
                <RecommendedDishCard
                  menuItem={item}
                  onClick={onItemClick}
                  onAddToCart={onAddToCart}
                  onInterested={onInterested}
                  onViewAlternatives={onViewAlternatives}
                  variant={variant}
                  className="h-full"
                />
              ) : (
                <DishCard
                  menuItem={item}
                  onClick={onItemClick}
                  onAddToCart={onAddToCart}
                  onInterested={onInterested}
                  onViewAlternatives={onViewAlternatives}
                  variant={variant}
                  className="h-full"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Indicadores de posición */}
      {items.length > 1 && (
        <div className="flex justify-center gap-1 mt-3">
          {Array.from({ length: maxIndex + 1 }, (_, index) => (
            <button
              key={index}
              onClick={() => scrollToIndex(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                currentIndex === index
                  ? 'bg-accent-green'
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FoodCarousel;