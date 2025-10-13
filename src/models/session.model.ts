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
}

/**
 * Slots extraídos de la conversación
 */
export interface ConversationSlots {
  dietaryRestrictions?: string[];
  allergens?: string[];
  budget?: number;
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
}

/**
 * Tipo para crear una nueva sesión
 */
export type CreateSessionDto = Omit<ConversationSession, 'id' | 'startedAt' | 'updatedAt'>;

/**
 * Tipo para actualizar una sesión
 */
export type UpdateSessionDto = Partial<Omit<ConversationSession, 'id' | 'startedAt'>>;
