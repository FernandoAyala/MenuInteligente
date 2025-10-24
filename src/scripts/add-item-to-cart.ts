/**
 * Script para agregar un plato al carrito de una sesión existente
 */

import { initializeFirebase } from '../config/firebase.config';
import { MenuItemRepository } from '../repositories/menuItem.repository';
import { SessionRepository } from '../repositories/session.repository';

// Inicializar Firebase primero
initializeFirebase();

const sessionRepo = new SessionRepository();
const menuItemRepo = new MenuItemRepository();

async function addItemToCart() {
  try {
    const sessionId = '9bc1c3f3-5165-46b9-b2b0-8a13e579aacf';
    const itemsToRemove = ['DX6KTpGayCwihZNmEIxi', '3FdeGUWGx2e5i1Fd1iIh'];

    console.log(`🔍 Buscando sesión: ${sessionId}`);

    // Cargar la sesión
    const session = await sessionRepo.findById(sessionId);
    if (!session) {
      console.error(`❌ Sesión no encontrada: ${sessionId}`);
      return;
    }

    console.log(`✅ Sesión encontrada - Items actuales en carrito: ${session.cart?.length || 0}`);

    // Filtrar el carrito para remover los items especificados
    const cart = session.cart || [];
    const filteredCart = cart.filter(item => !itemsToRemove.includes(item.menuItemId));
    
    console.log(`�️  Removiendo ${cart.length - filteredCart.length} items del carrito`);
    itemsToRemove.forEach(id => {
      const removed = cart.find(item => item.menuItemId === id);
      if (removed) {
        console.log(`   ❌ Removido: ${id}`);
      }
    });

    // Actualizar la sesión
    await sessionRepo.update(sessionId, { cart: filteredCart });

    console.log('\n✅ CARRITO ACTUALIZADO');
    console.log('═══════════════════════════════════════');
    console.log(`Session ID: ${sessionId}`);
    console.log(`Total items: ${filteredCart.length}`);
    console.log('\nItems en el carrito:');
    
    for (const item of filteredCart) {
      const itemDetails = await menuItemRepo.findById(item.menuItemId);
      console.log(`  • ${itemDetails?.name || item.menuItemId}`);
      console.log(`    Cantidad: ${item.quantity}`);
      console.log(`    Precio unitario: $${itemDetails?.price || 0}`);
      console.log(`    Subtotal: $${(itemDetails?.price || 0) * item.quantity}`);
      if (item.specialInstructions) {
        console.log(`    Instrucciones: ${item.specialInstructions}`);
      }
      console.log('');
    }

    // Calcular total
    // Calcular total
    let total = 0;
    for (const item of filteredCart) {
      const itemDetails = await menuItemRepo.findById(item.menuItemId);
      total += (itemDetails?.price || 0) * item.quantity;
    }
    
    console.log(`TOTAL: $${total}`);
    console.log('═══════════════════════════════════════');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Ejecutar
addItemToCart()
  .then(() => {
    console.log('\n✨ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
