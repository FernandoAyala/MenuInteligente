/**
 * Botón de confirmar pedido
 * Se muestra cuando el usuario solicita confirmar su pedido por chat
 */

import React from 'react';
import { ChatAction } from '../types';

interface ConfirmOrderButtonProps {
  action: ChatAction;
  onClick: (action: ChatAction) => void;
}

export const ConfirmOrderButton: React.FC<ConfirmOrderButtonProps> = ({ action, onClick }) => {
  return (
    <button
      onClick={() => onClick(action)}
      className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md w-full"
    >
      🛒 {action.label || 'Confirmar Pedido'}
    </button>
  );
};

export default ConfirmOrderButton;
