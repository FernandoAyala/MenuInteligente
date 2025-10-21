import { Flame, Leaf, ShoppingCart, Wheat } from 'lucide-react';
import { MenuItem } from '../types';

interface DishCardProps {
  menuItem: MenuItem;
  onClick?: (item: MenuItem) => void;
  showAddButton?: boolean;
  onAddToCart?: (item: MenuItem) => void;
  onInterested?: (item: MenuItem) => void;
  onViewAlternatives?: (item: MenuItem) => void;
  className?: string;
  variant?: 'default' | 'chat'; // Para diferentes estilos según contexto
}

const DishCard: React.FC<DishCardProps> = ({ 
  menuItem, 
  onClick, 
  showAddButton = true, 
  onAddToCart,
  onInterested,
  onViewAlternatives,
  className = "",
  variant = 'default'
}) => {
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency === 'ARS' ? 'ARS' : 'USD',
    }).format(price);
  };

  const getSpicyIndicator = (level: number) => {
    if (level === 0) return null;
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: level }, (_, i) => (
          <Flame key={i} className="w-3 h-3 text-red-500" />
        ))}
      </div>
    );
  };

  const handleCardClick = () => {
    onClick?.(menuItem);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart?.(menuItem);
  };

  const handleInterested = (e: React.MouseEvent) => {
    e.stopPropagation();
    onInterested?.(menuItem);
  };

  const handleViewAlternatives = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewAlternatives?.(menuItem);
  };

  return (
    <div 
      className={`bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transition-transform hover:scale-105 flex flex-col min-h-[320px] ${className}`}
      onClick={handleCardClick}
    >
      {/* Imagen del plato */}
      {menuItem.imageUrl && (
        <div className="aspect-video overflow-hidden">
          <img 
            src={menuItem.imageUrl} 
            alt={menuItem.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      {/* Contenido */}
      <div className="p-4 flex flex-col flex-1">
        {/* Header con nombre y precio */}
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 flex-1 pr-2">
            {menuItem.name}
          </h3>
          <span className="font-bold text-accent-green text-sm flex-shrink-0">
            {formatPrice(menuItem.price, menuItem.currency)}
          </span>
        </div>

        {/* Descripción */}
        <p className="text-gray-600 text-xs mb-3 line-clamp-2">
          {menuItem.description}
        </p>

        {/* Indicadores dietarios y picante */}
        <div className="flex items-center gap-2 mb-3">
          {menuItem.isVegan && (
            <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">
              <Leaf className="w-3 h-3" />
              <span>Vegano</span>
            </div>
          )}
          {menuItem.isVegetarian && !menuItem.isVegan && (
            <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">
              <Leaf className="w-3 h-3" />
              <span>Vegetariano</span>
            </div>
          )}
          {menuItem.isGlutenFree && (
            <div className="flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs">
              <Wheat className="w-3 h-3" />
              <span>Sin gluten</span>
            </div>
          )}
          {getSpicyIndicator(menuItem.spicyLevel)}
        </div>

        {/* Alergenos */}
        {menuItem.allergens && menuItem.allergens.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-gray-500">
              Contiene: {menuItem.allergens.join(', ')}
            </p>
          </div>
        )}

        {/* Spacer para empujar botones al fondo */}
        <div className="flex-1"></div>

        {/* Botones de acción según variante */}
        <div className="mt-auto">
          {variant === 'chat' && menuItem.available ? (
            <div className="space-y-2">
              {/* Botones principales para chat */}
              <div className="flex gap-2">
                <button
                  onClick={handleInterested}
                  className="flex-1 bg-accent-blue text-white py-2 px-3 rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors"
                >
                  Me interesa
                </button>
                <button
                  onClick={handleViewAlternatives}
                  className="flex-1 bg-gray-500 text-white py-2 px-3 rounded-lg text-xs font-medium hover:bg-gray-600 transition-colors"
                >
                  Ver alternativas
                </button>
              </div>
              {/* Botón agregar al carrito */}
              {showAddButton && (
                <button
                  onClick={handleAddToCart}
                  className="w-full bg-accent-green text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Añadir al carrito
                </button>
              )}
            </div>
          ) : showAddButton && menuItem.available ? (
            /* Botón estándar para vista normal */
            <button
              onClick={handleAddToCart}
              className="w-full bg-accent-green text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              Agregar al pedido
            </button>
          ) : null}

          {/* Estado no disponible */}
          {!menuItem.available && (
            <div className="w-full bg-gray-200 text-gray-500 py-2 px-4 rounded-lg text-sm font-medium text-center">
              No disponible
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DishCard;