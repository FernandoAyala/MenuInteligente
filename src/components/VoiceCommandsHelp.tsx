import { HelpCircle, X } from 'lucide-react';
import { useState } from 'react';
import { useVoiceCommands } from '../hooks/useVoiceCommands';

interface VoiceCommandsHelpProps {
  className?: string;
}

export const VoiceCommandsHelp: React.FC<VoiceCommandsHelpProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { getAvailableCommands } = useVoiceCommands();

  const commands = getAvailableCommands();
  
  const categories = {
    navigation: { icon: '📋', title: 'Navegación', color: 'bg-blue-100 text-blue-800' },
    ordering: { icon: '🛒', title: 'Pedidos', color: 'bg-green-100 text-green-800' },
    inquiry: { icon: '❓', title: 'Consultas', color: 'bg-purple-100 text-purple-800' },
    control: { icon: '⚙️', title: 'Control', color: 'bg-gray-100 text-gray-800' }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`p-2 text-text-secondary hover:text-text-primary transition-colors ${className}`}
        title="Ayuda de comandos de voz"
      >
        <HelpCircle className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">🎤 Comandos de Voz</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              💡 <strong>Tip:</strong> Haz clic en el botón 🎤 y di cualquiera de estos comandos:
            </p>
          </div>

          {Object.entries(categories).map(([category, config]) => {
            const categoryCommands = commands.filter(cmd => cmd.category === category);
            
            if (categoryCommands.length === 0) return null;
            
            return (
              <div key={category} className="mb-6">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-3 ${config.color}`}>
                  <span>{config.icon}</span>
                  {config.title}
                </div>
                
                <div className="space-y-2">
                  {categoryCommands.map((command, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                      <div className="flex flex-wrap gap-1 mb-1">
                        {command.trigger.slice(0, 2).map((trigger, i) => (
                          <code key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">
                            "{trigger}"
                          </code>
                        ))}
                        {command.trigger.length > 2 && (
                          <span className="text-xs text-gray-500">+{command.trigger.length - 2} más</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{command.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-2">🗣️ Ejemplos de Uso Natural:</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• <em>"Quiero una pizza margherita"</em></li>
              <li>• <em>"Dos hamburguesas grandes"</em></li>
              <li>• <em>"¿Qué opciones vegetarianas tienen?"</em></li>
              <li>• <em>"Agregar al carrito"</em></li>
              <li>• <em>"Mostrar mi carrito"</em></li>
            </ul>
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={() => setIsOpen(false)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium"
            >
              ¡Entendido!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};