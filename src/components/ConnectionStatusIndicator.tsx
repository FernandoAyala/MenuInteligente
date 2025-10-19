import { ConnectionStatus } from '../types';

interface ConnectionStatusIndicatorProps {
  status: ConnectionStatus;
}

const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return { color: 'bg-green-500', text: 'Conectado', pulse: false };
      case 'connecting':
        return { color: 'bg-yellow-500', text: 'Conectando...', pulse: true };
      case 'reconnecting':
        return { color: 'bg-orange-500', text: 'Reconectando...', pulse: true };
      case 'disconnected':
        return { color: 'bg-red-500', text: 'Desconectado', pulse: false };
      default:
        return { color: 'bg-gray-500', text: 'Desconocido', pulse: false };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-chat-panel rounded-lg">
      <div 
        className={`w-2 h-2 rounded-full ${config.color} ${config.pulse ? 'animate-pulse' : ''}`}
      />
      <span className="text-sm text-text-secondary">{config.text}</span>
    </div>
  );
};

export default ConnectionStatusIndicator;