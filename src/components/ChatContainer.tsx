import { Wifi, WifiOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useChatService } from '../hooks/useChatService';
import { useShoppingCart } from '../hooks/useWebSocket';
import { ChatMessage, MenuItem } from '../types';
import ConnectionStatusIndicator from './ConnectionStatusIndicator';
import InputArea from './InputArea';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import { VoiceCommandsHelp } from './VoiceCommandsHelp';
import { VoiceSettingsButton } from './VoiceSettings';

interface ChatContainerProps {
  className?: string;
}

const ChatContainer: React.FC<ChatContainerProps> = ({ className = "" }) => {
  // Hook de chat con API real (HTTP fallback)
  const {
    messages,
    sessionId,
    isLoading,
    error: chatError,
    connectionStatus,
    sendMessage: sendChatMessage,
  } = useChatService({
    enableWebSocket: false, // WebSocket no implementado en backend aún
    onBotMessage: (message) => {
      console.log('📨 Nuevo mensaje del bot:', message);
      setIsTyping(false);
    },
    onError: (error) => {
      console.error('❌ Error en chat:', error);
      setIsTyping(false);
    },
  });

  // Hook de carrito de compras
  const {
    cartItems,
    addToCart,
    getTotalItems,
    getTotalPrice,
    clearCart,
  } = useShoppingCart();

  const [isTyping, setIsTyping] = useState(false);
  const [autoVoiceEnabled, setAutoVoiceEnabled] = useState<boolean>(true);
  const lastAutoSpokenMessageId = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al final cuando hay nuevos mensajes
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Mostrar error si existe
  useEffect(() => {
    if (chatError) {
      console.error('❌ Error de chat:', chatError);
      // Aquí podrías mostrar un toast o notificación al usuario
    }
  }, [chatError]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    setIsTyping(true);

    try {
      await sendChatMessage(content);
      // isTyping se desactiva en el callback onBotMessage
    } catch (error) {
      setIsTyping(false);
      console.error('Error al enviar mensaje:', error);
    }
  };

  const handleMenuItemClick = (item: MenuItem) => {
    // Enviar mensaje automático cuando se hace clic en un plato
    const message = `Me interesa el ${item.name}. ¿Podrías contarme más sobre este plato?`;
    handleSendMessage(message);
  };

  const handleAddToCart = (item: MenuItem) => {
    addToCart(item, 1);
    
    // Mensaje automático de confirmación
    const message = `He agregado "${item.name}" al pedido. ¡Genial elección!`;
    handleSendMessage(message);
  };

  const handleItemInterested = (item: MenuItem) => {
    // Enviar mensaje automático mostrando interés
    const message = `Me interesa mucho el ${item.name}. ¿Podrías darme más detalles sobre los ingredientes y la preparación?`;
    handleSendMessage(message);
  };

  const handleViewAlternatives = (item: MenuItem) => {
    // Enviar mensaje automático pidiendo alternativas
    const message = `El ${item.name} se ve bien, pero me gustaría ver otras opciones similares. ¿Qué alternativas me recomiendas?`;
    handleSendMessage(message);
  };

  const handleVoiceCommand = (action: string, data?: any, response?: string) => {
    console.log('🎤 Comando de voz recibido:', { action, data, response });

    // Ejecutar acción específica
    switch (action) {
      case 'SHOW_MENU':
        handleSendMessage('Muéstrame todo el menú completo');
        break;

      case 'SHOW_CART':
        if (getTotalItems() === 0) {
          handleSendMessage('¿Qué tengo en mi carrito?');
        } else {
          const cartSummary = cartItems.map(item => 
            `• ${item.menuItem.name} x${item.quantity} - $${item.menuItem.price * item.quantity}`
          ).join('\n');
          const total = getTotalPrice();
          handleSendMessage(`Mi carrito actual:\n${cartSummary}\n\nTotal: $${total}`);
        }
        break;

      case 'CLEAR_CART':
        clearCart();
        handleSendMessage('He vaciado mi carrito');
        break;

      case 'SHOW_VEGETARIAN':
        handleSendMessage('Muéstrame opciones vegetarianas');
        break;
        
      case 'SHOW_VEGAN':
        handleSendMessage('Muéstrame opciones veganas');
        break;
        
      case 'SHOW_GLUTEN_FREE':
        handleSendMessage('Muéstrame opciones sin gluten');
        break;
        
      case 'SHOW_DESSERTS':
        handleSendMessage('Muéstrame los postres');
        break;
        
      case 'SHOW_DRINKS':
        handleSendMessage('Muéstrame las bebidas');
        break;
        
      case 'SHOW_PROMOTIONS':
        handleSendMessage('¿Qué promociones tienen hoy?');
        break;

      case 'DIRECT_ORDER':
      case 'QUANTITY_ORDER':
        if (data?.item) {
          const quantity = data.quantity || 1;
          handleSendMessage(`Quiero ${quantity} ${data.item}`);
        }
        break;

      case 'SHOW_HELP':
        // El response ya viene con el mensaje de ayuda
        if (response) {
          handleSendMessage(response);
        }
        break;

      case 'RESTART_CHAT':
        // Aquí podrías implementar lógica para reiniciar la sesión
        clearCart();
        handleSendMessage('Hola, quisiera empezar de nuevo');
        break;

      default:
        console.log('Acción no reconocida:', action);
        if (response) {
          handleSendMessage(response);
        }
    }
  };

  const getTotalCartItems = () => {
    return getTotalItems();
  };

  const getConnectionIcon = () => {
    return connectionStatus === 'connected' ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />;
  };

  return (
    <div className={`flex flex-col h-screen bg-chat-bg ${className}`}>
      {/* Header */}
      <div className="bg-chat-panel border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent-green flex items-center justify-center">
            <span className="text-white font-medium">AI</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Asistente Culinario</h1>
            <div className="flex items-center gap-2">
              {getConnectionIcon()}
              <span className="text-sm text-text-secondary">
                {connectionStatus === 'connected' ? 'En línea' : 
                 connectionStatus === 'reconnecting' ? 'Reconectando...' : 'Fuera de línea'}
              </span>
            </div>
          </div>
        </div>

        {/* Carrito y configuración */}
        <div className="flex items-center gap-3">
          {getTotalCartItems() > 0 && (
            <div className="relative">
              <div className="bg-accent-green text-white px-3 py-1 rounded-full text-sm">
                🛒 {getTotalCartItems()} platos
              </div>
            </div>
          )}
          
          <VoiceCommandsHelp />
          
          {/* Botón toggle auto-voz */}
          <button
            onClick={() => setAutoVoiceEnabled(!autoVoiceEnabled)}
            className={`p-2 rounded-lg text-sm transition-colors ${
              autoVoiceEnabled 
                ? 'bg-green-500 hover:bg-green-600 text-white' 
                : 'bg-gray-500 hover:bg-gray-600 text-white'
            }`}
            title={autoVoiceEnabled ? 'Desactivar auto-voz' : 'Activar auto-voz'}
          >
            {autoVoiceEnabled ? '🔊' : '🔇'}
          </button>
          
          <VoiceSettingsButton />
        </div>
      </div>

      {/* Estado de conexión */}
      {connectionStatus !== 'connected' && (
        <div className="px-4 py-2">
          <ConnectionStatusIndicator status={connectionStatus} />
        </div>
      )}

      {/* Área de mensajes */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto chat-scrollbar bg-chat-bg"
      >
        <div className="py-4">
          {messages.map((message, index) => {
            const isLatestBotMessage = message.type === 'bot' && index === messages.length - 1;
            const shouldAutoSpeak = autoVoiceEnabled && isLatestBotMessage && 
              message.id !== lastAutoSpokenMessageId.current;
            
            console.log('🎯 Debug auto-speak:', {
              messageId: message.id,
              isLatestBot: isLatestBotMessage,
              autoVoiceEnabled,
              lastSpoken: lastAutoSpokenMessageId.current,
              shouldAutoSpeak
            });
            
            return (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.type === 'user'}
                onMenuItemClick={handleMenuItemClick}
                onAddToCart={handleAddToCart}
                onItemInterested={handleItemInterested}
                onViewAlternatives={handleViewAlternatives}
                autoSpeak={shouldAutoSpeak}
                onAutoSpeakTriggered={() => {
                  // Marcar como reproducido cuando se active
                  lastAutoSpokenMessageId.current = message.id;
                  console.log('✅ Marcado como reproducido:', message.id);
                }}
              />
            );
          })}
          
          {/* Indicador de escritura */}
          <TypingIndicator isVisible={isTyping} />
          
          {/* Referencia para auto-scroll */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Área de entrada */}
      <InputArea
        onSendMessage={handleSendMessage}
        onVoiceCommand={handleVoiceCommand}
        isTyping={isTyping}
        disabled={false}
      />
    </div>
  );
};

export default ChatContainer;