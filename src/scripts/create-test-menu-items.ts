/**
 * Script para crear items del menú de prueba en Firestore
 * Ejecutar con: pnpm tsx src/scripts/create-test-menu-items.ts
 */

import { initializeFirebase } from '../config/firebase.config';
import { MenuCategory, SpicyLevel, type CreateMenuItemDto } from '../models/menuItem.model';
import { menuItemService } from '../services/menuItem.service';

/**
 * Helper para crear un MenuItem con valores por defecto para propiedades dietéticas
 */
function createMenuItem(item: Partial<CreateMenuItemDto> & Pick<CreateMenuItemDto, 'name' | 'description' | 'price' | 'currency' | 'category' | 'available'>): CreateMenuItemDto {
    return {
        isLactoseFree: false,
        isKosher: false,
        isHalal: false,
        isPaleo: false,
        isKeto: false,
        isVegan: false,
        isVegetarian: false,
        isGlutenFree: false,
        allergens: [],
        spicyLevel: SpicyLevel.NONE,
        ...item
    };
}

async function createTestMenuItems() {
    console.log('🚀 Iniciando creación de items del menú de prueba...\n');

    try {
        // Inicializar Firebase
        initializeFirebase();
        console.log('✅ Firebase inicializado\n');

        // Importar repositorio DESPUÉS de inicializar
        const { MenuItemRepository } = await import('../repositories/menuItem.repository');
        const menuRepo = new MenuItemRepository();

        // Crear platos de prueba
        const testMenuItems: CreateMenuItemDto[] = [
            // ENTRADAS
            {
                name: 'Empanadas de Carne',
                description: 'Empanadas criollas rellenas de carne picada a cuchillo, cebolla, huevo duro y aceitunas. Docena.',
                price: 1500,
                currency: 'ARS',
                category: MenuCategory.APPETIZER,
                spicyLevel: SpicyLevel.NONE,
                isVegan: false,
                isVegetarian: false,
                isGlutenFree: false,
                isLactoseFree: true,
                isKosher: false,
                isHalal: false,
                isPaleo: false,
                isKeto: false,
                allergens: ['gluten', 'huevo'],
                available: true,
            },
            {
                name: 'Provoleta a la Parrilla',
                description: 'Queso provolone asado a la parrilla con orégano, aceite de oliva y pan tostado.',
                price: 1800,
                currency: 'ARS',
                category: MenuCategory.APPETIZER,
                spicyLevel: SpicyLevel.NONE,
                isVegan: false,
                isVegetarian: true,
                isGlutenFree: true,
                allergens: ['lácteos'],
                available: true,
            },
            {
                name: 'Ensalada César',
                description: 'Lechuga romana, pollo grillado, queso parmesano, croutons y aderezo César.',
                price: 2200,
                currency: 'ARS',
                category: MenuCategory.APPETIZER,
                spicyLevel: SpicyLevel.NONE,
                isVegan: false,
                isVegetarian: false,
                isGlutenFree: false,
                allergens: ['gluten', 'lácteos', 'huevo'],
                available: true,
            },
            {
                name: 'Tabla de Quesos y Fiambres',
                description: 'Selección de quesos artesanales, fiambres finos, frutas frescas y frutos secos.',
                price: 3500,
                currency: 'ARS',
                category: MenuCategory.APPETIZER,
                spicyLevel: SpicyLevel.NONE,
                isVegan: false,
                isVegetarian: false,
                isGlutenFree: true,
                allergens: ['lácteos', 'frutos secos'],
                available: true,
            },

            // PLATOS PRINCIPALES
            {
                name: 'Milanesa Napolitana',
                description: 'Milanesa de ternera cubierta con salsa de tomate, jamón y queso mozzarella gratinado, acompañada de papas fritas.',
                price: 3200,
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
                name: 'Bife de Chorizo con Chimichurri',
                description: 'Corte premium de 400g a la parrilla, acompañado de papas rústicas y ensalada mixta.',
                price: 4500,
                currency: 'ARS',
                category: MenuCategory.MAIN_COURSE,
                spicyLevel: SpicyLevel.MILD,
                isVegan: false,
                isVegetarian: false,
                isGlutenFree: true,
                allergens: [],
                available: true,
            },
            {
                name: 'Ravioles de Ricota y Espinaca',
                description: 'Pasta fresca rellena de ricota y espinaca con salsa de tomate casera o crema.',
                price: 2800,
                currency: 'ARS',
                category: MenuCategory.MAIN_COURSE,
                spicyLevel: SpicyLevel.NONE,
                isVegan: false,
                isVegetarian: true,
                isGlutenFree: false,
                allergens: ['gluten', 'lácteos', 'huevo'],
                available: true,
            },
            {
                name: 'Pollo al Horno con Papas',
                description: 'Medio pollo al horno con especias, acompañado de papas y vegetales asados.',
                price: 3000,
                currency: 'ARS',
                category: MenuCategory.MAIN_COURSE,
                spicyLevel: SpicyLevel.NONE,
                isVegan: false,
                isVegetarian: false,
                isGlutenFree: true,
                allergens: [],
                available: true,
            },
            {
                name: 'Pizza Margherita',
                description: 'Pizza clásica con salsa de tomate, mozzarella fresca, albahaca y aceite de oliva.',
                price: 2500,
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
                name: 'Pescado a la Plancha',
                description: 'Filet de merluza fresco a la plancha con limón, acompañado de vegetales salteados.',
                price: 3800,
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
                name: 'Hamburguesa Completa',
                description: 'Medallón de carne 200g, queso cheddar, lechuga, tomate, cebolla caramelizada, panceta y huevo. Con papas.',
                price: 2900,
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
                name: 'Wok de Vegetales',
                description: 'Vegetales salteados al wok con salsa de soja, jengibre y sésamo, servido con arroz.',
                price: 2400,
                currency: 'ARS',
                category: MenuCategory.MAIN_COURSE,
                spicyLevel: SpicyLevel.MEDIUM,
                isVegan: true,
                isVegetarian: true,
                isGlutenFree: true,
                allergens: ['soja', 'sésamo'],
                available: true,
            },

            // POSTRES
            {
                name: 'Flan Casero con Dulce de Leche',
                description: 'Flan tradicional argentino con dulce de leche y crema chantilly.',
                price: 1200,
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
                name: 'Brownie con Helado',
                description: 'Brownie de chocolate tibio con helado de vainilla y salsa de chocolate.',
                price: 1500,
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
                name: 'Tiramisú',
                description: 'Postre italiano con capas de bizcochuelo embebido en café, crema de mascarpone y cacao.',
                price: 1600,
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
                name: 'Ensalada de Frutas',
                description: 'Frutas frescas de estación con jugo de naranja natural.',
                price: 1000,
                currency: 'ARS',
                category: MenuCategory.DESSERT,
                spicyLevel: SpicyLevel.NONE,
                isVegan: true,
                isVegetarian: true,
                isGlutenFree: true,
                allergens: [],
                available: true,
            },

            // BEBIDAS
            {
                name: 'Coca Cola 500ml',
                description: 'Gaseosa Coca Cola regular en botella.',
                price: 800,
                currency: 'ARS',
                category: MenuCategory.BEVERAGE,
                isVegan: true,
                isVegetarian: true,
                isGlutenFree: true,
                allergens: [],
                available: true,
            },
            {
                name: 'Agua Mineral 500ml',
                description: 'Agua mineral sin gas.',
                price: 600,
                currency: 'ARS',
                category: MenuCategory.BEVERAGE,
                isVegan: true,
                isVegetarian: true,
                isGlutenFree: true,
                allergens: [],
                available: true,
            },
            {
                name: 'Cerveza Quilmes 1L',
                description: 'Cerveza rubia argentina en botella de 1 litro.',
                price: 1400,
                currency: 'ARS',
                category: MenuCategory.BEVERAGE,
                isVegan: true,
                isVegetarian: true,
                isGlutenFree: false,
                allergens: ['gluten'],
                available: true,
            },
            {
                name: 'Vino Tinto Malbec (Copa)',
                description: 'Copa de vino tinto Malbec argentino de bodega seleccionada.',
                price: 1200,
                currency: 'ARS',
                category: MenuCategory.BEVERAGE,
                isVegan: true,
                isVegetarian: true,
                isGlutenFree: true,
                allergens: ['sulfitos'],
                available: true,
            },
            {
                name: 'Limonada Natural',
                description: 'Limonada casera con menta fresca.',
                price: 900,
                currency: 'ARS',
                category: MenuCategory.BEVERAGE,
                isVegan: true,
                isVegetarian: true,
                isGlutenFree: true,
                allergens: [],
                available: true,
            },
            {
                name: 'Café Expresso',
                description: 'Café expresso italiano.',
                price: 700,
                currency: 'ARS',
                category: MenuCategory.BEVERAGE,
                isVegan: true,
                isVegetarian: true,
                isGlutenFree: true,
                allergens: [],
                available: true,
            },

            // GUARNICIONES
            {
                name: 'Papas Fritas',
                description: 'Porción de papas fritas caseras.',
                price: 1000,
                currency: 'ARS',
                category: MenuCategory.SIDE_DISH,
                spicyLevel: SpicyLevel.NONE,
                isVegan: true,
                isVegetarian: true,
                isGlutenFree: true,
                allergens: [],
                available: true,
            },
            {
                name: 'Ensalada Mixta',
                description: 'Lechuga, tomate, zanahoria y cebolla con aceite y vinagre.',
                price: 900,
                currency: 'ARS',
                category: MenuCategory.SIDE_DISH,
                spicyLevel: SpicyLevel.NONE,
                isVegan: true,
                isVegetarian: true,
                isGlutenFree: true,
                allergens: [],
                available: true,
            },
            {
                name: 'Puré de Papas',
                description: 'Puré de papas cremoso con manteca y leche.',
                price: 1100,
                currency: 'ARS',
                category: MenuCategory.SIDE_DISH,
                spicyLevel: SpicyLevel.NONE,
                isVegan: false,
                isVegetarian: true,
                isGlutenFree: true,
                allergens: ['lácteos'],
                available: true,
            },
        ];

        console.log(`📝 Creando ${testMenuItems.length} items del menú...\n`);

        const createdItems = [];
        const countByCategory = {
            [MenuCategory.APPETIZER]: 0,
            [MenuCategory.MAIN_COURSE]: 0,
            [MenuCategory.DESSERT]: 0,
            [MenuCategory.BEVERAGE]: 0,
            [MenuCategory.SIDE_DISH]: 0,
        };

        for (const item of testMenuItems) {
            try {
                const created = await menuRepo.create(item);
                createdItems.push(created);
                countByCategory[item.category]++;
                console.log(`✅ ${item.name} - $${item.price}`);
            } catch (error) {
                console.error(`❌ Error creando ${item.name}:`, error);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('✨ RESUMEN DE ITEMS CREADOS');
        console.log('='.repeat(60));
        console.log(`\n📊 Total: ${createdItems.length} items\n`);
        console.log('Por categoría:');
        console.log(`  🍽️  Entradas: ${countByCategory[MenuCategory.APPETIZER]}`);
        console.log(`  🥘  Platos principales: ${countByCategory[MenuCategory.MAIN_COURSE]}`);
        console.log(`  🍰  Postres: ${countByCategory[MenuCategory.DESSERT]}`);
        console.log(`  🥤  Bebidas: ${countByCategory[MenuCategory.BEVERAGE]}`);
        console.log(`  🥗  Guarniciones: ${countByCategory[MenuCategory.SIDE_DISH]}`);

        console.log('\n' + '='.repeat(60));
        console.log('💡 PRÓXIMOS PASOS');
        console.log('='.repeat(60));
        console.log('\n1. 🎨 Frontend del asistente culinario:');
        console.log('   - Los platos ya están disponibles en Firestore');
        console.log('   - El carrito puede usar estos items');
        console.log('   - URL: http://localhost:5173\n');

        console.log('2. 🔌 Probar la API:');
        console.log('   GET http://localhost:3000/api/menu-items\n');

        console.log('3. 💬 Usar el chat:');
        console.log('   - "Quiero una milanesa napolitana"');
        console.log('   - "Muéstrame los postres"');
        console.log('   - "Recomiéndame algo vegetariano"\n');

        console.log('4. 🛒 Probar el carrito:');
        console.log('   - Agregar items al carrito');
        console.log('   - Confirmar pedido con número de mesa');
        console.log('   - Ver el pedido en el tablero de comandas (http://localhost:5174)\n');

        console.log('='.repeat(60));
        console.log('🎉 ¡Todo listo para probar el sistema completo!\n');

        // Mostrar algunos IDs de ejemplo
        if (createdItems.length > 0) {
            console.log('📋 IDs de ejemplo (para testing):');
            createdItems.slice(0, 5).forEach(item => {
                console.log(`   ${item.name}: ${item.id}`);
            });
            console.log('');
        }

    } catch (error) {
        console.error('\n❌ Error:', error);
        process.exit(1);
    }

    console.log('✅ Script completado!\n');
    process.exit(0);
}

// Ejecutar el script
createTestMenuItems();
