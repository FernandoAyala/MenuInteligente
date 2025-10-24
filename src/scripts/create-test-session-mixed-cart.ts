/**
 * Script para crear una sesión de prueba con carrito mixto
 * (items confirmados y pendientes)
 */
import { v4 as uuidv4 } from 'uuid';
import { getFirestore, initializeFirebase } from '../config/firebase.config';

async function createTestSessionWithMixedCart() {
  try {
    console.log('🧪 Creando sesión de prueba con carrito mixto...\n');

    // Inicializar Firebase
    initializeFirebase();
    const db = getFirestore();

    // Buscar items del menú
    const menuItemsSnapshot = await db.collection('menuItems').get();
    const menuItems = menuItemsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[];

    console.log(`📋 Found ${menuItems.length} menu items`);

    // Buscar items específicos
    const hamburguesa = menuItems.find(item => item.name.toLowerCase().includes('hamburguesa'));
    const pizza = menuItems.find(item => item.name.toLowerCase().includes('pizza'));
    const cocacola = menuItems.find(item => item.name.toLowerCase().includes('coca'));
    const cafe = menuItems.find(item => item.name.toLowerCase().includes('espresso'));

    if (!hamburguesa || !pizza || !cocacola || !cafe) {
      throw new Error('No se encontraron los items necesarios del menú');
    }

    console.log('✅ Items encontrados:');
    console.log(`  - ${hamburguesa.name} (${hamburguesa.id})`);
    console.log(`  - ${pizza.name} (${pizza.id})`);
    console.log(`  - ${cocacola.name} (${cocacola.id})`);
    console.log(`  - ${cafe.name} (${cafe.id})\n`);

    // Crear sesión
    const sessionId = uuidv4();
    const now = new Date();

    // Crear orden ficticia para items confirmados
    const orderId = uuidv4();

    // Carrito mixto:
    // - 2 items CONFIRMADOS (ya pedidos) - en gris
    // - 2 items PENDIENTES (por confirmar) - normales
    const mixedCart = [
      // ITEMS CONFIRMADOS (ya pedidos anteriormente)
      {
        menuItemId: hamburguesa.id,
        name: hamburguesa.name,
        price: hamburguesa.price,
        currency: hamburguesa.currency,
        quantity: 1,
        specifications: [],
        specialInstructions: 'sin cebolla',
        confirmed: true,
        orderId: orderId,
        confirmedAt: new Date(Date.now() - 10 * 60 * 1000), // Confirmado hace 10 minutos
      },
      {
        menuItemId: cafe.id,
        name: cafe.name,
        price: cafe.price,
        currency: cafe.currency,
        quantity: 1,
        specifications: [],
        confirmed: true,
        orderId: orderId,
        confirmedAt: new Date(Date.now() - 10 * 60 * 1000),
      },
      // ITEMS PENDIENTES (por confirmar)
      {
        menuItemId: pizza.id,
        name: pizza.name,
        price: pizza.price,
        currency: pizza.currency,
        quantity: 1,
        specifications: [],
        specialInstructions: 'extra queso',
        confirmed: false, // Sin confirmar
      },
      {
        menuItemId: cocacola.id,
        name: cocacola.name,
        price: cocacola.price,
        currency: cocacola.currency,
        quantity: 2,
        specifications: [],
        confirmed: false, // Sin confirmar
      },
    ];

    // Crear la sesión
    await db.collection('conversationSessions').doc(sessionId).set({
      startedAt: now,
      updatedAt: now,
      slots: {
        allergens: [],
        dietaryRestrictions: [],
        preferredCategories: ['MAIN_COURSE', 'BEVERAGE'],
      },
      messages: [
        {
          role: 'user',
          content: 'Hola',
          timestamp: new Date(Date.now() - 15 * 60 * 1000),
        },
        {
          role: 'assistant',
          content: '¡Hola! Bienvenido. ¿Qué te gustaría ordenar?',
          timestamp: new Date(Date.now() - 15 * 60 * 1000),
        },
        {
          role: 'user',
          content: 'Quiero una hamburguesa sin cebolla y un café',
          timestamp: new Date(Date.now() - 12 * 60 * 1000),
        },
        {
          role: 'assistant',
          content: `¡Excelente elección! He agregado **${hamburguesa.name}** y **${cafe.name}** a tu carrito.`,
          timestamp: new Date(Date.now() - 12 * 60 * 1000),
        },
        {
          role: 'user',
          content: 'Confirmar pedido',
          timestamp: new Date(Date.now() - 10 * 60 * 1000),
        },
        {
          role: 'assistant',
          content: `¡Pedido confirmado! 🎉\n\nTu pedido #${orderId.substring(0, 8)} ha sido enviado a la cocina.`,
          timestamp: new Date(Date.now() - 10 * 60 * 1000),
        },
        {
          role: 'user',
          content: 'Quiero una pizza con extra queso y dos coca-colas',
          timestamp: new Date(Date.now() - 2 * 60 * 1000),
        },
        {
          role: 'assistant',
          content: `¡Perfecto! He agregado **${pizza.name}** y **${cocacola.name}** (x2) a tu carrito.`,
          timestamp: new Date(Date.now() - 2 * 60 * 1000),
        },
      ],
      cart: mixedCart,
    });

    // También crear el pedido en la colección de órdenes
    await db.collection('orders').doc(orderId).set({
      tableNumber: 1,
      sessionId: sessionId,
      status: 'pending',
      dishes: [
        {
          menuItemId: hamburguesa.id,
          name: hamburguesa.name,
          quantity: 1,
          price: hamburguesa.price,
          specialInstructions: 'sin cebolla',
        },
        {
          menuItemId: cafe.id,
          name: cafe.name,
          quantity: 1,
          price: cafe.price,
        },
      ],
      total: hamburguesa.price + cafe.price,
      estimatedTime: 15,
      createdAt: new Date(Date.now() - 10 * 60 * 1000),
      updatedAt: new Date(Date.now() - 10 * 60 * 1000),
    });

    console.log('✅ Sesión creada exitosamente!\n');
    console.log('📊 Detalles:');
    console.log(`   Session ID: ${sessionId}`);
    console.log(`   Order ID: ${orderId}`);
    console.log(`\n🛒 Carrito mixto:`);
    console.log(`   ✅ Confirmados (${mixedCart.filter(i => i.confirmed).length}):`);
    mixedCart
      .filter(i => i.confirmed)
      .forEach(item => {
        console.log(`      - ${item.name} x${item.quantity}${item.specialInstructions ? ` (${item.specialInstructions})` : ''}`);
      });
    console.log(`   🛒 Pendientes (${mixedCart.filter(i => !i.confirmed).length}):`);
    mixedCart
      .filter(i => !i.confirmed)
      .forEach(item => {
        console.log(`      - ${item.name} x${item.quantity}${item.specialInstructions ? ` (${item.specialInstructions})` : ''}`);
      });

    const pendingTotal = mixedCart
      .filter(i => !i.confirmed)
      .reduce((sum, i) => sum + i.price * i.quantity, 0);
    const confirmedTotal = mixedCart
      .filter(i => i.confirmed)
      .reduce((sum, i) => sum + i.price * i.quantity, 0);

    console.log(`\n💰 Totales:`);
    console.log(`   Ya pedido: $${confirmedTotal.toLocaleString()}`);
    console.log(`   Pendiente: $${pendingTotal.toLocaleString()}`);
    console.log(`   Total: $${(confirmedTotal + pendingTotal).toLocaleString()}`);

    console.log(`\n🌐 URL para probar:`);
    console.log(`   http://localhost:5173/?sessionId=${sessionId}`);
    console.log(`\n💡 Abre el carrito para ver items confirmados (gris) y pendientes (verde)`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Ejecutar
createTestSessionWithMixedCart()
  .then(() => {
    console.log('\n✨ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
