import React, { useEffect, useState } from 'react';
import { generateRandomCommand, mockCommands } from '../mocks/commandMocks';
import { Command } from '../types/command.types';
import CommandCard from './CommandCard';

const CommandsBoard: React.FC = () => {
  const [commands, setCommands] = useState<Command[]>(mockCommands);
  const [filter, setFilter] = useState<'all' | Command['status']>('all');
  const [sortBy, setSortBy] = useState<'timestamp' | 'table' | 'status'>('timestamp');

  // Simulación de actualización en tiempo real (cada 30 segundos)
  useEffect(() => {
    const interval = setInterval(() => {
      // Ocasionalmente agregar una nueva comanda
      if (Math.random() < 0.3) {
        const newCommand = generateRandomCommand();
        setCommands(prev => [newCommand, ...prev]);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = (commandId: string, newStatus: Command['status']) => {
    setCommands(prevCommands =>
      prevCommands.map(command =>
        command.id === commandId
          ? { ...command, status: newStatus }
          : command
      )
    );
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

  const addTestCommand = () => {
    const newCommand = generateRandomCommand();
    setCommands(prev => [newCommand, ...prev]);
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
          
          <button
            onClick={addTestCommand}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            + Agregar Comanda de Prueba
          </button>
        </div>

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
    </div>
  );
};

export default CommandsBoard;
