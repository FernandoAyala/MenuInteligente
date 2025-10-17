import { initializeFirebase, getFirestore } from '../config/firebase.config';
import { MenuCategory, SpicyLevel } from '../models/menuItem.model';

/**
 * Seed data para la colección menuItems
 * Incluye 20 platos diversos del restaurante con diferentes categorías,
 * restricciones dietéticas y alérgenos
 */
const menuItemsSeed = [
  // ENTRADAS (Appetizers)
  {
    name: 'Ensalada César',
    description: 'Lechuga romana, crutones, queso parmesano y aderezo césar casero',
    price: 8500,
    currency: 'ARS',
    category: MenuCategory.APPETIZER,
    spicyLevel: SpicyLevel.NONE,
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: false,
    allergens: ['gluten', 'lácteos', 'huevo'],
    available: true,
  },
  {
    name: 'Bruschetta Caprese',
    description: 'Pan tostado con tomate fresco, mozzarella, albahaca y aceite de oliva',
    price: 7500,
    currency: 'ARS',
    category: MenuCategory.APPETIZER,
    spicyLevel: SpicyLevel.NONE,
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: false,
    allergens: ['gluten', 'lácteos'],
    available: true,
  },
  {
    name: 'Spring Rolls Veganos',
    description: 'Rollitos de vegetales frescos con salsa agridulce',
    price: 6900,
    currency: 'ARS',
    category: MenuCategory.APPETIZER,
    spicyLevel: SpicyLevel.MILD,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    allergens: ['soja'],
    available: true,
  },
  {
    name: 'Empanadas de Carne',
    description: 'Empanadas caseras rellenas de carne especiada (3 unidades)',
    price: 9200,
    currency: 'ARS',
    category: MenuCategory.APPETIZER,
    spicyLevel: SpicyLevel.MILD,
    isVegan: false,
    isVegetarian: false,
    isGlutenFree: false,
    allergens: ['gluten'],
    available: true,
  },

  // PLATOS PRINCIPALES (Main Course)
  {
    name: 'Pizza Margarita',
    description: 'Salsa de tomate, mozzarella fresca, albahaca y aceite de oliva',
    price: 14500,
    currency: 'ARS',
    category: MenuCategory.MAIN_COURSE,
    spicyLevel: SpicyLevel.NONE,
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: false,
    allergens: ['gluten', 'lácteos'],
    available: true,
  },
  {
    name: 'Milanesa Napolitana',
    description: 'Milanesa de ternera cubierta con jamón, tomate y queso, con papas fritas',
    price: 21500,
    currency: 'ARS',
    category: MenuCategory.MAIN_COURSE,
    spicyLevel: SpicyLevel.NONE,
    isVegan: false,
    isVegetarian: false,
    isGlutenFree: false,
    allergens: ['gluten', 'lácteos', 'huevo'],
    available: true,
  },
  {
    name: 'Risotto de Hongos',
    description: 'Arroz arborio cremoso con mix de hongos y queso parmesano',
    price: 18900,
    currency: 'ARS',
    category: MenuCategory.MAIN_COURSE,
    spicyLevel: SpicyLevel.NONE,
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: true,
    allergens: ['lácteos'],
    available: true,
  },
  {
    name: 'Curry Tailandés de Vegetales',
    description: 'Curry rojo picante con vegetales frescos, leche de coco y arroz jazmín',
    price: 16500,
    currency: 'ARS',
    category: MenuCategory.MAIN_COURSE,
    spicyLevel: SpicyLevel.HOT,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    allergens: [],
    available: true,
  },
  {
    name: 'Salmón a la Plancha',
    description: 'Filet de salmón con puré de calabaza y espárragos grillados',
    price: 26500,
    currency: 'ARS',
    category: MenuCategory.MAIN_COURSE,
    spicyLevel: SpicyLevel.NONE,
    isVegan: false,
    isVegetarian: false,
    isGlutenFree: true,
    allergens: ['pescado'],
    available: true,
  },
  {
    name: 'Hamburguesa Clásica',
    description: 'Carne de res 200g, lechuga, tomate, cebolla, queso cheddar y papas fritas',
    price: 17500,
    currency: 'ARS',
    category: MenuCategory.MAIN_COURSE,
    spicyLevel: SpicyLevel.NONE,
    isVegan: false,
    isVegetarian: false,
    isGlutenFree: false,
    allergens: ['gluten', 'lácteos'],
    available: true,
  },
  {
    name: 'Pasta Carbonara',
    description: 'Spaghetti con panceta, huevo, queso parmesano y pimienta negra',
    price: 15900,
    currency: 'ARS',
    category: MenuCategory.MAIN_COURSE,
    spicyLevel: SpicyLevel.NONE,
    isVegan: false,
    isVegetarian: false,
    isGlutenFree: false,
    allergens: ['gluten', 'lácteos', 'huevo'],
    available: true,
  },
  {
    name: 'Bowl Vegano de Quinoa',
    description: 'Quinoa, garbanzos especiados, aguacate, vegetales asados y tahini',
    price: 15500,
    currency: 'ARS',
    category: MenuCategory.MAIN_COURSE,
    spicyLevel: SpicyLevel.MILD,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    allergens: ['sésamo'],
    available: true,
  },

  // POSTRES (Desserts)
  {
    name: 'Tarta de Manzana',
    description: 'Tarta casera de manzana con helado de vainilla',
    price: 8900,
    currency: 'ARS',
    category: MenuCategory.DESSERT,
    spicyLevel: SpicyLevel.NONE,
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: false,
    allergens: ['gluten', 'lácteos', 'huevo'],
    available: true,
  },
  {
    name: 'Brownie con Helado',
    description: 'Brownie de chocolate tibio con helado de chocolate y salsa de dulce de leche',
    price: 9500,
    currency: 'ARS',
    category: MenuCategory.DESSERT,
    spicyLevel: SpicyLevel.NONE,
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: false,
    allergens: ['gluten', 'lácteos', 'huevo', 'frutos secos'],
    available: true,
  },
  {
    name: 'Flan Casero',
    description: 'Flan de vainilla con caramelo y crema',
    price: 7200,
    currency: 'ARS',
    category: MenuCategory.DESSERT,
    spicyLevel: SpicyLevel.NONE,
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: true,
    allergens: ['lácteos', 'huevo'],
    available: true,
  },
  {
    name: 'Helado Vegano de Frutas',
    description: 'Helado a base de leche de coco con frutas frescas',
    price: 6800,
    currency: 'ARS',
    category: MenuCategory.DESSERT,
    spicyLevel: SpicyLevel.NONE,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    allergens: [],
    available: true,
  },

  // BEBIDAS (Beverages)
  {
    name: 'Limonada Natural',
    description: 'Limonada fresca con menta y jengibre',
    price: 5500,
    currency: 'ARS',
    category: MenuCategory.BEVERAGE,
    spicyLevel: SpicyLevel.NONE,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    allergens: [],
    available: true,
  },
  {
    name: 'Smoothie de Frutas Tropicales',
    description: 'Mango, piña, maracuyá y leche de coco',
    price: 7800,
    currency: 'ARS',
    category: MenuCategory.BEVERAGE,
    spicyLevel: SpicyLevel.NONE,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    allergens: [],
    available: true,
  },
  {
    name: 'Cerveza Artesanal IPA',
    description: 'Cerveza IPA local de 500ml',
    price: 8900,
    currency: 'ARS',
    category: MenuCategory.BEVERAGE,
    spicyLevel: SpicyLevel.NONE,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: false,
    allergens: ['gluten'],
    available: true,
  },
  {
    name: 'Café Espresso',
    description: 'Café espresso doble de origen colombiano',
    price: 4200,
    currency: 'ARS',
    category: MenuCategory.BEVERAGE,
    spicyLevel: SpicyLevel.NONE,
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    allergens: [],
    available: true,
  },
];

/**
 * Script de seed para poblar la base de datos con platos iniciales
 */
async function seedMenuItems() {
  try {
    console.log('🌱 Iniciando seed de menuItems...\n');

    // Inicializar Firebase
    initializeFirebase();
    const db = getFirestore();

    const menuItemsCollection = db.collection('menuItems');
    let insertedCount = 0;
    let skippedCount = 0;

    for (const item of menuItemsSeed) {
      // Verificar si ya existe un item con el mismo nombre
      const existingItem = await menuItemsCollection
        .where('name', '==', item.name)
        .limit(1)
        .get();

      if (!existingItem.empty) {
        console.log(`⏭️  Saltando "${item.name}" - Ya existe`);
        skippedCount++;
        continue;
      }

      // Insertar el item con timestamp
      const docRef = await menuItemsCollection.add({
        ...item,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      console.log(`✅ Insertado: "${item.name}" (ID: ${docRef.id})`);
      insertedCount++;
    }

    console.log('\n🎉 Seed completado!');
    console.log(`📊 Resultados:`);
    console.log(`   - Insertados: ${insertedCount}`);
    console.log(`   - Saltados: ${skippedCount}`);
    console.log(`   - Total en seed: ${menuItemsSeed.length}`);

    // Verificar total en DB
    const totalSnapshot = await menuItemsCollection.count().get();
    console.log(`   - Total en DB: ${totalSnapshot.data().count}\n`);

  } catch (error) {
    console.error('❌ Error en seed:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  seedMenuItems()
    .then(() => {
      console.log('✨ Seed finalizado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

export { seedMenuItems, menuItemsSeed };
