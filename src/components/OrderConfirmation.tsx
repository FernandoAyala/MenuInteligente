/**
 * Componente para confirmar pedidos desde el chat
 */

import React, { useState } from 'react';
import { useConfirmOrder } from '../hooks/useConfirmOrder';

interface OrderConfirmationProps {
  sessionId: string;
  onOrderConfirmed?: (orderId: string) => void;
  onCancel?: () => void;
}

/**
 * Componente de confirmación de pedido
 */
export const OrderConfirmation: React.FC<OrderConfirmationProps> = ({
  sessionId,
  onOrderConfirmed,
  onCancel,
}) => {
  const [tableNumber, setTableNumber] = useState<string>('');
  const [customerNotes, setCustomerNotes] = useState<string>('');
  const { confirmOrder, confirming, error, confirmedOrder, clearConfirmedOrder } = useConfirmOrder();

  const handleConfirm = async () => {
    if (!tableNumber || parseInt(tableNumber) < 1) {
      alert('Por favor ingresa un número de mesa válido');
      return;
    }

    const order = await confirmOrder({
      sessionId,
      tableNumber: parseInt(tableNumber),
      customerNotes: customerNotes || undefined,
    });

    if (order && onOrderConfirmed) {
      onOrderConfirmed(order.id);
    }
  };

  const handleClose = () => {
    clearConfirmedOrder();
    setTableNumber('');
    setCustomerNotes('');
    if (onCancel) {
      onCancel();
    }
  };

  if (confirmedOrder) {
    return (
      <div className="bg-green-50 border border-green-300 rounded-lg p-6 mb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-green-800 mb-2">
              ✅ ¡Pedido Confirmado!
            </h3>
            <p className="text-green-700 mb-3">
              Tu pedido ha sido enviado a la cocina.
            </p>
            <div className="bg-white rounded p-3 text-sm">
              <p className="mb-1">
                <strong>Número de orden:</strong> #{confirmedOrder.id.slice(0, 8)}
              </p>
              <p className="mb-1">
                <strong>Mesa:</strong> {confirmedOrder.tableNumber}
              </p>
              <p className="mb-1">
                <strong>Total:</strong> ${confirmedOrder.totalAmount}
              </p>
              {confirmedOrder.estimatedTime && (
                <p className="mb-1">
                  <strong>Tiempo estimado:</strong> {confirmedOrder.estimatedTime} minutos
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="ml-4 text-gray-500 hover:text-gray-700"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-300 rounded-lg p-6 mb-4">
      <h3 className="text-lg font-bold text-blue-800 mb-4">
        📋 Confirmar Pedido
      </h3>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="tableNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Número de Mesa *
          </label>
          <input
            id="tableNumber"
            type="number"
            min="1"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            placeholder="Ej: 7"
            disabled={confirming}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div>
          <label htmlFor="customerNotes" className="block text-sm font-medium text-gray-700 mb-1">
            Notas adicionales (opcional)
          </label>
          <textarea
            id="customerNotes"
            value={customerNotes}
            onChange={(e) => setCustomerNotes(e.target.value)}
            placeholder="Ej: Mesa cerca de la ventana, celebrando cumpleaños..."
            disabled={confirming}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleConfirm}
            disabled={confirming || !tableNumber}
            className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {confirming ? 'Confirmando...' : 'Confirmar Pedido'}
          </button>

          {onCancel && (
            <button
              onClick={handleClose}
              disabled={confirming}
              className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-600">
        * Al confirmar, tu pedido será enviado directamente a la cocina.
      </p>
    </div>
  );
};

export default OrderConfirmation;
