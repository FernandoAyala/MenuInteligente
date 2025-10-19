import { useEffect, useState } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useVoiceCommands } from '../hooks/useVoiceCommands';

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  onVoiceCommand?: (action: string, data?: any, response?: string) => void;
  className?: string;
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onTranscript,
  onVoiceCommand,
  className = '',
}) => {
  const {
    transcript,
    isListening,
    startListening,
    stopListening,
    resetTranscript,
    browserSupportsSpeech,
  } = useSpeechRecognition();
  
  const { processVoiceCommand } = useVoiceCommands();
  const [isProcessing, setIsProcessing] = useState(false);

  // Procesar transcript cuando se complete
  useEffect(() => {
    if (transcript && !isListening && !isProcessing) {
      setIsProcessing(true);
      
      // Procesar comando de voz
      const commandResult = processVoiceCommand(transcript);
      
      if (commandResult.isCommand && onVoiceCommand) {
        // Es un comando específico
        onVoiceCommand(commandResult.action!, commandResult.data, commandResult.response);
      } else {
        // Es texto normal
        onTranscript(transcript);
      }
      
      resetTranscript();
      setTimeout(() => setIsProcessing(false), 1000);
    }
  }, [transcript, isListening, isProcessing, onTranscript, onVoiceCommand, processVoiceCommand, resetTranscript]);

  const handleVoiceInput = () => {
    if (!browserSupportsSpeech) {
      alert('Tu navegador no soporta reconocimiento de voz. Intenta con Chrome, Edge o Safari.');
      return;
    }

    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!browserSupportsSpeech) {
    return null; // No mostrar el botón si no hay soporte
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleVoiceInput}
        disabled={isProcessing}
        className={`
          p-2 rounded-full transition-all duration-200 
          ${isListening 
            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
            : 'bg-blue-500 hover:bg-blue-600 text-white'
          }
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
        title={isListening ? 'Detener grabación' : 'Iniciar grabación de voz'}
      >
        {isListening ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      {/* Indicador visual durante la escucha */}
      {isListening && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          Escuchando... 🎤
        </div>
      )}

      {/* Mostrar transcript en tiempo real */}
      {transcript && isListening && (
        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded max-w-xs">
          {transcript}
        </div>
      )}
    </div>
  );
};