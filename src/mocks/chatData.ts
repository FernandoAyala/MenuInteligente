import { Category, ChatMessage, ConversationSession, MenuItem } from '../types';

// Mock de categorías
export const mockCategories: Category[] = [
  {
    id: '1',
    name: 'Entradas',
    description: 'Deliciosos aperitivos para comenzar',
    order: 1
  },
  {
    id: '2',
    name: 'Platos Principales',
    description: 'Nuestros platos estrella',
    order: 2
  },
  {
    id: '3',
    name: 'Postres',
    description: 'Dulces tentaciones',
    order: 3
  },
  {
    id: '4',
    name: 'Bebidas',
    description: 'Refrescantes y calientes',
    order: 4
  }
];

// Mock de elementos del menú
export const mockMenuItems: MenuItem[] = [
  {
    id: 'item-1',
    categoryId: '1',
    name: 'Empanadas Argentinas',
    description: 'Tradicionales empanadas de carne, cebolla y especias. Servidas con chimichurri casero.',
    price: 850,
    currency: 'ARS',
    spicyLevel: 1,
    isVegan: false,
    isVegetarian: false,
    isGlutenFree: false,
    allergens: ['gluten'],
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1601000938365-99cd2752491b?w=400&h=300&fit=crop'
  },
  {
    id: 'item-2',
    categoryId: '2',
    name: 'Risotto de Hongos',
    description: 'Cremoso risotto con hongos portobello, parmesano y hierbas frescas.',
    price: 2200,
    currency: 'ARS',
    spicyLevel: 0,
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: true,
    allergens: ['dairy'],
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400&h=300&fit=crop'
  },
  {
    id: 'item-3',
    categoryId: '2',
    name: 'Salmón Grillado',
    description: 'Filete de salmón a la parrilla con quinoa, vegetales asados y salsa de eneldo.',
    price: 3200,
    currency: 'ARS',
    spicyLevel: 0,
    isVegan: false,
    isVegetarian: false,
    isGlutenFree: true,
    allergens: ['fish'],
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop'
  },
  {
    id: 'item-4',
    categoryId: '2',
    name: 'Buddha Bowl Vegano',
    description: 'Bowl nutritivo con quinoa, garbanzos especiados, aguacate, hummus y tahini.',
    price: 1950,
    currency: 'ARS',
    spicyLevel: 2,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    allergens: ['sesame'],
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop'
  },
  {
    id: 'item-5',
    categoryId: '3',
    name: 'Tiramisú Casero',
    description: 'Clásico tiramisú italiano con mascarpone, café espresso y cacao.',
    price: 890,
    currency: 'ARS',
    spicyLevel: 0,
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: false,
    allergens: ['dairy', 'eggs', 'gluten'],
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=300&fit=crop'
  },
  {
    id: 'item-6',
    categoryId: '4',
    name: 'Smoothie Verde Detox',
    description: 'Batido refrescante con espinaca, manzana verde, apio, jengibre y limón.',
    price: 650,
    currency: 'ARS',
    spicyLevel: 1,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    allergens: [],
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=400&h=300&fit=crop'
  }
];

// Mock de mensajes del chat
export const mockChatMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    content: '¡Hola! Soy tu asistente culinario. ¿En qué puedo ayudarte hoy?',
    type: 'bot',
    timestamp: new Date(Date.now() - 300000), // 5 minutos atrás
    status: 'read'
  },
  {
    id: 'msg-2',
    content: 'Hola! Estoy buscando algo vegetariano para almorzar',
    type: 'user',
    timestamp: new Date(Date.now() - 280000),
    status: 'read'
  },
  {
    id: 'msg-3',
    content: '¡Perfecto! Tengo algunas recomendaciones vegetarianas deliciosas para ti:',
    type: 'bot',
    timestamp: new Date(Date.now() - 260000),
    status: 'read',
    menuItems: [mockMenuItems[1], mockMenuItems[3]] // Risotto y Buddha Bowl
  },
  {
    id: 'msg-4',
    content: 'El risotto se ve delicioso! ¿Tiene algún acompañamiento?',
    type: 'user',
    timestamp: new Date(Date.now() - 240000),
    status: 'read'
  },
  {
    id: 'msg-5',
    content: 'El risotto viene con una ensalada verde fresca y pan artesanal. También puedes añadir trufa por un cargo adicional. ¿Te gustaría agregarlo al pedido?',
    type: 'bot',
    timestamp: new Date(Date.now() - 220000),
    status: 'read'
  }
];

// Mock de sesión de conversación
export const mockConversationSession: ConversationSession = {
  id: 'session-1',
  startedAt: new Date(Date.now() - 300000),
  updatedAt: new Date(),
  language: 'es',
  slots: {
    dietaryRestrictions: ['vegetarian'],
    budget: 2500,
    mealType: 'lunch',
    preferences: ['healthy', 'mediterranean']
  },
  cart: [
    {
      menuItem: mockMenuItems[1], // Risotto
      quantity: 1,
      notes: 'Sin trufa, por favor'
    }
  ]
};

// Funciones para simular respuestas del chatbot
export const generateBotResponse = (userMessage: string): ChatMessage => {
  const responses = [
    {
      trigger: ['hola', 'hi', 'buenas'],
      content: '¡Hola! Soy tu asistente culinario. ¿En qué puedo ayudarte hoy? Puedo recomendarte platos, ayudarte con alergias o restricciones dietéticas.',
      menuItems: []
    },
    {
      trigger: ['vegetariano', 'vegano', 'sin carne'],
      content: 'Tengo excelentes opciones vegetarianas y veganas para ti:',
      menuItems: mockMenuItems.filter(item => item.isVegetarian || item.isVegan)
    },
    {
      trigger: ['sin gluten', 'celiaco', 'gluten free'],
      content: 'Estas son nuestras opciones libres de gluten:',
      menuItems: mockMenuItems.filter(item => item.isGlutenFree)
    },
    {
      trigger: ['picante', 'spicy', 'condimentado'],
      content: 'Si te gusta lo picante, estas opciones son perfectas:',
      menuItems: mockMenuItems.filter(item => item.spicyLevel >= 2)
    },
    {
      trigger: ['postre', 'dulce', 'dessert'],
      content: 'Para endulzar tu día, tenemos estos postres irresistibles:',
      menuItems: mockMenuItems.filter(item => item.categoryId === '3')
    }
  ];

  const lowerMessage = userMessage.toLowerCase();
  const matchedResponse = responses.find(response => 
    response.trigger.some(trigger => lowerMessage.includes(trigger))
  );

  const response = matchedResponse || {
    content: 'Interesante elección. ¿Hay algo específico que te gustaría saber sobre nuestro menú? Puedo ayudarte con ingredientes, precios o recomendaciones personalizadas.',
    menuItems: []
  };

  return {
    id: `msg-${Date.now()}`,
    content: response.content,
    type: 'bot',
    timestamp: new Date(),
    status: 'sent',
    menuItems: response.menuItems.length > 0 ? response.menuItems.slice(0, 3) : undefined
  };
};

// Simular typing delay
export const simulateTypingDelay = (): Promise<void> => {
  return new Promise(resolve => {
    setTimeout(resolve, 1000 + Math.random() * 2000); // 1-3 segundos
  });
};