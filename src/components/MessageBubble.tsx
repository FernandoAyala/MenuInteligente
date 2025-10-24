import { Check, CheckCheck, Clock } from 'lucide-react';
import { useEffect } from 'react';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { ChatMessage, MenuItem } from '../types';
import FoodCarousel from './FoodCarousel';
import { VoiceOutputButton } from './VoiceOutputButton';
import muzziniAvatar from '../chefcito.jpg';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  onMenuItemClick?: (item: MenuItem) => void;
  onAddToCart?: (item: MenuItem) => void;
  onItemInterested?: (item: MenuItem) => void;
  onViewAlternatives?: (item: MenuItem) => void;
  autoSpeak?: boolean; // Nueva prop para activar lectura automática
  onAutoSpeakTriggered?: () => void; // Callback cuando se activa auto-speak
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  isOwn, 
  onMenuItemClick,
  onAddToCart,
  onItemInterested,
  onViewAlternatives,
  autoSpeak = false,
  onAutoSpeakTriggered
}) => {
  const { speak } = useTextToSpeech();

  // Auto-reproducir voz para mensajes del bot
  useEffect(() => {
    if (autoSpeak && !isOwn && message.content) {
      console.log('🎤 Iniciando auto-speak para mensaje:', message.id);
      
      // Limpiar texto de emojis y caracteres especiales
      const cleanText = message.content
        .replace(/[🍕🍝🍗🍖🥗🍲🍛🥘🍜🍱🍙🍚🍘🥟🍤🍣🍡🧆🥙🌮🌯🥪🍔🍟🌭🥓🥞🧇]/g, '')
        .replace(/[$]/g, 'pesos')
        .replace(/[📍⭐💫🎉🛒]/g, '')
        .trim();
      
      // Esperar un momento para que el mensaje se renderice
      const timer = setTimeout(() => {
        if (cleanText.length > 0) {
          console.log('🔊 Auto-reproduciendo:', cleanText);
          speak(cleanText);
          onAutoSpeakTriggered?.();
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [autoSpeak, isOwn, message.content, message.id, speak, onAutoSpeakTriggered]);

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending':
        return <Clock className="w-4 h-4 text-text-secondary" />;
      case 'sent':
        return <Check className="w-4 h-4 text-text-secondary" />;
      case 'delivered':
        return <CheckCheck className="w-4 h-4 text-text-secondary" />;
      case 'read':
        return <CheckCheck className="w-4 h-4 text-accent-blue" />;
      default:
        return null;
    }
  };

  const bubbleClass = isOwn 
    ? 'bg-message-outgoing text-white ml-auto' 
    : 'bg-message-incoming text-text-primary mr-auto';

  return (
    <div className={`flex items-start gap-3 px-4 py-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
      {/* Avatar del bot */}
      {!isOwn && (
        <div className="w-8 h-8 rounded-full overflow-hidden bg-accent-green flex items-center justify-center flex-shrink-0">
          <img 
            src={muzziniAvatar} 
            alt="Muzzini" 
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className={`flex flex-col gap-2 max-w-[85%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Mensaje de texto */}
        <div className={`px-4 py-3 rounded-lg ${bubbleClass} shadow-sm`}>
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>
          
          {/* Timestamp y estado */}
        <div className="flex items-end gap-2 justify-between">
          <div className="flex items-center gap-1 text-xs text-text-secondary">
            <span>{formatTime(message.timestamp)}</span>
            {isOwn && getStatusIcon()}
          </div>
          
          {/* Botón de voz para mensajes del bot */}
          {!isOwn && (
            <VoiceOutputButton text={message.content} />
          )}
        </div>
        </div>

        {/* Recomendaciones de platos */}
        {message.menuItems && message.menuItems.length > 0 && (
          <div className="w-full max-w-md">
            <FoodCarousel
              items={message.menuItems}
              onItemClick={onMenuItemClick}
              onAddToCart={onAddToCart}
              onInterested={onItemInterested}
              onViewAlternatives={onViewAlternatives}
              title="Recomendaciones"
              variant="chat"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;