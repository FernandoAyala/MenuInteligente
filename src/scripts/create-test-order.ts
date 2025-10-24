/**
 * Script para crear un pedido de prueba en Firestore
 * Ejecutar con: pnpm tsx src/scripts/create-test-order.ts
 */

import { v4 as uuidv4 } from 'uuid';
import { initializeFirebase } from '../config/firebase.config';
import { OrderDish } from '../models/order.model';

async function createTestOrder() {
    console.log('🚀 Iniciando creación de pedido de prueba...\n');

    try {
        // Inicializar Firebase PRIMERO
        initializeFirebase();
        console.log('✅ Firebase inicializado\n');

        // Importar repositorio DESPUÉS de inicializar
        const { OrderRepository } = await import('../repositories/order.repository');
        const orderRepo = new OrderRepository();

        // Crear platos de ejemplo
        const testDishes: OrderDish[] = [
            {
                menuItemId: uuidv4(),
                name: 'Milanesa Napolitana',
                quantity: 1,
                price: 2500,
                specifications: ['Sin gluten disponible'],
                specialInstructions: 'Poco cocida',
            },
            {
                menuItemId: uuidv4(),
                name: 'Ensalada César',
                quantity: 2,
                price: 1200,
                specifications: ['Vegetariano', 'Sin lactosa disponible'],
                specialInstructions: 'Con aderezo aparte',
            },
            {
                menuItemId: uuidv4(),
                name: 'Coca Cola 500ml',
                quantity: 2,
                price: 500,
                specifications: [],
            },
            {
                menuItemId: uuidv4(),
                name: 'Flan con Dulce de Leche',
                quantity: 1,
                price: 800,
                specifications: ['Vegetariano'],
                specialInstructions: 'Sin crema',
            },
        ];

        // Crear el pedido
        const order = await orderRepo.create({
            tableNumber: 7,
            sessionId: `test-session-${uuidv4()}`,
            dishes: testDishes,
            customerNotes: 'Mesa cerca de la ventana. Cliente celebrando cumpleaños.',
            estimatedTime: 25,
        });

        console.log('✅ Pedido de prueba creado exitosamente!\n');
        console.log('📋 Detalles del pedido:');
        console.log('-----------------------------------');
        console.log(`ID del pedido: ${order.id}`);
        console.log(`Mesa: ${order.tableNumber}`);
        console.log(`Estado: ${order.status}`);
        console.log(`Monto total: $${order.totalAmount}`);
        console.log(`Tiempo estimado: ${order.estimatedTime} minutos`);
        console.log(`Creado: ${order.createdAt.toLocaleString('es-AR')}`);
        console.log('\n🍽️  Platos del pedido:');
        order.dishes.forEach((dish: OrderDish, index: number) => {
            console.log(`\n${index + 1}. ${dish.name} (x${dish.quantity})`);
            console.log(`   Precio: $${dish.price} c/u`);
            if (dish.specifications && dish.specifications.length > 0) {
                console.log(`   Especificaciones: ${dish.specifications.join(', ')}`);
            }
            if (dish.specialInstructions) {
                console.log(`   Instrucciones: ${dish.specialInstructions}`);
            }
        });

        if (order.customerNotes) {
            console.log(`\n📝 Notas del cliente: ${order.customerNotes}`);
        }

        console.log('\n-----------------------------------');
        console.log('\n✨ Ahora puedes:');
        console.log('1. Ver el pedido en el tablero de comandas');
        console.log('2. Usar la API para consultar:');
        console.log(`   GET http://localhost:3000/api/orders/${order.id}`);
        console.log('3. Cambiar el estado:');
        console.log(`   PATCH http://localhost:3000/api/orders/${order.id}/status`);
        console.log('   Body: {"status": "in-progress"}');
        console.log('\n🎉 ¡Listo para probar!\n');
    } catch (error) {
        console.error('❌ Error al crear pedido de prueba:', error);
        if (error instanceof Error) {
            console.error('Mensaje:', error.message);
            console.error('Stack:', error.stack);
        }
        process.exit(1);
    }
}

// Ejecutar
createTestOrder()
    .then(() => {
        console.log('Script completado exitosamente');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Error en el script:', error);
        process.exit(1);
    });
