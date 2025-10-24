/**
 * Panel lateral para mostrar el carrito de compras
 */

import { Receipt, ShoppingCart, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MenuItem } from '../types';

interface CartItem {
  menuItemId: string;
  quantity: number;
  specialInstructions?: string;
  confirmed?: boolean; // true = ya pedido (mostrar en gris)
  orderId?: string;
  confirmedAt?: Date;
  menuItem?: MenuItem; // Datos completos del menú
}

interface CartPanelProps {
  sessionId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmOrder?: (cartItems: CartItem[]) => void;
  onRemoveItem?: (menuItemId: string, itemName: string) => void; // Nueva prop para eliminar
  onRequestBill?: () => void; // Nueva prop para solicitar cuenta
  updateTrigger?: number; // Trigger para forzar recarga del carrito
}

export const CartPanel: React.FC<CartPanelProps> = ({
  sessionId,
  isOpen,
  onClose,
  onConfirmOrder,
  onRemoveItem,
  onRequestBill,
  updateTrigger = 0,
}) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos del carrito desde la sesión
  useEffect(() => {
    console.log('🔍 CartPanel useEffect - sessionId:', sessionId, 'isOpen:', isOpen, 'updateTrigger:', updateTrigger);
    
    if (!sessionId || !isOpen) {
      console.log('⚠️ No se carga el carrito - sessionId o isOpen es falsy');
      return;
    }

    const loadCartFromSession = async () => {
      try {
        setLoading(true);
        setError(null);

        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        console.log('📡 Cargando desde:', `${API_URL}/api/sessions/${sessionId}`);
        
        // Cargar sesión
        const sessionResponse = await fetch(`${API_URL}/api/sessions/${sessionId}`);
        console.log('📥 Respuesta del servidor:', sessionResponse.status, sessionResponse.statusText);
        
        if (!sessionResponse.ok) {
          throw new Error(`No se pudo cargar la sesión: ${sessionResponse.status}`);
        }
        
        const sessionData = await sessionResponse.json();
        console.log('📦 Datos de la sesión:', sessionData);
        
        const cart = sessionData.data?.cart || [];
        
        console.log('🛒 Carrito cargado:', cart);

        if (cart.length === 0) {
          setCartItems([]);
          return;
        }

        // Cargar información completa de los items del menú
        const menuItemIds = cart.map((item: CartItem) => item.menuItemId);
        const menuPromises = menuItemIds.map((id: string) =>
          fetch(`${API_URL}/api/menu-items/${id}`).then(r => r.json())
        );

        const menuResponses = await Promise.all(menuPromises);
        const loadedMenuItems = menuResponses
          .filter(r => r.success)
          .map(r => r.data);

        // Combinar carrito con datos del menú
        const enrichedCart = cart.map((cartItem: CartItem) => ({
          ...cartItem,
          menuItem: loadedMenuItems.find((m: MenuItem) => m.id === cartItem.menuItemId),
        }));

        setCartItems(enrichedCart);
        console.log('✅ Carrito enriquecido:', enrichedCart);

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Error al cargar el carrito';
        setError(errorMsg);
        console.error('❌ Error cargando carrito:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCartFromSession();
  }, [sessionId, isOpen, updateTrigger]); // Recargar cuando cambie updateTrigger

  // Calcular total
  const total = cartItems.reduce((sum, item) => {
    const price = item.menuItem?.price || 0;
    return sum + (price * item.quantity);
  }, 0);

  // Separar items pendientes y confirmados
  const pendingItems = cartItems.filter(item => !item.confirmed);
  const confirmedItems = cartItems.filter(item => item.confirmed);

  // Calcular total solo de items pendientes
  const pendingTotal = pendingItems.reduce((sum, item) => {
    const price = item.menuItem?.price || 0;
    return sum + (price * item.quantity);
  }, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-bold text-gray-800">Mi Carrito</h2>
            {sessionId && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {sessionId.substring(0, 8)}...
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* {!sessionId && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
              <p className="font-semibold">⚠️ No hay sesión activa</p>
              <p className="text-sm mt-2">
                Para ver el carrito, abre la URL con un sessionId:
              </p>
              <code className="text-xs bg-white px-2 py-1 rounded mt-2 block">
                ?sessionId=tu-session-id
              </code>
            </div>
          )}*/}

          {loading && sessionId && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando carrito...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              <p className="font-semibold">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && cartItems.length === 0 && (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Tu carrito está vacío</p>
              <p className="text-gray-400 text-sm mt-2">
                Agrega platos desde el chat para comenzar tu pedido
              </p>
            </div>
          )}

          {!loading && !error && cartItems.length > 0 && (
            <div className="space-y-4">
              {/* Items pendientes (nuevos) */}
              {pendingItems.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    Por confirmar ({pendingItems.length})
                  </h3>
                  {pendingItems.map((item, index) => (
                    <div
                      key={`${item.menuItemId}-${index}`}
                      className="bg-white rounded-lg p-4 border-2 border-green-200 mb-2 shadow-sm"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800">
                            {item.menuItem?.name || 'Cargando...'}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Cantidad: {item.quantity}
                          </p>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="text-right">
                            <p className="font-bold text-green-600">
                              ${(item.menuItem?.price || 0) * item.quantity}
                            </p>
                            <p className="text-xs text-gray-500">
                              ${item.menuItem?.price || 0} c/u
                            </p>
                          </div>
                          {/* Botón eliminar */}
                          {onRemoveItem && (
                            <button
                              onClick={() => onRemoveItem(item.menuItemId, item.menuItem?.name || 'item')}
                              className="p-1.5 hover:bg-red-50 text-red-500 hover:text-red-700 rounded transition-colors"
                              title="Eliminar del carrito"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {item.specialInstructions && (
                        <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded p-2">
                          <p className="text-xs font-medium text-yellow-800">
                            Instrucciones especiales:
                          </p>
                          <p className="text-sm text-yellow-700">
                            {item.specialInstructions}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Items confirmados (historial en gris) */}
              {confirmedItems.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-2">
                    ✅ Ya pedido ({confirmedItems.length})
                  </h3>
                  {confirmedItems.map((item, index) => (
                    <div
                      key={`${item.menuItemId}-confirmed-${index}`}
                      className="bg-gray-100 rounded-lg p-4 border border-gray-300 mb-2 opacity-70"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-600">
                            {item.menuItem?.name || 'Cargando...'}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Cantidad: {item.quantity}
                          </p>
                          {item.orderId && (
                            <p className="text-xs text-gray-400 mt-1">
                              Pedido #{item.orderId.substring(0, 8)}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-500">
                            ${(item.menuItem?.price || 0) * item.quantity}
                          </p>
                          <p className="text-xs text-gray-400">
                            ${item.menuItem?.price || 0} c/u
                          </p>
                        </div>
                      </div>

                      {item.specialInstructions && (
                        <div className="mt-2 bg-gray-200 border border-gray-300 rounded p-2">
                          <p className="text-xs font-medium text-gray-600">
                            Instrucciones especiales:
                          </p>
                          <p className="text-sm text-gray-600">
                            {item.specialInstructions}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer con total y acciones */}
        {!loading && !error && cartItems.length > 0 && (
          <div className="border-t p-4 space-y-4">
            {/* Total de items confirmados (historial) */}
            {confirmedItems.length > 0 && (
              <div className="flex justify-between items-center text-gray-600 text-sm">
                <span>Total ya pedido:</span>
                <span className="font-semibold">${(total - pendingTotal).toLocaleString()}</span>
              </div>
            )}

            {/* Total de items pendientes */}
            {pendingItems.length > 0 && (
              <div className="flex justify-between items-center text-gray-700">
                <span className="text-base font-semibold">
                  {confirmedItems.length > 0 ? 'Por confirmar:' : 'Total:'}
                </span>
                <span className="text-lg font-bold text-green-600">${pendingTotal.toLocaleString()}</span>
              </div>
            )}

            {/* TOTAL GENERAL (suma de todo) */}
            {confirmedItems.length > 0 && (
              <div className="flex justify-between items-center border-t-2 border-gray-300 pt-3">
                <span className="text-lg font-bold text-gray-800">Total general:</span>
                <span className="text-2xl font-bold text-blue-600">${total.toLocaleString()}</span>
              </div>
            )}

            {/* Botón de confirmar solo si hay items pendientes */}
            {pendingItems.length > 0 && (
              <div className="space-y-2">
                <button
                  onClick={() => onConfirmOrder && onConfirmOrder(pendingItems)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Confirmar Pedido ({pendingItems.length} {pendingItems.length === 1 ? 'item' : 'items'})
                </button>
                {/* Botón solicitar cuenta */}
                {confirmedItems.length > 0 && onRequestBill && (
                  <button
                    onClick={onRequestBill}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Receipt className="w-5 h-5" />
                    Solicitar Cuenta
                  </button>
                )}
              </div>
            )}

            {/* Mensaje si solo hay items confirmados */}
            {pendingItems.length === 0 && confirmedItems.length > 0 && (
              <div className="space-y-2">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <p className="text-green-800 font-medium">✅ Todos los items están confirmados</p>
                  <p className="text-green-600 text-sm mt-1">Agrega más productos para continuar</p>
                </div>
                {/* Botón solicitar cuenta cuando solo hay confirmados */}
                {onRequestBill && (
                  <button
                    onClick={onRequestBill}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Receipt className="w-5 h-5" />
                    Solicitar Cuenta
                  </button>
                )}
              </div>
            )}

            <p className="text-xs text-gray-500 text-center">
              Session ID: {sessionId?.substring(0, 8)}...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPanel;
