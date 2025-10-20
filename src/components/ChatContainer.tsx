import { Wifi, WifiOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { generateBotResponse, mockChatMessages, simulateTypingDelay } from '../mocks/chatData';
import { ChatMessage, ConnectionStatus, MenuItem } from '../types';
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
  const [messages, setMessages] = useState<ChatMessage[]>(mockChatMessages);
  const [isTyping, setIsTyping] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connected');
  const [cart, setCart] = useState<MenuItem[]>([]);
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

  // Simular cambios de conexión
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.95) { // 5% de probabilidad de cambio de estado
        const statuses: ConnectionStatus[] = ['connected', 'reconnecting', 'connected'];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
        setConnectionStatus(randomStatus);
        
        if (randomStatus === 'reconnecting') {
          setTimeout(() => setConnectionStatus('connected'), 2000);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = async (content: string) => {
    // Crear mensaje del usuario
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content,
      type: 'user',
      timestamp: new Date(),
      status: 'sending'
    };

    setMessages(prev => [...prev, userMessage]);

    // Simular envío
    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === userMessage.id 
            ? { ...msg, status: 'sent' }
            : msg
        )
      );
    }, 500);

    // Mostrar indicador de escritura
    setIsTyping(true);

    try {
      // Simular respuesta del bot
      await simulateTypingDelay();
      const botResponse = generateBotResponse(content);
      
      setIsTyping(false);
      setMessages(prev => [...prev, botResponse]);

      // Simular entrega del mensaje del usuario
      setTimeout(() => {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === userMessage.id 
              ? { ...msg, status: 'delivered' }
              : msg
          )
        );
      }, 1000);

    } catch (error) {
      setIsTyping(false);
      console.error('Error al enviar mensaje:', error);
    }
  };

  const handleMenuItemClick = (item: MenuItem) => {
    // Crear mensaje automático cuando se hace clic en un plato
    const message = `Me interesa el ${item.name}. ¿Podrías contarme más sobre este plato?`;
    handleSendMessage(message);
  };

  const handleAddToCart = (item: MenuItem) => {
    setCart(prev => [...prev, item]);
    
    // Mensaje automático de confirmación
    const message = `He agregado "${item.name}" al pedido. ¡Genial elección!`;
    const confirmationMessage: ChatMessage = {
      id: `bot-${Date.now()}`,
      content: message,
      type: 'bot',
      timestamp: new Date(),
      status: 'sent'
    };
    
    setTimeout(() => {
      setMessages(prev => [...prev, confirmationMessage]);
    }, 500);
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
    
    // Mostrar respuesta inmediata si existe
    if (response) {
      const botMessage: ChatMessage = {
        id: `bot-voice-${Date.now()}`,
        content: response,
        type: 'bot',
        timestamp: new Date(),
        status: 'sent'
      };
      setMessages(prev => [...prev, botMessage]);
    }

    // Ejecutar acción específica
    switch (action) {
      case 'SHOW_MENU':
        // Simular mostrar menú completo
        setTimeout(() => {
          const menuResponse = generateBotResponse('mostrar todo el menú');
          const menuMessage: ChatMessage = {
            id: `bot-${Date.now()}`,
            content: menuResponse.content,
            type: 'bot',
            timestamp: new Date(),
            status: 'sent',
            menuItems: menuResponse.menuItems
          };
          setMessages(prev => [...prev, menuMessage]);
        }, 1000);
        break;

      case 'SHOW_CART':
        if (cart.length === 0) {
          const emptyCartMessage: ChatMessage = {
            id: `bot-${Date.now()}`,
            content: '🛒 Tu carrito está vacío. ¿Te gustaría ver nuestro menú para elegir algo delicioso?',
            type: 'bot',
            timestamp: new Date(),
            status: 'sent'
          };
          setTimeout(() => setMessages(prev => [...prev, emptyCartMessage]), 500);
        } else {
          const cartSummary = cart.map(item => `• ${item.name} - $${item.price}`).join('\n');
          const cartMessage: ChatMessage = {
            id: `bot-${Date.now()}`,
            content: `🛒 En tu carrito tienes:\n\n${cartSummary}\n\nTotal: $${cart.reduce((sum, item) => sum + item.price, 0)}\n\n¿Quieres proceder al checkout o agregar algo más?`,
            type: 'bot',
            timestamp: new Date(),
            status: 'sent'
          };
          setTimeout(() => setMessages(prev => [...prev, cartMessage]), 500);
        }
        break;

      case 'CLEAR_CART':
        setCart([]);
        break;

      case 'SHOW_VEGETARIAN':
      case 'SHOW_VEGAN':
      case 'SHOW_GLUTEN_FREE':
      case 'SHOW_DESSERTS':
      case 'SHOW_DRINKS':
      case 'SHOW_PROMOTIONS':
        // Simular búsqueda específica
        setTimeout(() => {
          const searchResponse = generateBotResponse(response || '');
          const searchMessage: ChatMessage = {
            id: `bot-${Date.now()}`,
            content: searchResponse.content,
            type: 'bot',
            timestamp: new Date(),
            status: 'sent',
            menuItems: searchResponse.menuItems
          };
          setMessages(prev => [...prev, searchMessage]);
        }, 1500);
        break;

      case 'DIRECT_ORDER':
      case 'QUANTITY_ORDER':
        // Buscar el item mencionado
        if (data?.item) {
          setTimeout(() => {
            const orderResponse = generateBotResponse(`buscar ${data.item}`);
            const orderMessage: ChatMessage = {
              id: `bot-${Date.now()}`,
              content: orderResponse.content,
              type: 'bot',
              timestamp: new Date(),
              status: 'sent',
              menuItems: orderResponse.menuItems
            };
            setMessages(prev => [...prev, orderMessage]);
          }, 1000);
        }
        break;

      case 'SHOW_HELP':
        // Respuesta de ayuda ya incluida en response
        break;

      case 'RESTART_CHAT':
        setMessages(mockChatMessages);
        setCart([]);
        break;

      default:
        console.log('Acción no reconocida:', action);
    }
  };

  const getTotalCartItems = () => {
    return cart.length;
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
        disabled={connectionStatus === 'disconnected'}
      />
    </div>
  );
};

export default ChatContainer;