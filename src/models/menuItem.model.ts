/**
 * Tipo para los niveles de picante
 */
export enum SpicyLevel {
  NONE = 0,
  MILD = 1,
  MEDIUM = 2,
  HOT = 3,
  EXTRA_HOT = 4,
}

/**
 * Categorías de items del menú
 */
export enum MenuCategory {
  APPETIZER = 'entrada',
  MAIN_COURSE = 'principal',
  DESSERT = 'postre',
  BEVERAGE = 'bebida',
  SIDE_DISH = 'acompañamiento',
}

/**
 * Modelo de un item del menú
 */
export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: MenuCategory;
  imageUrl?: string;
  spicyLevel?: SpicyLevel;
  isVegan: boolean;
  isVegetarian: boolean;
  isGlutenFree: boolean;
  isLactoseFree: boolean;
  isKosher: boolean;
  isHalal: boolean;
  isPaleo: boolean;
  isKeto: boolean;
  allergens: string[];
  tags?: string[];
  available: boolean;
  createdAt: Date;
}

/**
 * Tipo para crear un nuevo item del menú (sin id y createdAt)
 */
export type CreateMenuItemDto = Omit<MenuItem, 'id' | 'createdAt'>;

/**
 * Tipo para actualizar un item del menú (todos los campos opcionales excepto id)
 */
export type UpdateMenuItemDto = Partial<Omit<MenuItem, 'id' | 'createdAt'>>;
