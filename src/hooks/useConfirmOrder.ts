/**
 * Hook para confirmar pedidos desde la sesión de chat
 */

import { useState } from 'react';
import type { Command } from '../commandpage/types/command.types';
import { ordersService } from '../services/api/ordersService';

interface ConfirmOrderParams {
  sessionId: string;
  tableNumber: number;
  customerNotes?: string;
}

interface UseConfirmOrderReturn {
  confirmOrder: (params: ConfirmOrderParams) => Promise<Command | null>;
  confirming: boolean;
  error: string | null;
  confirmedOrder: Command | null;
  clearConfirmedOrder: () => void;
}

/**
 * Hook para confirmar pedidos desde el chat
 */
export const useConfirmOrder = (): UseConfirmOrderReturn => {
  const [confirming, setConfirming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<Command | null>(null);

  const confirmOrder = async (params: ConfirmOrderParams): Promise<Command | null> => {
    try {
      setConfirming(true);
      setError(null);
      
      const order = await ordersService.confirmOrder(
        params.sessionId,
        params.tableNumber,
        params.customerNotes
      );
      
      setConfirmedOrder(order);
      console.log('✅ Pedido confirmado:', order);
      
      return order;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al confirmar el pedido';
      setError(errorMessage);
      console.error('Error confirmando pedido:', err);
      return null;
    } finally {
      setConfirming(false);
    }
  };

  const clearConfirmedOrder = () => {
    setConfirmedOrder(null);
    setError(null);
  };

  return {
    confirmOrder,
    confirming,
    error,
    confirmedOrder,
    clearConfirmedOrder,
  };
};

export default useConfirmOrder;
