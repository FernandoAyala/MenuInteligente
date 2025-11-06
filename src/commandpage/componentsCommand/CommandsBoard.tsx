import React, { useState } from 'react';
import { useOrders } from '../../hooks/useOrders';
import { OrderStatus } from '../../services/api/ordersService';
import { Command } from '../types/command.types';
import CommandCard from './CommandCard';
import OrderAnalyticsModal from './OrderAnalyticsModal';

const CommandsBoard: React.FC = () => {
  const { orders: commands, loading, error, updateOrderStatus, refreshOrders, connected } = useOrders();
  const [filter, setFilter] = useState<'all' | Command['status']>('all');
  const [sortBy, setSortBy] = useState<'timestamp' | 'table' | 'status'>('timestamp');
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);

  const handleStatusChange = async (commandId: string, newStatus: Command['status']) => {
    try {
      console.log(`� Board: Cambiando estado de ${commandId} a ${newStatus}`);
      await updateOrderStatus(commandId, newStatus as OrderStatus);
      console.log(`✅ Board: Estado actualizado exitosamente`);
    } catch (err) {
      console.error('❌ Board: Error al actualizar estado:', err);
      // El hook ya maneja el refresh en caso de error
    }
  };

  const filteredCommands = commands.filter(command => {
    // Cuando el filtro es "todos", excluir pedidos servidos
    if (filter === 'all') return command.status !== 'served';
    return command.status === filter;
  });

  const sortedCommands = filteredCommands.sort((a, b) => {
    switch (sortBy) {
      case 'timestamp':
        // Ordenar por tiempo de espera: los más antiguos primero (más tiempo de espera)
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      case 'table':
        return a.tableNumber - b.tableNumber;
      case 'status':
        const statusOrder = { 'pending': 0, 'in-progress': 1, 'ready': 2, 'served': 3 };
        return statusOrder[a.status] - statusOrder[b.status];
      default:
        return 0;
    }
  });

  const getStatsForStatus = (status: Command['status']) => {
    return commands.filter(cmd => cmd.status === status).length;
  };

  const handleRefresh = () => {
    refreshOrders();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Panel de Comandas - Cocina</h1>
            <p className="text-gray-600">Gestión en tiempo real de pedidos</p>
          </div>
          
          <div className="flex gap-3 items-center">
            {/* Indicador de conexión WebSocket */}
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow">
              <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium text-gray-700">
                {connected ? 'Conectado' : 'Desconectado'}
              </span>
            </div>

            {/* Botón de Análisis con IA */}
            <button
              onClick={() => setIsAnalyticsModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              📊 Análisis con IA
            </button>

            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '🔄 Cargando...' : '🔄 Actualizar'}
            </button>
          </div>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="text-2xl font-bold text-yellow-600">{getStatsForStatus('pending')}</div>
            <div className="text-sm text-gray-600">Pendientes</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="text-2xl font-bold text-blue-600">{getStatsForStatus('in-progress')}</div>
            <div className="text-sm text-gray-600">En Preparación</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="text-2xl font-bold text-green-600">{getStatsForStatus('ready')}</div>
            <div className="text-sm text-gray-600">Listos</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="text-2xl font-bold text-gray-600">{commands.length}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
        </div>

        {/* Controles de filtro y ordenamiento */}
        <div className="flex flex-wrap gap-6 items-center bg-white rounded-lg p-6 shadow-md">
          <div className="flex items-center space-x-3">
            <label className="text-base font-bold text-gray-800">Filtrar por:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | Command['status'])}
              className="px-5 py-3 border-2 border-gray-400 rounded-lg text-base font-semibold bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer hover:border-indigo-400 transition-colors min-w-[180px]"
            >
              <option value="all">Todos</option>
              <option value="pending">Pendientes</option>
              <option value="in-progress">En Preparación</option>
              <option value="ready">Listos</option>
              <option value="served">Servidos</option>
            </select>
          </div>

          <div className="flex items-center space-x-3">
            <label className="text-base font-bold text-gray-800">Ordenar por:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'timestamp' | 'table' | 'status')}
              className="px-5 py-3 border-2 border-gray-400 rounded-lg text-base font-semibold bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer hover:border-indigo-400 transition-colors min-w-[180px]"
            >
              <option value="timestamp">Hora de Pedido</option>
              <option value="table">Número de Mesa</option>
              <option value="status">Estado</option>
            </select>
          </div>

          <div className="text-base font-medium text-gray-700 bg-gray-100 px-4 py-2 rounded-lg">
            Mostrando <span className="font-bold text-indigo-600">{sortedCommands.length}</span> de <span className="font-bold">{commands.length}</span> comandas
          </div>
        </div>
      </div>

      {/* Lista de comandas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {sortedCommands.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="text-gray-500 text-lg">No hay comandas que coincidan con los filtros seleccionados</div>
          </div>
        ) : (
          sortedCommands.map(command => (
            <CommandCard
              key={command.id}
              command={command}
              onStatusChange={handleStatusChange}
            />
          ))
        )}
      </div>

      {/* Footer con información adicional */}
      <div className="mt-8 text-center text-gray-500 text-sm">
        <p>Sistema de comandas actualizado automáticamente • Última actualización: {new Date().toLocaleTimeString('es-AR')}</p>
      </div>

      {/* Modal de Análisis con IA */}
      <OrderAnalyticsModal 
        isOpen={isAnalyticsModalOpen}
        onClose={() => setIsAnalyticsModalOpen(false)}
      />
    </div>
  );
};

export default CommandsBoard;
