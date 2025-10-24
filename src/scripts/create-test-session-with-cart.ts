/**
 * Script para crear una sesión de chat con items en el carrito
 * Ejecutar con: pnpm tsx src/scripts/create-test-session-with-cart.ts
 */

import { initializeFirebase } from '../config/firebase.config';
import { MessageRole } from '../models/session.model';

async function createTestSessionWithCart() {
    console.log('🚀 Iniciando creación de sesión con carrito de prueba...\n');

    try {
        // Inicializar Firebase
        initializeFirebase();
        console.log('✅ Firebase inicializado\n');

        // Importar repositorios DESPUÉS de inicializar
        const { SessionRepository } = await import('../repositories/session.repository');
        const { MenuItemRepository } = await import('../repositories/menuItem.repository');
        
        const sessionRepo = new SessionRepository();
        const menuRepo = new MenuItemRepository();

        // Obtener algunos platos del menú
        console.log('📋 Buscando platos disponibles...');
        const availableItems = await menuRepo.findAllAvailable();
        
        if (availableItems.length < 2) {
            console.error('❌ Error: No hay suficientes platos en el menú.');
            console.log('💡 Ejecuta primero: pnpm run server:seed:menu');
            process.exit(1);
        }

        // Seleccionar 2 platos para el carrito
        const dish1 = availableItems.find(item => item.name.includes('Milanesa')) || availableItems[0];
        const dish2 = availableItems.find(item => item.name.includes('Coca') || item.name.includes('Agua')) || availableItems[1];

        console.log(`✅ Plato 1: ${dish1.name} - $${dish1.price}`);
        console.log(`✅ Plato 2: ${dish2.name} - $${dish2.price}\n`);

        // Crear la sesión con items en el carrito
        const session = await sessionRepo.create({
            slots: {
                dietaryRestrictions: [],
                preferredCategories: [],
            },
            messages: [
                {
                    role: MessageRole.USER,
                    content: `Quiero ${dish1.name} y ${dish2.name}`,
                    timestamp: new Date(),
                },
                {
                    role: MessageRole.ASSISTANT,
                    content: `Perfecto! He agregado al carrito: ${dish1.name} (x1) y ${dish2.name} (x2). ¿Deseas confirmar el pedido?`,
                    timestamp: new Date(),
                },
            ],
            cart: [
                {
                    menuItemId: dish1.id,
                    quantity: 1,
                    specialInstructions: 'Sin cebolla, poco sal',
                },
                {
                    menuItemId: dish2.id,
                    quantity: 2,
                },
            ],
        });

        console.log('✅ Sesión con carrito creada exitosamente!\n');
        console.log('='.repeat(70));
        console.log('📦 DETALLES DE LA SESIÓN');
        console.log('='.repeat(70));
        console.log(`\n🆔 Session ID: ${session.id}`);
        console.log(`� Iniciada: ${session.startedAt.toLocaleString('es-AR')}`);
        console.log(`� Actualizada: ${session.updatedAt.toLocaleString('es-AR')}`);
        
        console.log(`\n🛒 CARRITO (${session.cart.length} items):`);
        console.log('-'.repeat(70));
        
        // Obtener detalles completos de los items del menú
        let total = 0;
        for (let i = 0; i < session.cart.length; i++) {
            const cartItem = session.cart[i];
            const menuItem = availableItems.find(item => item.id === cartItem.menuItemId);
            
            if (menuItem) {
                const itemTotal = cartItem.quantity * menuItem.price;
                total += itemTotal;
                console.log(`\n${i + 1}. ${menuItem.name}`);
                console.log(`   Cantidad: ${cartItem.quantity}x`);
                console.log(`   Precio unitario: $${menuItem.price}`);
                console.log(`   Subtotal: $${itemTotal}`);
                if (cartItem.specialInstructions) {
                    console.log(`   📝 Instrucciones: ${cartItem.specialInstructions}`);
                }
            }
        }
        
        console.log('\n' + '-'.repeat(70));
        console.log(`💰 TOTAL DEL CARRITO: $${total}`);
        console.log('-'.repeat(70));

        console.log('\n' + '='.repeat(70));
        console.log('🧪 CÓMO PROBAR');
        console.log('='.repeat(70));
        
        console.log('\n1. 🌐 Abre el frontend del asistente culinario:');
        console.log('   http://localhost:5173\n');
        
        console.log('2. 🔑 Usa este Session ID en la URL o en localStorage:');
        console.log(`   http://localhost:5173?sessionId=${session.id}`);
        console.log('   O en la consola del navegador:');
        console.log(`   localStorage.setItem('sessionId', '${session.id}')\n`);
        
        console.log('3. ✅ Deberías ver:');
        console.log('   - El carrito con 2 items ya cargados');
        console.log('   - El total calculado correctamente');
        console.log('   - Opción para confirmar el pedido\n');
        
        console.log('4. 💬 Prueba en el chat:');
        console.log('   - "Muéstrame mi carrito"');
        console.log('   - "Agregar un postre"');
        console.log('   - "Quitar la bebida"');
        console.log('   - "Confirmar pedido para mesa 5"\n');

        console.log('='.repeat(70));
        console.log('🎉 ¡Listo para probar el carrito!\n');

    } catch (error) {
        console.error('\n❌ Error:', error);
        if (error instanceof Error) {
            console.error('Mensaje:', error.message);
            console.error('Stack:', error.stack);
        }
        process.exit(1);
    }

    console.log('✅ Script completado!\n');
    process.exit(0);
}

// Ejecutar el script
createTestSessionWithCart();
