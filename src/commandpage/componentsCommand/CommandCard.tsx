import React from 'react';
import { Command } from '../types/command.types';

interface CommandCardProps {
  command: Command;
  onStatusChange: (commandId: string, newStatus: Command['status']) => void;
}

const CommandCard: React.FC<CommandCardProps> = ({ command, onStatusChange }) => {
  const getStatusColor = (status: Command['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 border-yellow-400 text-yellow-800';
      case 'in-progress':
        return 'bg-blue-100 border-blue-400 text-blue-800';
      case 'ready':
        return 'bg-green-100 border-green-400 text-green-800';
      case 'served':
        return 'bg-gray-100 border-gray-400 text-gray-800';
      default:
        return 'bg-gray-100 border-gray-400 text-gray-800';
    }
  };

  const getStatusText = (status: Command['status']) => {
    switch (status) {
      case 'pending':
        return 'PENDIENTE';
      case 'in-progress':
        return 'EN PREPARACIÓN';
      case 'ready':
        return 'LISTO';
      case 'served':
        return 'SERVIDO';
      default:
        return 'DESCONOCIDO';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-AR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getTimeDifference = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Hace menos de 1 min';
    if (diffMins === 1) return 'Hace 1 min';
    return `Hace ${diffMins} mins`;
  };

  const handleStatusChange = (newStatus: Command['status']) => {
    onStatusChange(command.id, newStatus);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200 p-6 mb-4 hover:shadow-xl transition-shadow duration-200">
      {/* Header de la tarjeta */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg">
            {command.tableNumber}
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">Mesa {command.tableNumber}</h3>
            <p className="text-sm text-gray-500">
              {formatTime(command.timestamp)} • {getTimeDifference(command.timestamp)}
            </p>
          </div>
        </div>
        
        <div className={`px-3 py-1 rounded-full border-2 font-semibold text-sm ${getStatusColor(command.status)}`}>
          {getStatusText(command.status)}
        </div>
      </div>

      {/* Lista de platos */}
      <div className="mb-4">
        <h4 className="font-semibold text-gray-700 mb-3">Platos:</h4>
        <div className="space-y-3">
          {command.dishes.map((dish) => (
            <div key={dish.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-gray-800">
                  {dish.quantity}x {dish.name}
                </span>
                <span className="text-gray-600 font-medium">
                  ${dish.price * dish.quantity}
                </span>
              </div>
              
              {/* Especificaciones en rojo para resaltar */}
              {dish.specifications && dish.specifications.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-600 mb-1">Especificaciones:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {dish.specifications.map((spec, index) => (
                      <li key={index} className="text-red-600 font-medium text-sm">
                        {spec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Notas del cliente */}
      {command.customerNotes && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <h5 className="font-semibold text-amber-800 mb-1">Notas especiales:</h5>
          <p className="text-red-600 font-medium text-sm">{command.customerNotes}</p>
        </div>
      )}

      {/* Footer con información adicional */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">
            Total: <span className="font-bold">${command.totalAmount}</span>
          </span>
          {command.estimatedTime && command.estimatedTime > 0 && (
            <span className="text-sm text-gray-600">
              Tiempo estimado: <span className="font-bold">{command.estimatedTime} min</span>
            </span>
          )}
        </div>

        {/* Botones de cambio de estado */}
        <div className="flex space-x-2">
          {command.status === 'pending' && (
            <button
              onClick={() => handleStatusChange('in-progress')}
              className="px-6 py-3 bg-blue-600 text-white rounded-md text-base font-semibold hover:bg-blue-700 transition-colors"
            >
              Iniciar
            </button>
          )}
          
          {command.status === 'in-progress' && (
            <button
              onClick={() => handleStatusChange('ready')}
              className="px-6 py-3 bg-green-600 text-white rounded-md text-base font-semibold hover:bg-green-700 transition-colors"
            >
              Listo
            </button>
          )}
          
          {command.status === 'ready' && (
            <button
              onClick={() => handleStatusChange('served')}
              className="px-6 py-3 bg-gray-600 text-white rounded-md text-base font-semibold hover:bg-gray-700 transition-colors"
            >
              Servido
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandCard;
