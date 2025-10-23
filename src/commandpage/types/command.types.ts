export interface Dish {
  id: string;
  name: string;
  category: 'appetizer' | 'main' | 'dessert' | 'drink';
  specifications?: string[];
  price: number;
  quantity: number;
}

export interface Command {
  id: string;
  tableNumber: number;
  timestamp: Date;
  dishes: Dish[];
  status: 'pending' | 'in-progress' | 'ready' | 'served';
  totalAmount: number;
  customerNotes?: string;
  estimatedTime?: number; // en minutos
}

export interface KitchenStats {
  totalCommands: number;
  pendingCommands: number;
  inProgressCommands: number;
  readyCommands: number;
  averagePreparationTime: number;
}