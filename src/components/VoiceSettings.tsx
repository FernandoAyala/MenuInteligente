import { Settings, X } from 'lucide-react';
import { useState } from 'react';
import { useTextToSpeech } from '../hooks/useTextToSpeech';

interface VoiceSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceSettings: React.FC<VoiceSettingsProps> = ({ isOpen, onClose }) => {
  const {
    voices,
    selectedVoice,
    setSelectedVoice,
    rate,
    setRate,
    pitch,
    setPitch,
    volume,
    setVolume,
    speak,
  } = useTextToSpeech();

  const [testText] = useState('Hola, esta es una prueba de voz para el chat del restaurante.');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Configuración de Voz</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors border border-gray-300 hover:border-gray-400"
          >
            <X className="w-5 h-5 text-gray-800 hover:text-gray-900" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Selección de voz */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Voz
            </label>
            <select
              value={selectedVoice?.name || ''}
              onChange={(e) => {
                const voice = voices.find(v => v.name === e.target.value);
                if (voice) setSelectedVoice(voice);
              }}
              className="w-full p-3 border-2 border-gray-400 rounded-md bg-white text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-500 transition-colors"
              style={{ 
                fontSize: '14px',
                color: '#1f2937',
                backgroundColor: '#ffffff'
              }}
            >
              <option value="" className="text-gray-500 bg-white">
                Seleccionar voz...
              </option>
              {voices
                .filter(voice => voice.lang.startsWith('es') || voice.lang.startsWith('en'))
                .map((voice) => (
                  <option 
                    key={voice.name} 
                    value={voice.name}
                    className="text-gray-900 bg-white font-medium"
                    style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
                  >
                    {voice.name} ({voice.lang})
                  </option>
                ))
              }
            </select>
          </div>

          {/* Velocidad */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Velocidad: {rate.toFixed(1)}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Tono */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Tono: {pitch.toFixed(1)}
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={pitch}
              onChange={(e) => setPitch(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Volumen */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Volumen: {Math.round(volume * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Botón de prueba */}
          <div>
            <button
              onClick={() => speak(testText)}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
            >
              🔊 Probar Voz
            </button>
          </div>

          {/* Información */}
          <div className="text-xs text-gray-500">
            <p>💡 <strong>Tip:</strong> Los ajustes se guardan automáticamente para tu sesión.</p>
            <p>🎤 <strong>Voz:</strong> Usa el botón del micrófono para hablar al chat.</p>
            <p>🔊 <strong>Audio:</strong> Pasa el mouse sobre mensajes del bot para reproducirlos.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente del botón para abrir configuración
export const VoiceSettingsButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
        title="Configuración de voz"
      >
        <Settings className="w-5 h-5" />
      </button>
      
      <VoiceSettings isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};