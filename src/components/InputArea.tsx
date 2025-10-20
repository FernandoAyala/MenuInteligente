import { Paperclip, Send, Smile } from 'lucide-react';
import { KeyboardEvent, useState } from 'react';
import { VoiceInputButton } from './VoiceInputButton';

interface InputAreaProps {
  onSendMessage: (message: string) => void;
  onVoiceCommand?: (action: string, data?: any, response?: string) => void;
  isTyping: boolean;
  disabled?: boolean;
  placeholder?: string;
}

const InputArea: React.FC<InputAreaProps> = ({ 
  onSendMessage,
  onVoiceCommand,
  isTyping, 
  disabled = false,
  placeholder = "Escribe tu mensaje..." 
}) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim() && !disabled && !isTyping) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  return (
    <div className="bg-chat-panel border-t border-gray-700 px-4 py-3">
      <div className="flex items-end gap-3">
        {/* Botón de adjuntar (futuro) */}
        <button 
          className="flex-shrink-0 p-2 text-text-secondary hover:text-text-primary transition-colors"
          disabled={disabled}
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Área de texto */}
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            placeholder={disabled ? "El asistente está escribiendo..." : placeholder}
            disabled={disabled || isTyping}
            className="w-full bg-input-bg text-text-primary placeholder-text-secondary px-4 py-3 pr-12 rounded-lg resize-none min-h-[44px] max-h-32 focus:outline-none focus:ring-2 focus:ring-accent-green transition-all"
            rows={1}
          />
          
          {/* Contador de caracteres (opcional) */}
          {message.length > 100 && (
            <div className="absolute -bottom-6 right-0 text-xs text-text-secondary">
              {message.length}/500
            </div>
          )}
        </div>

        {/* Botón de emoji (futuro) */}
        <button 
          className="flex-shrink-0 p-2 text-text-secondary hover:text-text-primary transition-colors"
          disabled={disabled}
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Botón de entrada de voz */}
        <VoiceInputButton
          onTranscript={(text: string) => {
            setMessage(text);
            if (text.trim()) {
              onSendMessage(text);
            }
          }}
          onVoiceCommand={(action, data, response) => {
            if (onVoiceCommand) {
              onVoiceCommand(action, data, response);
            }
          }}
          className="flex-shrink-0"
        />

        {/* Botón de enviar */}
        <button
          onClick={handleSend}
          disabled={!message.trim() || disabled || isTyping}
          className={`flex-shrink-0 p-2 rounded-full transition-all ${
            message.trim() && !disabled && !isTyping
              ? 'bg-accent-green text-white hover:bg-green-600 scale-100' 
              : 'bg-gray-600 text-gray-400 scale-95'
          }`}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

      {/* Sugerencias rápidas (opcional) */}
      <div className="flex flex-wrap gap-2 mt-3">
        {['🌱 Opciones vegetarianas', '🌶️ Comida picante', '💰 Menú económico', '🍰 Postres'].map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => setMessage(suggestion.split(' ').slice(1).join(' '))}
            disabled={disabled || isTyping}
            className="px-3 py-1 bg-input-bg text-text-secondary text-sm rounded-full hover:bg-gray-600 hover:text-text-primary transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
};

export default InputArea;