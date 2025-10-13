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
  APPETIZER = 'appetizer',
  MAIN_COURSE = 'main_course',
  DESSERT = 'dessert',
  BEVERAGE = 'beverage',
  SIDE_DISH = 'side_dish',
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
  spicyLevel?: SpicyLevel;
  isVegan: boolean;
  isVegetarian: boolean;
  isGlutenFree: boolean;
  allergens: string[];
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
