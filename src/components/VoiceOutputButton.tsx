import { useTextToSpeech } from '../hooks/useTextToSpeech';

interface VoiceOutputButtonProps {
  text: string;
  className?: string;
}

export const VoiceOutputButton: React.FC<VoiceOutputButtonProps> = ({
  text,
  className = '',
}) => {
  const { speak, stop, isSpeaking } = useTextToSpeech();

  const handleSpeech = () => {
    console.log('🔊 Click en botón de voz:', { text, isSpeaking });
    
    if (isSpeaking) {
      console.log('⏹️ Deteniendo síntesis...');
      stop();
    } else {
      // Limpiar el texto de caracteres especiales y emojis para mejor pronunciación
      const cleanText = text
        .replace(/[🍕🍝🍗🍖🥗🍲🍛🥘🍜🍱🍙🍚🍘🥟🍤🍣🍡🧆🥙🌮🌯🥪🍔🍟🌭🥓🥞🧇]/g, '')
        .replace(/[$]/g, 'pesos')
        .replace(/[📍⭐💫🎉]/g, '')
        .trim();
      
      console.log('🔊 Texto limpio para síntesis:', cleanText);
      
      if (cleanText.length === 0) {
        console.warn('⚠️ Texto vacío después de limpieza, usando texto original');
        speak(text);
      } else {
        speak(cleanText);
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleSpeech}
      className={`
        p-1 rounded-full transition-all duration-200 hover:bg-gray-200
        ${isSpeaking ? 'text-blue-600 animate-pulse' : 'text-gray-500 hover:text-gray-700'}
        ${className}
      `}
      title={isSpeaking ? 'Detener audio' : 'Reproducir mensaje'}
    >
      {isSpeaking ? (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.814L4.518 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.518l3.865-3.814z" clipRule="evenodd" />
          <path d="M14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" />
        </svg>
      )}
    </button>
  );
};