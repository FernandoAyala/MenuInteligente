// Tipos para los elementos del menú
export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  spicyLevel: number; // 0-5
  isVegan: boolean;
  isVegetarian: boolean;
  isGlutenFree: boolean;
  allergens: string[];
  available: boolean;
  imageUrl?: string;
}

// Tipos para las categorías
export interface Category {
  id: string;
  name: string;
  description: string;
  order: number;
}

// Tipos para los mensajes del chat
export interface ChatMessage {
  id: string;
  content: string;
  type: 'user' | 'bot';
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  menuItems?: MenuItem[]; // Para recomendaciones de platos
  isTyping?: boolean;
  autoAddedToCart?: boolean; // Indica si los items fueron agregados automáticamente
}

// Tipos para las sesiones de conversación
export interface ConversationSession {
  id: string;
  startedAt: Date;
  updatedAt: Date;
  language: string;
  slots: ConversationSlots;
  cart: CartItem[];
}

export interface ConversationSlots {
  dietaryRestrictions?: string[]; // ['vegan', 'vegetarian', 'gluten-free']
  allergens?: string[]; // ['nuts', 'dairy', 'shellfish']
  budget?: number;
  spicyLevel?: number; // 0-5
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  preferences?: string[]; // ['mexican', 'italian', 'healthy']
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
}

// Estados de conexión para WebSocket
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

// Tipos para respuestas de la API
export interface SuggestionResponse {
  recommendations: MenuItem[];
  message: string;
  sessionId: string;
  conversationContext: ConversationSlots;
}

// Props para componentes
export interface ChatContainerProps {
  className?: string;
}

export interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  onMenuItemClick?: (item: MenuItem) => void;
}

export interface DishCardProps {
  menuItem: MenuItem;
  onClick?: (item: MenuItem) => void;
  showAddButton?: boolean;
  onAddToCart?: (item: MenuItem) => void;
}

export interface InputAreaProps {
  onSendMessage: (message: string) => void;
  isTyping: boolean;
  disabled?: boolean;
}

export interface TypingIndicatorProps {
  isVisible: boolean;
  userName?: string;
}

export interface ConnectionStatusProps {
  status: ConnectionStatus;
}