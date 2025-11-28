/**
 * Tests CRÍTICOS para Recommendation.Service
 * Epic #34 - Task #41: Testing exhaustivo de casos de alergia
 * 
 * IMPORTANTE: Los tests de seguridad alimentaria son CRÍTICOS.
 * DEBE pasar el 100% de estos tests antes de deployment.
 * Se agregaron test para la restricciones dietarias en ingles por si falla en el idioma el modelo.
 */

import { RecommendationService } from '../../services/recommendation.service';
import { MenuItemRepository } from '../../repositories/menuItem.repository';
import { RecommendationParams } from '../../interfaces/recommendation.interface';
import { MenuItem, MenuCategory, SpicyLevel } from '../../models/menuItem.model';

// Mock del repository
jest.mock('../../repositories/menuItem.repository');

describe('RecommendationService - CRITICAL SAFETY TESTS', () => {
  let service: RecommendationService;
  let mockRepository: jest.Mocked<MenuItemRepository>;

  // Mock dishes para testing
  const mockDishSeeds: Array<Omit<MenuItem, 'id' | 'createdAt'>> = [
    {
    name: 'Ensalada César',
    description: 'Lechuga romana, crutones, queso parmesano y aderezo césar casero',
    price: 8500,
    currency: 'ARS',
    category: MenuCategory.APPETIZER,
    imageUrl: '/images/dishes/ensalada-cesar.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: false,
    isLactoseFree: false,
    allergens: ['gluten', 'lácteos', 'huevo'],
    tags: ['clásico', 'tradicional'],
    available: true,
  },
  {
    name: 'Bruschetta Caprese',
    description: 'Pan tostado con tomate fresco, mozzarella, albahaca y aceite de oliva',
    price: 7500,
    currency: 'ARS',
    category: MenuCategory.APPETIZER,
    imageUrl: '/images/dishes/bruschetta-caprese.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: false,
    isLactoseFree: false,
    allergens: ['gluten', 'lácteos'],
    tags: ['ligero', 'fresco', 'italiano'],
    available: true,
  },
  {
    name: 'Spring Rolls Veganos',
    description: 'Rollitos de vegetales frescos con salsa agridulce',
    price: 6900,
    currency: 'ARS',
    category: MenuCategory.APPETIZER,
    imageUrl: '/images/dishes/spring-rolls-veganos.jpg',
    spicyLevel: SpicyLevel.MILD,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isLactoseFree: true,
    allergens: ['soja'],
    tags: ['ligero', 'fresco', 'asiático'],
    available: true,
  },
  {
    name: 'Empanadas de Carne',
    description: 'Empanadas caseras rellenas de carne especiada (3 unidades)',
    price: 9200,
    currency: 'ARS',
    category: MenuCategory.APPETIZER,
    imageUrl: '/images/dishes/empanadas-carne.jpg',
    spicyLevel: SpicyLevel.MILD,
    isVegan: false,
    isVegetarian: false,
    isGlutenFree: false,
    isLactoseFree: true,
    allergens: ['gluten'],
    tags: ['tradicional', 'casero', 'argentino'],
    available: true,
  },
  {
    name: 'Hummus con Crudités',
    description: 'Hummus de garbanzos con vegetales crudos y pan pita',
    price: 6500,
    currency: 'ARS',
    category: MenuCategory.APPETIZER,
    imageUrl: '/images/dishes/hummus-crudites.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: false,
    isLactoseFree: true,
    allergens: ['gluten', 'sésamo'],
    tags: ['ligero', 'fresco', 'medio-oriente'],
    available: true,
  },
  {
    name: 'Tabla de Quesos Artesanales',
    description: 'Selección de 4 quesos artesanales con frutos secos y miel',
    price: 12500,
    currency: 'ARS',
    category: MenuCategory.APPETIZER,
    imageUrl: '/images/dishes/tabla-quesos-artesanales.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: true,
    isLactoseFree: false,
    allergens: ['lácteos', 'frutos secos'],
    tags: ['gourmet', 'abundante'],
    available: true,
  },
  {
    name: 'Ceviche de Pescado',
    description: 'Pescado blanco marinado en limón con cebolla morada, cilantro y maíz',
    price: 11500,
    currency: 'ARS',
    category: MenuCategory.APPETIZER,
    imageUrl: '/images/dishes/ceviche-pescado.jpg',
    spicyLevel: SpicyLevel.MILD,
    isVegan: false,
    isVegetarian: false,
    isGlutenFree: true,
    isLactoseFree: true,
    allergens: ['pescado'],
    tags: ['ligero', 'fresco', 'peruano'],
    available: true,
  },
  {
    name: 'Provoleta a la Parrilla',
    description: 'Queso provolone grillado con orégano y aceite de oliva',
    price: 8900,
    currency: 'ARS',
    category: MenuCategory.APPETIZER,
    imageUrl: '/images/dishes/provoleta-parrilla.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: true,
    isLactoseFree: false,
    allergens: ['lácteos'],
    tags: ['argentino', 'tradicional', 'rápido'],
    available: true,
  },
  {
    name: 'Gyozas de Cerdo',
    description: 'Dumplings japoneses rellenos de cerdo y vegetales (6 unidades)',
    price: 9800,
    currency: 'ARS',
    category: MenuCategory.APPETIZER,
    imageUrl: '/images/dishes/gyozas-cerdo.jpg',
    spicyLevel: SpicyLevel.MILD,
    isVegan: false,
    isVegetarian: false,
    isGlutenFree: false,
    isLactoseFree: true,
    allergens: ['gluten', 'soja'],
    tags: ['asiático', 'gourmet'],
    available: true,
  },
  {
    name: 'Ensalada Caprese',
    description: 'Tomate, mozzarella de búfala, albahaca fresca y reducción de balsámico',
    price: 8200,
    currency: 'ARS',
    category: MenuCategory.APPETIZER,
    imageUrl: '/images/dishes/ensalada-caprese.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: true,
    isLactoseFree: false,
    allergens: ['lácteos'],
    tags: ['ligero', 'fresco', 'italiano'],
    available: true,
  },
  {
    name: 'Sopa de Calabaza',
    description: 'Crema de calabaza con jengibre y crutones de pan',
    price: 7800,
    currency: 'ARS',
    category: MenuCategory.APPETIZER,
    imageUrl: '/images/dishes/sopa-calabaza.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: false,
    isLactoseFree: false,
    allergens: ['gluten', 'lácteos'],
    tags: ['casero', 'reconfortante'],
    available: true,
  },
  {
    name: 'Aguacate Relleno',
    description: 'Medio aguacate relleno con quinoa, tomate y limón',
    price: 8500,
    currency: 'ARS',
    category: MenuCategory.APPETIZER,
    imageUrl: '/images/dishes/aguacate-relleno.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isLactoseFree: true,
    allergens: [],
    tags: ['ligero', 'fresco', 'saludable'],
    available: true,
  },
  {
    name: 'Carpaccio de Res',
    description: 'Finas láminas de carne con rúcula, parmesano y aceite de trufa',
    price: 13500,
    currency: 'ARS',
    category: MenuCategory.APPETIZER,
    imageUrl: '/images/dishes/carpaccio-res.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: false,
    isVegetarian: false,
    isGlutenFree: true,
    isLactoseFree: false,
    allergens: ['lácteos'],
    tags: ['gourmet', 'ligero'],
    available: true,
  },
  {
    name: 'Bastones de Mozzarella',
    description: 'Palitos de mozzarella empanados con salsa marinara (6 unidades)',
    price: 8800,
    currency: 'ARS',
    category: MenuCategory.APPETIZER,
    imageUrl: '/images/dishes/bastones-mozzarella.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: false,
    isLactoseFree: false,
    allergens: ['gluten', 'lácteos', 'huevo'],
    tags: ['rápido', 'tradicional'],
    available: true,
  },
  {
    name: 'Ensalada Griega',
    description: 'Tomate, pepino, aceitunas, queso feta, cebolla y orégano',
    price: 8900,
    currency: 'ARS',
    category: MenuCategory.APPETIZER,
    imageUrl: '/images/dishes/ensalada-griega.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: true,
    isLactoseFree: false,
    allergens: ['lácteos'],
    tags: ['ligero', 'fresco', 'mediterráneo'],
    available: true,
  },
  {
    name: 'Tacos de Hongos',
    description: 'Tacos vegetarianos con hongos salteados, guacamole y pico de gallo (3 unidades)',
    price: 9500,
    currency: 'ARS',
    category: MenuCategory.APPETIZER,
    imageUrl: '/images/dishes/tacos-hongos.jpg',
    spicyLevel: SpicyLevel.MEDIUM,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isLactoseFree: true,
    allergens: [],
    tags: ['mexicano', 'fresco', 'rápido'],
    available: true,
  },
  {
    name: 'Camarones al Ajillo',
    description: 'Camarones salteados en aceite de oliva, ajo y perejil',
    price: 14500,
    currency: 'ARS',
    category: MenuCategory.APPETIZER,
    imageUrl: '/images/dishes/camarones-ajillo.jpg',
    spicyLevel: SpicyLevel.MILD,
    isVegan: false,
    isVegetarian: false,
    isGlutenFree: true,
    isLactoseFree: true,
    allergens: ['mariscos'],
    tags: ['gourmet', 'rápido'],
    available: true,
  },
  {
    name: 'Baba Ganoush',
    description: 'Puré de berenjena ahumada con tahini, ajo y pan pita',
    price: 7200,
    currency: 'ARS',
    category: MenuCategory.APPETIZER,
    imageUrl: '/images/dishes/baba-ganoush.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: false,
    isLactoseFree: true,
    allergens: ['gluten', 'sésamo'],
    tags: ['ligero', 'medio-oriente', 'fresco'],
    available: true,
  },
  {
    name: 'Alcachofas a la Romana',
    description: 'Alcachofas fritas estilo romano con limón',
    price: 10500,
    currency: 'ARS',
    category: MenuCategory.APPETIZER,
    imageUrl: '/images/dishes/alcachofas-romana.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: false,
    isLactoseFree: true,
    allergens: ['gluten'],
    tags: ['italiano', 'gourmet'],
    available: true,
  },
  {
    name: 'Sopa de Miso',
    description: 'Sopa japonesa con tofu, algas wakame y cebollín',
    price: 6500,
    currency: 'ARS',
    category: MenuCategory.APPETIZER,
    imageUrl: '/images/dishes/sopa-miso.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: false,
    isLactoseFree: true,
    allergens: ['soja'],
    tags: ['ligero', 'asiático', 'rápido'],
    available: true,
  },
  {
    name: 'Champiñones Rellenos',
    description: 'Champiñones portobello rellenos con espinaca, queso de cabra y nueces',
    price: 9800,
    currency: 'ARS',
    category: MenuCategory.APPETIZER,
    imageUrl: '/images/dishes/champinones-rellenos.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: true,
    isLactoseFree: false,
    allergens: ['lácteos', 'frutos secos'],
    tags: ['gourmet', 'ligero'],
    available: true,
  },

  // ========================================
  // PLATOS PRINCIPALES (Main Course) - 8 platos
  // ========================================
  {
    name: 'Pizza Margarita',
    description: 'Salsa de tomate, mozzarella fresca, albahaca y aceite de oliva',
    price: 14500,
    currency: 'ARS',
    category: MenuCategory.MAIN_COURSE,
    imageUrl: '/images/dishes/pizza-margarita.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: false,
    isLactoseFree: false,
    allergens: ['gluten', 'lácteos'],
    tags: ['italiano', 'clásico', 'abundante'],
    available: true,
  },
  {
    name: 'Milanesa Napolitana',
    description: 'Milanesa de ternera cubierta con jamón, tomate y queso, con papas fritas',
    price: 21500,
    currency: 'ARS',
    category: MenuCategory.MAIN_COURSE,
    imageUrl: '/images/dishes/milanesa-napolitana.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: false,
    isVegetarian: false,
    isGlutenFree: false,
    isLactoseFree: false,
    allergens: ['gluten', 'lácteos', 'huevo'],
    tags: ['argentino', 'tradicional', 'abundante'],
    available: true,
  },
  {
    name: 'Risotto de Hongos',
    description: 'Arroz arborio cremoso con mix de hongos y queso parmesano',
    price: 18900,
    currency: 'ARS',
    category: MenuCategory.MAIN_COURSE,
    imageUrl: '/images/dishes/risotto-hongos.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: true,
    isLactoseFree: false,
    allergens: ['lácteos'],
    tags: ['italiano', 'gourmet', 'cremoso'],
    available: true,
  },
  {
    name: 'Curry Tailandés de Vegetales',
    description: 'Curry rojo picante con vegetales frescos, leche de coco y arroz jazmín',
    price: 16500,
    currency: 'ARS',
    category: MenuCategory.MAIN_COURSE,
    imageUrl: '/images/dishes/curry-tailandes-vegetales.jpg',
    spicyLevel: SpicyLevel.HOT,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isLactoseFree: true,
    allergens: [],
    tags: ['asiático', 'picante', 'abundante'],
    available: true,
  },
  {
    name: 'Salmón a la Plancha',
    description: 'Filet de salmón con puré de calabaza y espárragos grillados',
    price: 26500,
    currency: 'ARS',
    category: MenuCategory.MAIN_COURSE,
    imageUrl: '/images/dishes/salmon-plancha.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: false,
    isVegetarian: false,
    isGlutenFree: true,
    isLactoseFree: true,
    allergens: ['pescado'],
    tags: ['gourmet', 'ligero', 'saludable'],
    available: true,
  },
  {
    name: 'Hamburguesa Clásica',
    description: 'Carne de res 200g, lechuga, tomate, cebolla, queso cheddar y papas fritas',
    price: 17500,
    currency: 'ARS',
    category: MenuCategory.MAIN_COURSE,
    imageUrl: '/images/dishes/hamburguesa-clasica.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: false,
    isVegetarian: false,
    isGlutenFree: false,
    isLactoseFree: false,
    allergens: ['gluten', 'lácteos'],
    tags: ['clásico', 'abundante', 'rápido'],
    available: true,
  },
  {
    name: 'Pasta Carbonara',
    description: 'Spaghetti con panceta, huevo, queso parmesano y pimienta negra',
    price: 15900,
    currency: 'ARS',
    category: MenuCategory.MAIN_COURSE,
    imageUrl: '/images/dishes/pasta-carbonara.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: false,
    isVegetarian: false,
    isGlutenFree: false,
    isLactoseFree: false,
    allergens: ['gluten', 'lácteos', 'huevo'],
    tags: ['italiano', 'clásico', 'cremoso'],
    available: true,
  },
  {
    name: 'Bowl Vegano de Quinoa',
    description: 'Quinoa, garbanzos especiados, aguacate, vegetales asados y tahini',
    price: 15500,
    currency: 'ARS',
    category: MenuCategory.MAIN_COURSE,
    imageUrl: '/images/dishes/bowl-vegano-quinoa.jpg',
    spicyLevel: SpicyLevel.MILD,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isLactoseFree: true,
    allergens: ['sésamo'],
    tags: ['saludable', 'ligero', 'fresco'],
    available: true,
  },

  // ========================================
  // POSTRES (Desserts) - 4 platos
  // ========================================
  {
    name: 'Tarta de Manzana',
    description: 'Tarta casera de manzana con helado de vainilla',
    price: 8900,
    currency: 'ARS',
    category: MenuCategory.DESSERT,
    imageUrl: '/images/dishes/tarta-manzana.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: false,
    isLactoseFree: false,
    allergens: ['gluten', 'lácteos', 'huevo'],
    tags: ['casero', 'tradicional', 'dulce'],
    available: true,
  },
  {
    name: 'Brownie con Helado',
    description: 'Brownie de chocolate tibio con helado de chocolate y salsa de dulce de leche',
    price: 9500,
    currency: 'ARS',
    category: MenuCategory.DESSERT,
    imageUrl: '/images/dishes/brownie-helado.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: false,
    isLactoseFree: false,
    allergens: ['gluten', 'lácteos', 'huevo', 'frutos secos'],
    tags: ['gourmet', 'abundante', 'dulce'],
    available: true,
  },
  {
    name: 'Flan Casero',
    description: 'Flan de vainilla con caramelo y crema',
    price: 7200,
    currency: 'ARS',
    category: MenuCategory.DESSERT,
    imageUrl: '/images/dishes/flan-casero.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: true,
    isLactoseFree: false,
    allergens: ['lácteos', 'huevo'],
    tags: ['casero', 'tradicional', 'ligero'],
    available: true,
  },
  {
    name: 'Helado Vegano de Frutas',
    description: 'Helado a base de leche de coco con frutas frescas',
    price: 6800,
    currency: 'ARS',
    category: MenuCategory.DESSERT,
    imageUrl: '/images/dishes/helado-vegano-frutas.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isLactoseFree: true,
    allergens: [],
    tags: ['fresco', 'ligero', 'dulce'],
    available: true,
  },

  // ========================================
  // BEBIDAS (Beverages) - 18 platos
  // ========================================
  {
    name: 'Limonada Natural',
    description: 'Limonada fresca con menta y jengibre',
    price: 5500,
    currency: 'ARS',
    category: MenuCategory.BEVERAGE,
    imageUrl: '/images/dishes/limonada-natural.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isLactoseFree: true,
    allergens: [],
    tags: ['fresco', 'ligero', 'rápido'],
    available: true,
  },
  {
    name: 'Smoothie de Frutas Tropicales',
    description: 'Mango, piña, maracuyá y leche de coco',
    price: 7800,
    currency: 'ARS',
    category: MenuCategory.BEVERAGE,
    imageUrl: '/images/dishes/smoothie-frutas-tropicales.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isLactoseFree: true,
    allergens: [],
    tags: ['fresco', 'tropical', 'dulce'],
    available: true,
  },
  {
    name: 'Cerveza Artesanal IPA',
    description: 'Cerveza IPA local de 500ml',
    price: 8900,
    currency: 'ARS',
    category: MenuCategory.BEVERAGE,
    imageUrl: '/images/dishes/cerveza-artesanal-ipa.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: false,
    isLactoseFree: true,
    allergens: ['gluten'],
    tags: ['artesanal', 'local'],
    available: true,
  },
  {
    name: 'Café Espresso',
    description: 'Café espresso doble de origen colombiano',
    price: 4200,
    currency: 'ARS',
    category: MenuCategory.BEVERAGE,
    imageUrl: '/images/dishes/cafe-espresso.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isLactoseFree: true,
    allergens: [],
    tags: ['rápido', 'fuerte'],
    available: true,
  },
  {
    name: 'Coca-Cola',
    description: 'Coca-Cola 500ml',
    price: 3500,
    currency: 'ARS',
    category: MenuCategory.BEVERAGE,
    imageUrl: '/images/dishes/coca-cola.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isLactoseFree: true,
    allergens: [],
    tags: ['gaseosa', 'clásico'],
    available: true,
  },
  {
    name: 'Sprite',
    description: 'Sprite lima-limón 500ml',
    price: 3500,
    currency: 'ARS',
    category: MenuCategory.BEVERAGE,
    imageUrl: '/images/dishes/sprite.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isLactoseFree: true,
    allergens: [],
    tags: ['gaseosa', 'cítrico'],
    available: true,
  },
  {
    name: 'Fanta',
    description: 'Fanta naranja 500ml',
    price: 3500,
    currency: 'ARS',
    category: MenuCategory.BEVERAGE,
    imageUrl: '/images/dishes/fanta.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isLactoseFree: true,
    allergens: [],
    tags: ['gaseosa', 'naranja'],
    available: true,
  },
  {
    name: 'Agua Mineral con Gas',
    description: 'Agua mineralizada con gas 500ml',
    price: 2800,
    currency: 'ARS',
    category: MenuCategory.BEVERAGE,
    imageUrl: '/images/dishes/agua-mineral-gas.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isLactoseFree: true,
    allergens: [],
    tags: ['ligero', 'refrescante'],
    available: true,
  },
  {
    name: 'Agua Mineral sin Gas',
    description: 'Agua mineral natural 500ml',
    price: 2500,
    currency: 'ARS',
    category: MenuCategory.BEVERAGE,
    imageUrl: '/images/dishes/agua-mineral-sin-gas.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isLactoseFree: true,
    allergens: [],
    tags: ['ligero', 'natural'],
    available: true,
  },
  {
    name: 'Jugo de Naranja Natural',
    description: 'Jugo de naranja recién exprimido',
    price: 6500,
    currency: 'ARS',
    category: MenuCategory.BEVERAGE,
    imageUrl: '/images/dishes/jugo-naranja-natural.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isLactoseFree: true,
    allergens: [],
    tags: ['fresco', 'natural', 'vitamina C'],
    available: true,
  },
  {
    name: 'Té Helado',
    description: 'Té negro helado con limón y menta',
    price: 5200,
    currency: 'ARS',
    category: MenuCategory.BEVERAGE,
    imageUrl: '/images/dishes/te-helado.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isLactoseFree: true,
    allergens: [],
    tags: ['refrescante', 'ligero'],
    available: true,
  },
  {
    name: 'Vino Tinto Malbec',
    description: 'Copa de vino tinto Malbec argentino',
    price: 9500,
    currency: 'ARS',
    category: MenuCategory.BEVERAGE,
    imageUrl: '/images/dishes/vino-tinto-malbec.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isLactoseFree: true,
    allergens: ['sulfitos'],
    tags: ['argentino', 'vino'],
    available: true,
  },
  {
    name: 'Vino Blanco',
    description: 'Copa de vino blanco Torrontés',
    price: 8800,
    currency: 'ARS',
    category: MenuCategory.BEVERAGE,
    imageUrl: '/images/dishes/vino-blanco.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isLactoseFree: true,
    allergens: ['sulfitos'],
    tags: ['argentino', 'vino', 'fresco'],
    available: true,
  },
  {
    name: 'Cappuccino',
    description: 'Café cappuccino con espuma de leche',
    price: 5800,
    currency: 'ARS',
    category: MenuCategory.BEVERAGE,
    imageUrl: '/images/dishes/cappuccino.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: true,
    isLactoseFree: false,
    allergens: ['lácteos'],
    tags: ['café', 'cremoso'],
    available: true,
  },
  {
    name: 'Café Latte',
    description: 'Café con leche cremosa',
    price: 5500,
    currency: 'ARS',
    category: MenuCategory.BEVERAGE,
    imageUrl: '/images/dishes/cafe-latte.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: true,
    isLactoseFree: false,
    allergens: ['lácteos'],
    tags: ['café', 'suave'],
    available: true,
  },
  {
    name: 'Mojito',
    description: 'Cóctel de ron, menta, lima y soda',
    price: 12500,
    currency: 'ARS',
    category: MenuCategory.BEVERAGE,
    imageUrl: '/images/dishes/mojito.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isLactoseFree: true,
    allergens: [],
    tags: ['cóctel', 'refrescante', 'menta'],
    available: true,
  },
  {
    name: 'Tequila Daisy',
    description: 'Cóctel clásico de tequila con lima y sal',
    price: 13500,
    currency: 'ARS',
    category: MenuCategory.BEVERAGE,
    imageUrl: '/images/dishes/margarita.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isLactoseFree: true,
    allergens: [],
    tags: ['cóctel', 'cítrico'],
    available: true,
  },
  {
    name: 'Cerveza Quilmes',
    description: 'Cerveza Quilmes 1L',
    price: 6500,
    currency: 'ARS',
    category: MenuCategory.BEVERAGE,
    imageUrl: '/images/dishes/cerveza-quilmes.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: false,
    isLactoseFree: true,
    allergens: ['gluten'],
    tags: ['cerveza', 'argentina', 'clásico'],
    available: true,
  },
  
  // ========================================
  // ACOMPAÑAMIENTO (SIDE_DISH) - 3 platos
  // ========================================
  {
    name: 'Papas Fritas',
    description: 'Porción de papas fritas caseras.',
    price: 1000,
    currency: 'ARS',
    category: MenuCategory.SIDE_DISH,
    imageUrl: '/images/dishes/papas-fritas.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isLactoseFree: true,
    allergens: [],
    available: true,
  },
  {
    name: 'Ensalada Mixta',
    description: 'Lechuga, tomate, zanahoria y cebolla con aceite y vinagre.',
    price: 900,
    currency: 'ARS',
    category: MenuCategory.SIDE_DISH,
    imageUrl: '/images/dishes/ensalada-mixta.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isLactoseFree: true,
    allergens: [],
    available: true,
  },
  {
    name: 'Puré de Papas',
    description: 'Puré de papas cremoso con manteca y leche.',
    price: 1100,
    currency: 'ARS',
    category: MenuCategory.SIDE_DISH,
    imageUrl: '/images/dishes/pure-papas.jpg',
    spicyLevel: SpicyLevel.NONE,
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: true,
    isLactoseFree: false,
    allergens: ['lácteos'],
    available: true,
  },
  ];

  const mockDishCreatedAt = new Date('2024-01-01T00:00:00Z');

  const mockDishes: MenuItem[] = mockDishSeeds.map((dish, index) => ({
    ...dish,
    id: `mock-dish-${index + 1}`,
    createdAt: mockDishCreatedAt,
  }));

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock repository method
    mockRepository = {
      findAllAvailable: jest.fn().mockResolvedValue(mockDishes),
    } as any;

    // Mock MenuItemRepository constructor
    (MenuItemRepository as jest.MockedClass<typeof MenuItemRepository>).mockImplementation(() => mockRepository as any);

    // Create service (it will use the mocked repository)
    service = new RecommendationService();
  });

  describe('🚨 CRÍTICO: Filtrado de alérgenos', () => {
    it('Nunca se deberían recomendar platos con alergia declarada a los mariscos.', async () => {
      const params: RecommendationParams = {
        allergies: ['mariscos'],
        dietaryRestrictions: [],
        budget: { min: 0, max: 5000 },
        preferences: {},
      };

      const recommendations = await service.generateRecommendations(params);

      // CRITICAL: No debe haber NINGÚN plato con mariscos
      recommendations.forEach((rec) => {
        expect(rec.dish.allergens).not.toContain('mariscos');
        // Verificar que hay al menos un safety check que pasó
        const allergenChecks = rec.safetyChecks.filter(c => c.type === 'allergen');
        expect(allergenChecks.every(c => c.passed)).toBe(true);
      });

      // Verificar que los camarones fueron rechazados
      const dishNames = recommendations.map((r) => r.dish.name);
      expect(dishNames).not.toContain('Camarones al Ajillo');
    });

    it('Nunca se deberían recomendar platos con múltiples alergias.', async () => {
      const params: RecommendationParams = {
        allergies: ['frutos secos', 'lácteos'], // Alérgico a nueces Y lácteos
        dietaryRestrictions: [],
        budget: { min: 0, max: 5000 },
        preferences: {},
      };

      const recommendations = await service.generateRecommendations(params);

      // CRITICAL: No debe haber NINGÚN plato con frutos secos O lácteos
      recommendations.forEach((rec) => {
        expect(rec.dish.allergens).not.toContain('frutos secos');
        expect(rec.dish.allergens).not.toContain('lácteos');
      });

      // Verificar que platos con queso o frutos secos fueron rechazados
      const dishNames = recommendations.map((r) => r.dish.name);
      expect(dishNames).not.toContain('Tabla de Quesos Artesanales');
      expect(dishNames).not.toContain('Brownie con Helado');
      expect(dishNames).not.toContain('Pizza Margarita');
      expect(dishNames).not.toContain('Pasta Carbonara');
    });

    it('Debería manejar correctamente todos los alérgenos comunes.', async () => {
      const commonAllergens = ['gluten', 'lácteos', 'huevo', 'pescado', 'mariscos', 'soja', 'sésamo', 'frutos secos'];

      for (const allergen of commonAllergens) {
        const params: RecommendationParams = {
          allergies: [allergen],
          dietaryRestrictions: [],
          budget: { min: 0, max: 5000 },
          preferences: {},
        };

        const recommendations = await service.generateRecommendations(params);

        // CRITICAL: NINGUNA recomendación debe contener el alérgeno
        recommendations.forEach((rec) => {
          expect(rec.dish.allergens).not.toContain(allergen);
        });
      }
    });

    it('Debe rechazar todos los platos que no sean seguros si es alérgico a varios alimentos.', async () => {
      const params: RecommendationParams = {
        allergies: ['frutos secos', 'mariscos', 'pescado', 'huevo', 'lácteos', 'gluten', 'soja', 'sésamo'],
        dietaryRestrictions: [],
        budget: { min: 0, max: 5000 },
        preferences: {},
      };

      const recommendations = await service.generateRecommendations(params);

      // Solo deben quedar platos SIN los alérgenos declarados
      expect(recommendations.length).toBeLessThanOrEqual(3);
      recommendations.forEach((rec) => {
        const dishAllergens = rec.dish.allergens.map(a => a.toLowerCase());
        expect(
          dishAllergens.every(
            allergen => !params.allergies!.some(userAllergen => allergen.includes(userAllergen))
          )
        ).toBe(true);
      });
    });
  });

  describe('🥗 IMPORTANTE: Restricciones dietéticas', () => {
    it('Solo se deberían recomendar platos veganos para una dieta vegana.', async () => {
      const params: RecommendationParams = {
        allergies: [],
        dietaryRestrictions: ['vegano'],
        budget: { min: 0, max: 5000 },
        preferences: {},
      };

      const recommendations = await service.generateRecommendations(params);

      // CRITICAL: TODOS los platos deben ser veganos
      recommendations.forEach((rec) => {
        expect(rec.dish.isVegan).toBe(true);
      });

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.length).toBeLessThanOrEqual(3);
    });

    it('Solo se deberían recomendar platos veganos para una dieta vegana. [EN]', async () => {
      const params: RecommendationParams = {
        allergies: [],
        dietaryRestrictions: ['vegan'],
        budget: { min: 0, max: 5000 },
        preferences: {},
      };

      const recommendations = await service.generateRecommendations(params);

      // CRITICAL: TODOS los platos deben ser veganos
      recommendations.forEach((rec) => {
        expect(rec.dish.isVegan).toBe(true);
      });

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.length).toBeLessThanOrEqual(3);
    });

    it('Solo se deben recomendar platos vegetarianos para una dieta vegetariana.', async () => {
      const params: RecommendationParams = {
        allergies: [],
        dietaryRestrictions: ['vegetariano'],
        budget: { min: 0, max: 5000 },
        preferences: {},
      };

      const recommendations = await service.generateRecommendations(params);

      // CRITICAL: TODOS los platos deben ser vegetarianos
      recommendations.forEach((rec) => {
        expect(rec.dish.isVegetarian).toBe(true);
      });

      // No deben aparecer platos con carne o pescado
      const dishNames = recommendations.map((r) => r.dish.name);
      expect(dishNames).not.toContain('Empanadas de Carne');
      expect(dishNames).not.toContain('Pasta Carbonara');
      expect(dishNames).not.toContain('Salmón a la Parrilla');
      expect(dishNames).not.toContain('Hamburguesa Clásica');
    });

    it('Solo se deben recomendar platos vegetarianos para una dieta vegetariana. [EN]', async () => {
      const params: RecommendationParams = {
        allergies: [],
        dietaryRestrictions: ['vegetarian'],
        budget: { min: 0, max: 5000 },
        preferences: {},
      };

      const recommendations = await service.generateRecommendations(params);

      // CRITICAL: TODOS los platos deben ser vegetarianos
      recommendations.forEach((rec) => {
        expect(rec.dish.isVegetarian).toBe(true);
      });

      // No deben aparecer platos con carne o pescado
      const dishNames = recommendations.map((r) => r.dish.name);
      expect(dishNames).not.toContain('Empanadas de Carne');
      expect(dishNames).not.toContain('Pasta Carbonara');
      expect(dishNames).not.toContain('Salmón a la Parrilla');
      expect(dishNames).not.toContain('Hamburguesa Clásica');
    });

    it('Solo se deben recomendar platos sin gluten para la dieta celíaca.', async () => {
      const params: RecommendationParams = {
        allergies: [],
        dietaryRestrictions: ['sin-gluten'],
        budget: { min: 0, max: 5000 },
        preferences: {},
      };

      const recommendations = await service.generateRecommendations(params);

      // CRITICAL: TODOS los platos deben ser sin gluten
      recommendations.forEach((rec) => {
        expect(rec.dish.isGlutenFree).toBe(true);
      });

      // No deben aparecer platos con gluten
      const dishNames = recommendations.map((r) => r.dish.name);
      expect(dishNames).not.toContain('Pasta Carbonara');
      expect(dishNames).not.toContain('Pizza Margarita');
      expect(dishNames).not.toContain('Brownie con Helado');
      expect(dishNames).not.toContain('Empanadas de Carne');
    });

    it('Solo se deben recomendar platos sin gluten para la dieta celíaca. [EN]', async () => {
      const params: RecommendationParams = {
        allergies: [],
        dietaryRestrictions: ['gluten-free'],
        budget: { min: 0, max: 5000 },
        preferences: {},
      };

      const recommendations = await service.generateRecommendations(params);

      // CRITICAL: TODOS los platos deben ser sin gluten
      recommendations.forEach((rec) => {
        expect(rec.dish.isGlutenFree).toBe(true);
      });

      // No deben aparecer platos con gluten
      const dishNames = recommendations.map((r) => r.dish.name);
      expect(dishNames).not.toContain('Pasta Carbonara');
      expect(dishNames).not.toContain('Pizza Margarita');
      expect(dishNames).not.toContain('Brownie con Helado');
      expect(dishNames).not.toContain('Empanadas de Carne');
    });

    it('Debería manejar restricciones COMBINADAS (vegano + sin-gluten)', async () => {
      const params: RecommendationParams = {
        allergies: [],
        dietaryRestrictions: ['vegano', 'sin-gluten'],
        budget: { min: 0, max: 5000 },
        preferences: {},
      };

      const recommendations = await service.generateRecommendations(params);

      // CRITICAL: Debe cumplir AMBAS restricciones (AND lógico)
      recommendations.forEach((rec) => {
        expect(rec.dish.isVegan).toBe(true);
        expect(rec.dish.isGlutenFree).toBe(true);
      });

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.length).toBeLessThanOrEqual(3);
    });

    it('Debería manejar restricciones COMBINADAS (vegan + gluten-free) [EN]', async () => {
      const params: RecommendationParams = {
        allergies: [],
        dietaryRestrictions: ['vegan', 'gluten-free'],
        budget: { min: 0, max: 5000 },
        preferences: {},
      };

      const recommendations = await service.generateRecommendations(params);

      // CRITICAL: Debe cumplir AMBAS restricciones (AND lógico)
      recommendations.forEach((rec) => {
        expect(rec.dish.isVegan).toBe(true);
        expect(rec.dish.isGlutenFree).toBe(true);
      });

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.length).toBeLessThanOrEqual(3);
    });
  });

  describe('🔒 CRÍTICO: Filtros de seguridad combinados', () => {
    it('Deberían abordar las alergias y las restricciones dietéticas juntas.', async () => {
      const params: RecommendationParams = {
        allergies: ['lácteos'],
        dietaryRestrictions: ['vegetariano'],
        budget: { min: 0, max: 5000 },
        preferences: {},
      };

      const recommendations = await service.generateRecommendations(params);

      // CRITICAL: Debe cumplir AMBOS filtros
      recommendations.forEach((rec) => {
        expect(rec.dish.allergens).not.toContain('lácteos');
        expect(rec.dish.isVegetarian).toBe(true);
      });

      // Validar que platos con lácteos no se recomienden
      const dishNames = recommendations.map((r) => r.dish.name);
      expect(dishNames).not.toContain('Pizza Margarita');
      expect(dishNames).not.toContain('Ensalada César');
      expect(dishNames).not.toContain('Tabla de Quesos Artesanales');
    });

    it('Nunca se deben recomendar platos no disponibles, independientemente de otros factores.', async () => {
      const unavailableDish = {
        ...mockDishes[0],
        id: 'mock-unavailable-1',
        name: 'Especial fuera de menú',
        available: false,
      };
      mockRepository.findAllAvailable.mockResolvedValueOnce([
        ...mockDishes,
        unavailableDish,
      ]);

      const params: RecommendationParams = {
        allergies: [],
        dietaryRestrictions: ['vegetariano'],
        budget: { min: 0, max: 5000 },
        preferences: {},
      };

      const recommendations = await service.generateRecommendations(params);

      // CRITICAL: TODOS los platos deben estar disponibles
      recommendations.forEach((rec) => {
        expect(rec.dish.available).toBe(true);
      });

      const dishNames = recommendations.map((r) => r.dish.name);
      expect(dishNames).not.toContain('Especial fuera de menú');
    });

    it('Debería devolver un array vacío o platos seguros cuando existan restricciones extremas.', async () => {
      const params: RecommendationParams = {
        allergies: ['mariscos', 'pescado', 'huevo', 'lácteos', 'gluten', 'frutos secos'],
        dietaryRestrictions: [],
        budget: { min: 0, max: 5000 },
        preferences: {},
      };

      const recommendations = await service.generateRecommendations(params);

      // Debe devolver array
      expect(Array.isArray(recommendations)).toBe(true);

      // Si hay recomendaciones, TODAS deben cumplir seguridad
      recommendations.forEach((rec) => {
        const allergenChecks = rec.safetyChecks.filter(c => c.type === 'allergen' && c.passed);
        expect(allergenChecks.length).toBeGreaterThan(0);
      });
    });
  });

  describe('📊 Calidad de la puntuación y la clasificación', () => {
    it('Debería devolver un máximo de 3 recomendaciones.', async () => {
      const params: RecommendationParams = {
        allergies: [],
        dietaryRestrictions: [],
        budget: { min: 0, max: 15000 },
        preferences: {},
      };

      const recommendations = await service.generateRecommendations(params);

      expect(recommendations.length).toBeLessThanOrEqual(3);
    });

    it('Debe incluirse un desglose de la puntuación para todas las recomendaciones.', async () => {
      const params: RecommendationParams = {
        allergies: [],
        dietaryRestrictions: [],
        budget: { min: 0, max: 5000 },
        preferences: {},
      };

      const recommendations = await service.generateRecommendations(params);

      recommendations.forEach((rec) => {
        expect(rec.scoreBreakdown).toBeDefined();
        expect(rec.scoreBreakdown.safety).toBeDefined();
        expect(rec.scoreBreakdown.dietaryMatch).toBeDefined();
        expect(rec.scoreBreakdown.budgetFit).toBeDefined();
        expect(rec.scoreBreakdown.preferencesMatch).toBeDefined();
        expect(rec.scoreBreakdown.availability).toBeDefined();
        expect(rec.scoreBreakdown.total).toBeDefined();
      });
    });

    it('Debería priorizar los platos que se ajusten a su presupuesto.', async () => {
      const params: RecommendationParams = {
        allergies: [],
        dietaryRestrictions: [],
        budget: { min: 4000, max: 8000 },
        preferences: {},
      };

      const recommendations = await service.generateRecommendations(params);

      // Los platos dentro del rango deben tener mejor budget score
      recommendations.forEach((rec) => {
        if (rec.dish.price >= 4000 && rec.dish.price <= 8000) {
          expect(rec.scoreBreakdown.budgetFit).toBeGreaterThan(50);
        }
      });
    });

    it('Debe incluirse una justificación para cada recomendación.', async () => {
      const params: RecommendationParams = {
        allergies: [],
        dietaryRestrictions: ['vegetariano'],
        budget: { min: 0, max: 15000 },
        preferences: {},
      };

      const recommendations = await service.generateRecommendations(params);

      recommendations.forEach((rec) => {
        expect(rec.justification).toBeDefined();
        expect(rec.justification.length).toBeGreaterThan(0);
      });
    });

    it('Debería adaptar las recomendaciones según preferencias variadas del usuario.', async () => {
      const preferenceTags = ['asiático', 'mexicano', 'fresco'];
      const favoriteIngredients = ['aguacate', 'coco'];

      const params: RecommendationParams = {
        allergies: [],
        dietaryRestrictions: [],
        budget: { min: 6000, max: 11000 },
        preferences: {
          spicyLevel: SpicyLevel.MEDIUM,
          tags: preferenceTags,
          mealType: ['entrada'],
          preferredCategories: ['entrada', 'principal'],
          favoriteIngredients,
        },
      };

      const recommendations = await service.generateRecommendations(params);

      expect(recommendations.length).toBeGreaterThan(0);

      const matchedTags = new Set<string>();
      let favoriteIngredientCovered = false;

      recommendations.forEach((rec) => {
        expect(rec.scoreBreakdown.preferencesMatch).toBeGreaterThan(60);

        const originalDish = mockDishes.find((dish) => dish.id === rec.dish.id);
        expect(originalDish).toBeDefined();

        const dishTags = (originalDish?.tags ?? []).map((tag: string) => tag.toLowerCase());
        preferenceTags.forEach((tag) => {
          if (dishTags.includes(tag)) {
            matchedTags.add(tag);
          }
        });

        const dishDescription = (originalDish?.description ?? rec.dish.description).toLowerCase();
        if (favoriteIngredients.some((ingredient) => dishDescription.includes(ingredient))) {
          favoriteIngredientCovered = true;
        }
      });

      expect(matchedTags.size).toBeGreaterThanOrEqual(2);
      expect(favoriteIngredientCovered).toBe(true);
    });

    it('Debería priorizar platos con el nivel de picante preferido.', async () => {
      const params: RecommendationParams = {
        allergies: [],
        dietaryRestrictions: [],
        budget: { min: 10000, max: 20000 },
        preferences: {
          spicyLevel: SpicyLevel.HOT,
          tags: ['picante', 'abundante'],
          mealType: ['principal'],
          preferredCategories: ['principal'],
        },
      };

      const recommendations = await service.generateRecommendations(params);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].dish.name).toBe('Curry Tailandés de Vegetales');

      const hotMatches = recommendations.filter(
        (rec) => rec.dish.spicyLevel === SpicyLevel.HOT
      );
      expect(hotMatches.length).toBeGreaterThan(0);

      recommendations.forEach((rec) => {
        expect(rec.scoreBreakdown.preferencesMatch).toBeGreaterThan(70);
      });
    });

    it('Debería priorizar categorías y tipo de comida preferidas.', async () => {
      const params: RecommendationParams = {
        allergies: [],
        dietaryRestrictions: [],
        budget: { min: 6000, max: 10000 },
        preferences: {
          mealType: ['postre'],
          preferredCategories: ['postre'],
          tags: ['dulce', 'casero'],
        },
      };

      const recommendations = await service.generateRecommendations(params);

      expect(recommendations.length).toBeGreaterThan(0);
      recommendations.forEach((rec) => {
        expect(rec.dish.category).toBe(MenuCategory.DESSERT);
        expect(rec.scoreBreakdown.preferencesMatch).toBeGreaterThan(65);
      });

      const dessertNames = recommendations.map((rec) => rec.dish.name);
      const sweetOptions = ['Helado Vegano de Frutas', 'Brownie con Helado', 'Tarta de Manzana', 'Flan Casero'];
      expect(dessertNames.some((name) => sweetOptions.includes(name))).toBe(true);
    });
  });

  describe('⚠️ Casos límite y manejo de errores', () => {
    it('Debería manejar correctamente los menús vacíos', async () => {
      mockRepository.findAllAvailable.mockResolvedValue([]);

      const params: RecommendationParams = {
        allergies: [],
        dietaryRestrictions: [],
        budget: { min: 0, max: 5000 },
        preferences: {},
      };

      // Debe lanzar error cuando no hay platos disponibles
      await expect(service.generateRecommendations(params)).rejects.toThrow('No hay platos disponibles en el menú');
    });

    it('Debería gestionar los errores del repositorio de forma elegante.', async () => {
      mockRepository.findAllAvailable.mockRejectedValue(new Error('Database connection failed'));

      const params: RecommendationParams = {
        allergies: [],
        dietaryRestrictions: [],
        budget: { min: 0, max: 5000 },
        preferences: {},
      };

      await expect(service.generateRecommendations(params)).rejects.toThrow('Database connection failed');
    });
  });

  describe('🔍 Validación de la verificación de seguridad', () => {
    it('Deberían incluirse comprobaciones de seguridad para cada recomendación', async () => {
      const params: RecommendationParams = {
        allergies: ['frutos secos'],
        dietaryRestrictions: ['vegetariano'],
        budget: { min: 0, max: 15000 },
        preferences: {},
      };

      const recommendations = await service.generateRecommendations(params);

      recommendations.forEach((rec) => {
        expect(rec.safetyChecks).toBeDefined();
        expect(Array.isArray(rec.safetyChecks)).toBe(true);
        expect(rec.safetyChecks.length).toBeGreaterThan(0);

        // Todos los safety checks deben haber pasado
        const failedChecks = rec.safetyChecks.filter(c => !c.passed);
        expect(failedChecks.length).toBe(0);
      });
    });
  });
});