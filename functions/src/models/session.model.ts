/**
 * Rol del mensaje en la conversación
 */
export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

/**
 * Mensaje individual en una conversación
 */
export interface Message {
  role: MessageRole;
  content: string;
  timestamp: Date;
}

/**
 * Item del carrito
 */
export interface CartItem {
  menuItemId: string;
  quantity: number;
  specialInstructions?: string;
  confirmed?: boolean; // true = ya fue pedido (mostrar en gris), false/undefined = pendiente
  orderId?: string; // ID del pedido al que pertenece (para historial)
  confirmedAt?: Date; // Fecha cuando se confirmó
}

/**
 * Slots extraídos de la conversación
 */
export interface ConversationSlots {
  dietaryRestrictions?: string[];
  allergens?: string[];
  budget?: any
  preferredCategories?: string[];
  spicyPreference?: number;
  [key: string]: unknown; // Permite otros slots dinámicos
}

/**
 * Modelo de una sesión de conversación
 */
export interface ConversationSession {
  id: string;
  startedAt: Date;
  updatedAt: Date;
  slots: ConversationSlots;
  messages: Message[];
  cart: CartItem[];
  tableNumber?: number; // Número de mesa asignado (se mantiene para toda la sesión)
}

/**
 * Tipo para crear una nueva sesión
 */
export type CreateSessionDto = Omit<ConversationSession, 'id' | 'startedAt' | 'updatedAt'>;

/**
 * Tipo para actualizar una sesión
 */
export type UpdateSessionDto = Partial<Omit<ConversationSession, 'id' | 'startedAt'>>;
