/**
 * Modal para mostrar el menú completo del restaurante
 * Se abre cuando el usuario hace clic en "Ver Menú Completo"
 */

import { X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { MenuItem } from '../types';
import DishCard from './DishCard';

// Mapeo de categorías a colores de fondo
const CATEGORY_COLORS: Record<string, string> = {
  'entrada': 'bg-orange-50',
  'principal': 'bg-green-50',
  'postre': 'bg-pink-50',
  'bebida': 'bg-blue-50',
  'acompañamiento': 'bg-yellow-50',
};

// Nombres amigables de categorías
const CATEGORY_NAMES: Record<string, string> = {
  'entrada': '🥗 Entradas',
  'principal': '🍽️ Platos Principales',
  'postre': '🍰 Postres',
  'bebida': '🥤 Bebidas',
  'acompañamiento': '🍟 Acompañamientos',
};

interface FullMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToCart?: (item: MenuItem) => void;
  onItemInterested?: (item: MenuItem) => void;
}

export const FullMenuModal: React.FC<FullMenuModalProps> = ({
  isOpen,
  onClose,
  onAddToCart,
  onItemInterested,
}) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handlers que cierran el modal después de ejecutar la acción
  const handleAddToCart = (item: MenuItem) => {
    onAddToCart?.(item);
    onClose();
  };

  const handleItemInterested = (item: MenuItem) => {
    onItemInterested?.(item);
    onClose();
  };

  // Agrupar items por categoría
  const itemsByCategory = useMemo(() => {
    const grouped: Record<string, MenuItem[]> = {};
    
    menuItems.forEach((item) => {
      const category = (item as any).category || 'principal';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });
    
    return grouped;
  }, [menuItems]);

  // Ordenar categorías en el orden deseado
  const categoryOrder = ['entrada', 'principal', 'acompañamiento', 'postre', 'bebida'];
  const sortedCategories = useMemo(() => {
    return categoryOrder.filter(cat => itemsByCategory[cat] && itemsByCategory[cat].length > 0);
  }, [itemsByCategory]);

  // Cargar menú completo cuando se abre el modal
  useEffect(() => {
    if (!isOpen) return;

    const loadFullMenu = async () => {
      try {
        setLoading(true);
        setError(null);

        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${API_URL}/api/menu-items?available=true`);

        if (!response.ok) {
          throw new Error('Error al cargar el menú');
        }

        const data = await response.json();
        const items = data.data || data;
        setMenuItems(items);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Error al cargar el menú';
        setError(errorMsg);
        console.error('❌ Error cargando menú completo:', err);
      } finally {
        setLoading(false);
      }
    };

    loadFullMenu();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-chat-bg rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-text-primary">🍽️ Menú Completo</h2>
            <p className="text-sm text-text-secondary mt-1">
              Explora todas nuestras deliciosas opciones
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-chat-panel rounded-full transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-6 h-6 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-chat-bg">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-green mb-4"></div>
              <p className="text-text-secondary">Cargando menú...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              <p className="font-semibold">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && menuItems.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No hay platos disponibles en este momento</p>
            </div>
          )}

          {!loading && !error && menuItems.length > 0 && (
            <div className="space-y-8">
              <div className="text-center mb-6">
                <p className="text-text-primary font-medium">
                  {menuItems.length} {menuItems.length === 1 ? 'plato disponible' : 'platos disponibles'}
                </p>
              </div>

              {/* Secciones por categoría */}
              {sortedCategories.map((category) => (
                <div key={category} className={`rounded-lg p-6 ${CATEGORY_COLORS[category] || 'bg-chat-panel'}`}>
                  {/* Título de la categoría */}
                  <h3 className="text-xl font-bold text-gray-800 mb-4 border-b-2 border-gray-300 pb-2">
                    {CATEGORY_NAMES[category] || category}
                  </h3>

                  {/* Grid de tarjetas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {itemsByCategory[category].map((item) => (
                      <DishCard
                        key={item.id}
                        menuItem={item}
                        variant="chat"
                        onAddToCart={handleAddToCart}
                        onInterested={handleItemInterested}
                        showAddButton={true}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-4 bg-chat-panel">
          <button
            onClick={onClose}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default FullMenuModal;
