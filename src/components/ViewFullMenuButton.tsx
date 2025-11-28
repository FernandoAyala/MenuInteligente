/**
 * Botón para abrir el modal del menú completo
 * Se muestra cuando el usuario pide ver el menú
 */

import React from 'react';
import { ChatAction } from '../types';

interface ViewFullMenuButtonProps {
  action: ChatAction;
  onClick: (action: ChatAction) => void;
}

export const ViewFullMenuButton: React.FC<ViewFullMenuButtonProps> = ({ action, onClick }) => {
  return (
    <button
      onClick={() => onClick(action)}
      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md w-full"
    >
      📋 {action.label || 'Ver Menú Completo'}
    </button>
  );
};

export default ViewFullMenuButton;
