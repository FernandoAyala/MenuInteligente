import { Wifi, WifiOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import chefcitoAvatar from '../chefcito.jpg';
import { useChatService } from '../hooks/useChatService';
import { useShoppingCart } from '../hooks/useWebSocket';
import { MenuItem } from '../types';
import { CartPanel } from './CartPanel';
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
  // Leer sessionId de la URL
  const urlSessionId = new URLSearchParams(window.location.search).get('sessionId');
  
  // Hook de chat con API real (HTTP fallback)
  const {
    messages,
    sessionId,
    isLoading,
    error: chatError,
    connectionStatus,
    sendMessage: sendChatMessage,
  } = useChatService({
    sessionId: urlSessionId || undefined, // Usar sessionId de la URL si existe
    enableWebSocket: false, // WebSocket no implementado en backend aún
    onBotMessage: (message) => {
      setIsTyping(false);
      
      // Detectar si el mensaje indica que se agregó algo al carrito
      const contentLower = message.content.toLowerCase();
      const addedToCartPhrases = [
        'he agregado',
        'agregué',
        'añadí',
        'he añadido',
        'agregado al carrito',
        'añadido al carrito',
        'agregado a tu carrito',
        'añadido a tu carrito',
      ];
      
      const cartWasUpdated = addedToCartPhrases.some(phrase => contentLower.includes(phrase));
      
      if (cartWasUpdated) {
        setCartUpdateTrigger(prev => prev + 1);
      }
    },
    onError: () => {
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
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartUpdateTrigger, setCartUpdateTrigger] = useState(0); // Trigger para recargar el carrito
  const [cartCounter, setCartCounter] = useState(0); // Contador local para forzar actualización
  const lastAutoSpokenMessageId = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Limpiar localStorage cuando cambia la sesión
  useEffect(() => {
    if (sessionId) {
      const lastSessionId = localStorage.getItem('last_session_id');
      
      if (lastSessionId !== sessionId) {
        // Nueva sesión, limpiar carrito del localStorage
        localStorage.removeItem('shopping_cart');
        clearCart();
        localStorage.setItem('last_session_id', sessionId);
      }
    }
  }, [sessionId, clearCart]);

  // Sincronizar contador con carrito del backend cuando cambia el sessionId o llega un nuevo mensaje
  useEffect(() => {
    const syncCartFromBackend = async () => {
      if (!sessionId) return;

      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${API_URL}/api/sessions/${sessionId}`);
        
        if (response.ok) {
          const sessionData = await response.json();
          const backendCart = sessionData.data?.cart || sessionData.cart || [];
          
          // Calcular total de items (sumando cantidades)
          const totalItems = backendCart.reduce((total: number, item: any) => {
            return total + (item.quantity || 1);
          }, 0);
          
          setCartCounter(totalItems);
        }
      } catch (error) {
        // Error silencioso
      }
    };

    syncCartFromBackend();
  }, [sessionId, messages.length]);

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
      // Aquí podrías mostrar un toast o notificación al usuario
    }
  }, [chatError]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    // Detectar intención de confirmar pedido en el texto
    const lowerContent = content.toLowerCase().trim();
    const confirmPatterns = [
      'confirmar pedido',
      'confirmar el pedido', 
      'confirmar mi pedido',
      'hacer el pedido',
      'hacer pedido',
      'finalizar pedido',
      'finalizar el pedido',
      'proceder al pago',
      'quiero pagar',
      'enviar a cocina',
      'enviar el pedido'
    ];

    const isConfirmIntent = confirmPatterns.some(pattern => lowerContent.includes(pattern));

    if (isConfirmIntent) {
      // Si tiene items en el carrito, confirmar
      if (getTotalItems() > 0) {
        setIsCartOpen(true);
        const currentCartItems = cartItems.map(item => ({
          menuItemId: item.menuItem.id,
          menuItem: item.menuItem,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions || '',
        }));
        
        // Enviar el mensaje al chat para que el agente IA confirme
        setIsTyping(true);
        await sendChatMessage(content);
        
        // Ejecutar la confirmación real del pedido
        setTimeout(() => {
          handleConfirmOrder(currentCartItems);
        }, 800);
        
        return;
      } else {
        // Si no hay items, enviar al agente IA para que responda
        setIsTyping(true);
        await sendChatMessage(content);
        return;
      }
    }

    // Flujo normal para otros mensajes
    setIsTyping(true);

    try {
      await sendChatMessage(content);
      // isTyping se desactiva en el callback onBotMessage
    } catch (error) {
      setIsTyping(false);
    }
  };

  const handleMenuItemClick = (item: MenuItem) => {
    // Enviar mensaje automático cuando se hace clic en un plato
    const message = `Me interesa el ${item.name}. ¿Podrías contarme más sobre este plato?`;
    handleSendMessage(message);
  };

  const handleAddToCart = async (item: MenuItem) => {
    await addToCart(item, 1);
    
    // Incrementar trigger para que CartPanel recargue
    setCartUpdateTrigger(prev => prev + 1);
    
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

      case 'CHECKOUT':
        // Confirmar pedido por voz
        if (getTotalItems() === 0) {
          handleSendMessage('Mi carrito está vacío, no puedo confirmar un pedido sin items');
        } else {
          // Abrir el panel del carrito para mostrar resumen
          setIsCartOpen(true);
          // Ejecutar la confirmación automáticamente
          const currentCartItems = cartItems.map(item => ({
            menuItemId: item.menuItem.id,
            menuItem: item.menuItem,
            quantity: item.quantity,
            specialInstructions: item.specialInstructions || '',
          }));
          // Esperar un momento para que el usuario vea el panel
          setTimeout(() => {
            handleConfirmOrder(currentCartItems);
          }, 500);
        }
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
        // Limpiar carrito
        clearCart();
        
        // Limpiar mensajes del localStorage
        if (sessionId) {
          try {
            localStorage.removeItem(`chat_messages_${sessionId}`);
            console.log('🧹 Mensajes del chat limpiados del localStorage');
          } catch (error) {
            console.warn('No se pudo limpiar mensajes:', error);
          }
        }
        
        // Recargar la página para reiniciar completamente
        window.location.reload();
        break;

      default:
        console.log('Acción no reconocida:', action);
        if (response) {
          handleSendMessage(response);
        }
    }
  };

  // Sincronizar contador local con cartItems (solo cuando se usa el botón manual)
  useEffect(() => {
    const total = getTotalItems();
    
    // Solo actualizar si hay items en localStorage (se agregó manualmente)
    if (total > 0) {
      setCartCounter(prev => Math.max(prev, total)); // Usar el máximo para no sobrescribir el backend
    }
  }, [cartItems, getTotalItems]);

  const getTotalCartItems = () => {
    return cartCounter;
  };

  const getConnectionIcon = () => {
    return connectionStatus === 'connected' ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />;
  };

  const handleConfirmOrder = async (cartItems: any[]) => {
    try {
      if (!sessionId) {
        alert('Error: No se pudo identificar la sesión');
        return;
      }

      if (!cartItems || cartItems.length === 0) {
        alert('El carrito está vacío');
        return;
      }

      // Obtener la sesión actual para verificar si ya tiene número de mesa
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const sessionResponse = await fetch(`${API_URL}/api/sessions/${sessionId}`);
      const sessionData = await sessionResponse.json();
      const session = sessionData.data;

      // Si la sesión ya tiene mesa asignada, usarla. Si no, generar una nueva
      const tableNumber = session?.tableNumber || Math.floor(Math.random() * 20) + 1;

      // Convertir items del carrito al formato esperado por el backend
      const formattedCartItems = cartItems.map(item => ({
        menuItemId: item.menuItemId,
        name: item.menuItem?.name || 'Desconocido',
        quantity: item.quantity,
        price: item.menuItem?.price || 0,
        specialInstructions: item.specialInstructions || '',
      }));

      // Crear la orden con el formato que espera el backend
      const orderData = {
        tableNumber: tableNumber,
        sessionId: sessionId,
        cartItems: formattedCartItems,
        customerNotes: 'Pedido desde chat',
      };

      // Enviar directamente al endpoint POST /api/orders
      const response = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear la orden');
      }

      const result = await response.json();
      const createdOrder = result.data;

      // NO limpiar el carrito local - dejamos que el backend marque como confirmados
      // clearCart(); // ❌ COMENTADO

      // INCREMENTAR EL TRIGGER para que CartPanel recargue desde Firestore
      setCartUpdateTrigger(prev => prev + 1);

      // Cerrar el modal del carrito temporalmente
      setIsCartOpen(false);
      
      // Reabrir después de 500ms para mostrar items confirmados en gris
      setTimeout(() => {
        setIsCartOpen(true);
      }, 500);

      // Mostrar un alert para confirmar al usuario
      setTimeout(() => {
        alert(`✅ Pedido confirmado!\n\nMesa: ${tableNumber}\nOrden: #${createdOrder.id}\nTotal: $${createdOrder.totalAmount.toLocaleString()}\n\nLa orden ha sido enviada a la cocina.`);
      }, 300);

    } catch (error) {
      alert(`❌ Error al confirmar el pedido: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const handleRemoveItem = (menuItemId: string, itemName: string) => {
    // Enviar mensaje al chat para eliminar el item
    const message = `Sacá ${itemName} del carrito`;
    handleSendMessage(message);
    
    // Cerrar el carrito temporalmente y recargarlo
    setIsCartOpen(false);
    setTimeout(() => {
      setCartUpdateTrigger(prev => prev + 1);
      setIsCartOpen(true);
    }, 500);
  };

  const handleRequestBill = () => {
    // Mostrar confirmación
    const confirmed = window.confirm(
      '¿Deseas solicitar la cuenta y finalizar la sesión?\n\n' +
      'Se limpiará el historial del chat y el carrito.'
    );
    
    if (!confirmed) {
      return;
    }
    
    // Limpiar todo el localStorage cuando se solicita la cuenta
    try {
      // Limpiar mensajes del chat
      if (sessionId) {
        localStorage.removeItem(`chat_messages_${sessionId}`);
        console.log('🧹 Mensajes limpiados del localStorage al solicitar cuenta');
      }
      
      // Limpiar carrito
      localStorage.removeItem('shopping_cart');
      console.log('🧹 Carrito limpiado del localStorage al solicitar cuenta');
      
      // Limpiar el carrito en el estado
      clearCart();
      
      // Mostrar mensaje de éxito
      alert('✅ Cuenta solicitada correctamente.\n\nGracias por tu visita!');
      
      // Recargar la página para reiniciar completamente la sesión
      window.location.reload();
      
    } catch (error) {
      console.warn('Error al limpiar localStorage:', error);
      alert('Hubo un error al procesar la solicitud. Por favor intenta nuevamente.');
    }
  };

  return (
    <div className={`flex flex-col h-screen bg-chat-bg ${className}`}>
      {/* Header */}
      <div className="bg-chat-panel border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-accent-green flex items-center justify-center">
            <img 
              src={chefcitoAvatar} 
              alt="Muzzini" 
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Muzzini</h1>
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
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative bg-accent-green text-white px-3 py-1 rounded-full text-sm hover:bg-green-600 transition-colors cursor-pointer"
          >
            🛒 {getTotalCartItems() > 0 ? `${getTotalCartItems()} platos` : 'Carrito'}
          </button>
          
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

      {/* Panel del carrito */}
      <CartPanel
        sessionId={sessionId}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onConfirmOrder={handleConfirmOrder}
        onRemoveItem={handleRemoveItem}
        onRequestBill={handleRequestBill}
        updateTrigger={cartUpdateTrigger}
      />
    </div>
  );
};

export default ChatContainer;