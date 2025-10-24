import { Command, Dish } from '../types/command.types';

// Mock de platos individuales
const mockDishes: Dish[] = [
  {
    id: '1',
    name: 'Parrillada Premium',
    category: 'main',
    specifications: ['Sin sal', 'Punto medio', 'Acompañar con papas fritas'],
    price: 2500,
    quantity: 2
  },
  {
    id: '2',
    name: 'Ensalada César',
    category: 'appetizer',
    specifications: ['Sin cebolla', 'Aderezo aparte'],
    price: 890,
    quantity: 1
  },
  {
    id: '3',
    name: 'Salmón a la plancha',
    category: 'main',
    specifications: ['Bien cocido', 'Sin limón', 'Salsa tartara aparte'],
    price: 3200,
    quantity: 1
  },
  {
    id: '4',
    name: 'Tiramisu casero',
    category: 'dessert',
    specifications: ['Sin café', 'Porción extra grande'],
    price: 750,
    quantity: 3
  },
  {
    id: '5',
    name: 'Coca Cola',
    category: 'drink',
    price: 350,
    quantity: 2
  },
  {
    id: '6',
    name: 'Milanesa napolitana',
    category: 'main',
    specifications: ['Con papas fritas', 'Salsa de tomate casera', 'Extra queso'],
    price: 1800,
    quantity: 1
  },
  {
    id: '7',
    name: 'Empanadas de carne',
    category: 'appetizer',
    specifications: ['Muy picantes', 'Con chimichurri'],
    price: 180,
    quantity: 6
  },
  {
    id: '8',
    name: 'Pizza Margherita',
    category: 'main',
    specifications: ['Masa fina', 'Extra albahaca', 'Sin aceitunas'],
    price: 1450,
    quantity: 1
  },
  {
    id: '9',
    name: 'Flan casero',
    category: 'dessert',
    specifications: ['Con dulce de leche', 'Sin crema'],
    price: 520,
    quantity: 2
  },
  {
    id: '10',
    name: 'Agua mineral',
    category: 'drink',
    price: 280,
    quantity: 1
  }
];

// Mock de comandas completas
export const mockCommands: Command[] = [
  {
    id: 'cmd-001',
    tableNumber: 5,
    timestamp: new Date(Date.now() - 10 * 60 * 1000), // Hace 10 minutos
    dishes: [mockDishes[0], mockDishes[1], mockDishes[4]],
    status: 'pending',
    totalAmount: 2500 + 890 + 350 * 2,
    customerNotes: 'Celebración de cumpleaños. Por favor, traer vela para el postre.',
    estimatedTime: 25
  },
  {
    id: 'cmd-002',
    tableNumber: 12,
    timestamp: new Date(Date.now() - 15 * 60 * 1000), // Hace 15 minutos
    dishes: [mockDishes[2], mockDishes[9]],
    status: 'in-progress',
    totalAmount: 3200 + 520 * 2,
    customerNotes: 'Cliente alérgico al maní. Verificar ingredientes.',
    estimatedTime: 18
  },
  {
    id: 'cmd-003',
    tableNumber: 3,
    timestamp: new Date(Date.now() - 5 * 60 * 1000), // Hace 5 minutos
    dishes: [mockDishes[5], mockDishes[6], mockDishes[9]],
    status: 'pending',
    totalAmount: 1800 + 180 * 6 + 280,
    estimatedTime: 30
  },
  {
    id: 'cmd-004',
    tableNumber: 8,
    timestamp: new Date(Date.now() - 20 * 60 * 1000), // Hace 20 minutos
    dishes: [mockDishes[7], mockDishes[8]],
    status: 'ready',
    totalAmount: 1450 + 520 * 2,
    customerNotes: 'Mesa para niños pequeños. Por favor, cortar la pizza en trozos pequeños.',
    estimatedTime: 0
  },
  {
    id: 'cmd-005',
    tableNumber: 15,
    timestamp: new Date(Date.now() - 8 * 60 * 1000), // Hace 8 minutos
    dishes: [mockDishes[6], mockDishes[3], mockDishes[4]],
    status: 'in-progress',
    totalAmount: 180 * 6 + 750 * 3 + 350 * 2,
    estimatedTime: 12
  },
  {
    id: 'cmd-006',
    tableNumber: 7,
    timestamp: new Date(Date.now() - 2 * 60 * 1000), // Hace 2 minutos
    dishes: [mockDishes[0], mockDishes[1]],
    status: 'pending',
    totalAmount: 2500 * 2 + 890,
    customerNotes: 'Cliente vegetariano pidió la parrillada. Por favor, preparar verduras a la parrilla.',
    estimatedTime: 35
  }
];

// Función para generar comandas adicionales
export const generateRandomCommand = (): Command => {
  const tableNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  const statuses: Command['status'][] = ['pending', 'in-progress', 'ready'];
  
  const randomDishes = mockDishes
    .sort(() => 0.5 - Math.random())
    .slice(0, Math.floor(Math.random() * 4) + 1);
  
  const totalAmount = randomDishes.reduce((sum, dish) => sum + (dish.price * dish.quantity), 0);
  
  return {
    id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    tableNumber: tableNumbers[Math.floor(Math.random() * tableNumbers.length)],
    timestamp: new Date(Date.now() - Math.random() * 30 * 60 * 1000), // Últimos 30 minutos
    dishes: randomDishes,
    status: statuses[Math.floor(Math.random() * statuses.length)],
    totalAmount,
    estimatedTime: Math.floor(Math.random() * 40) + 10,
    customerNotes: Math.random() > 0.6 ? 'Sin especificaciones adicionales' : undefined
  };
};

export default mockCommands;
