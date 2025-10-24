/**
 * Script para actualizar los menuItems existentes con imageUrl
 */
import { getFirestore, initializeFirebase } from '../config/firebase.config';
import { menuItemsSeed } from './seed-menu';

async function updateMenuItemsWithImages() {
  try {
    console.log('🖼️  Actualizando menuItems con URLs de imágenes...\n');

    // Inicializar Firebase
    initializeFirebase();
    const db = getFirestore();

    const menuItemsCollection = db.collection('menuItems');
    let updatedCount = 0;
    let notFoundCount = 0;
    let alreadyHasImageCount = 0;

    for (const item of menuItemsSeed) {
      // Buscar el item por nombre
      const existingItemQuery = await menuItemsCollection
        .where('name', '==', item.name)
        .limit(1)
        .get();

      if (existingItemQuery.empty) {
        console.log(`❌ No encontrado: "${item.name}"`);
        notFoundCount++;
        continue;
      }

      const docId = existingItemQuery.docs[0].id;
      const currentData = existingItemQuery.docs[0].data();

      // Verificar si ya tiene imageUrl
      if (currentData.imageUrl && currentData.imageUrl === item.imageUrl) {
        console.log(`⏭️  Ya tiene imagen: "${item.name}"`);
        alreadyHasImageCount++;
        continue;
      }

      // Actualizar solo el campo imageUrl
      await menuItemsCollection.doc(docId).update({
        imageUrl: item.imageUrl,
        updatedAt: new Date().toISOString(),
      });

      console.log(`✅ Actualizado: "${item.name}" con imagen ${item.imageUrl}`);
      updatedCount++;
    }

    console.log('\n🎉 Actualización completada!');
    console.log(`📊 Resultados:`);
    console.log(`   - Actualizados: ${updatedCount}`);
    console.log(`   - Ya tenían imagen: ${alreadyHasImageCount}`);
    console.log(`   - No encontrados: ${notFoundCount}`);
    console.log(`   - Total procesados: ${menuItemsSeed.length}\n`);

  } catch (error) {
    console.error('❌ Error al actualizar:', error);
    process.exit(1);
  }
}

// Ejecutar
updateMenuItemsWithImages()
  .then(() => {
    console.log('✨ Actualización finalizada exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
