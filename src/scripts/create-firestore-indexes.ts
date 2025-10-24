/**
 * Script para crear índices de Firestore usando la API REST de Firebase
 * Alternativa cuando Firebase CLI no está disponible o hay problemas de versión de Node
 */

import { exec } from 'child_process';
import * as readline from 'readline';

const PROJECT_ID = 'iaa-menu-inteligente';

// Índices necesarios para la colección orders
const REQUIRED_INDEXES = [
  {
    name: 'Status + CreatedAt ASC',
    fields: [
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'ASCENDING' }
    ]
  },
  {
    name: 'Status + CreatedAt DESC',
    fields: [
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' }
    ]
  },
  {
    name: 'TableNumber + CreatedAt DESC',
    fields: [
      { fieldPath: 'tableNumber', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' }
    ]
  },
  {
    name: 'SessionId + CreatedAt DESC',
    fields: [
      { fieldPath: 'sessionId', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' }
    ]
  }
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function printHeader() {
  console.log('\n' + '='.repeat(70));
  console.log('🔥 CREAR ÍNDICES DE FIRESTORE - SISTEMA DE PEDIDOS');
  console.log('='.repeat(70) + '\n');
}

function printIndexes() {
  console.log('📋 Índices que se crearán en la colección "orders":\n');
  REQUIRED_INDEXES.forEach((index, i) => {
    console.log(`${i + 1}. ${index.name}`);
    index.fields.forEach(field => {
      console.log(`   - ${field.fieldPath} (${field.order})`);
    });
    console.log('');
  });
}

function generateFirebaseLinks() {
  console.log('\n🔗 ENLACES PARA CREAR ÍNDICES:\n');
  console.log('Opción 1 - Usar el enlace del error (RECOMENDADO):');
  console.log('─'.repeat(70));
  console.log('https://console.firebase.google.com/v1/r/project/iaa-menu-inteligente/firestore/indexes?create_composite=ClNwcm9qZWN0cy9pYWEtbWVudS1pbnRlbGlnZW50ZS9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvb3JkZXJzL2luZGV4ZXMvXxABGgoKBnN0YXR1cxABGg0KCWNyZWF0ZWRBdBABGgwKCF9fbmFtZV9fEAE\n');
  
  console.log('\nOpción 2 - Crear manualmente en la consola:');
  console.log('─'.repeat(70));
  console.log(`https://console.firebase.google.com/project/${PROJECT_ID}/firestore/indexes\n`);
  
  console.log('Opción 3 - Ver colección de órdenes:');
  console.log('─'.repeat(70));
  console.log(`https://console.firebase.google.com/project/${PROJECT_ID}/firestore/data/orders\n`);
}

function printInstructions() {
  console.log('\n📝 INSTRUCCIONES:\n');
  console.log('1. Abre cualquiera de los enlaces de arriba en tu navegador');
  console.log('2. Si usas la Opción 1, haz clic en "Crear índice"');
  console.log('3. Si usas la Opción 2, crea cada índice manualmente:');
  REQUIRED_INDEXES.forEach((index, i) => {
    console.log(`\n   Índice ${i + 1}: ${index.name}`);
    console.log('   Colección: orders');
    console.log('   Campos:');
    index.fields.forEach(field => {
      console.log(`     • ${field.fieldPath}: ${field.order}`);
    });
  });
  
  console.log('\n4. Espera 1-2 minutos mientras Firebase construye los índices');
  console.log('5. Verifica que los índices estén en estado "Enabled" (verde)');
  console.log('6. Recarga tu aplicación frontend');
  console.log('\n✅ ¡Listo! Tu sistema de pedidos debería funcionar.\n');
}

function printAlternatives() {
  console.log('\n💡 ALTERNATIVAS:\n');
  console.log('Si quieres usar Firebase CLI:');
  console.log('─'.repeat(70));
  console.log('1. Actualiza Node.js a v20+:');
  console.log('   • Descarga desde: https://nodejs.org/');
  console.log('   • O usa nvm: nvm install 20 && nvm use 20');
  console.log('');
  console.log('2. Luego ejecuta:');
  console.log('   pnpm add -g firebase-tools');
  console.log('   firebase login');
  console.log('   firebase deploy --only firestore:indexes --project iaa-menu-inteligente');
  console.log('\n');
}

async function main() {
  printHeader();
  
  console.log('⚠️  NOTA: Firebase CLI requiere Node.js 20+');
  console.log(`   Tu versión actual: ${process.version}`);
  
  if (process.version.startsWith('v18.')) {
    console.log('   ❌ Firebase CLI no funcionará con Node 18');
    console.log('   ✅ Usa los enlaces de abajo para crear los índices\n');
  } else if (process.version.startsWith('v20.') || process.version.startsWith('v22.')) {
    console.log('   ✅ Tu versión es compatible con Firebase CLI\n');
  }
  
  printIndexes();
  generateFirebaseLinks();
  printInstructions();
  printAlternatives();
  
  console.log('='.repeat(70));
  console.log('¿Quieres abrir el enlace de creación automática en el navegador? (S/N)');
  
  rl.question('> ', (answer) => {
    if (answer.toLowerCase() === 's' || answer.toLowerCase() === 'si') {
      const link = 'https://console.firebase.google.com/v1/r/project/iaa-menu-inteligente/firestore/indexes?create_composite=ClNwcm9qZWN0cy9pYWEtbWVudS1pbnRlbGlnZW50ZS9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvb3JkZXJzL2luZGV4ZXMvXxABGgoKBnN0YXR1cxABGg0KCWNyZWF0ZWRBdBABGgwKCF9fbmFtZV9fEAE';
      
      console.log('\n🌐 Abriendo en el navegador...');
      console.log('Si no se abre automáticamente, copia y pega este enlace:');
      console.log(link);
      
      // Intentar abrir en el navegador
      const command = process.platform === 'win32' ? 'start' : 
                     process.platform === 'darwin' ? 'open' : 'xdg-open';
      
      exec(`${command} "${link}"`, (error: Error | null) => {
        if (error) {
          console.log('\n❌ No se pudo abrir automáticamente. Copia el enlace de arriba.');
        } else {
          console.log('\n✅ Enlace abierto en el navegador.');
        }
        
        console.log('\n👉 Haz clic en "Crear índice" y espera 1-2 minutos.');
        console.log('👉 Luego recarga tu aplicación frontend.\n');
        rl.close();
      });
    } else {
      console.log('\n📋 Copia alguno de los enlaces de arriba y ábrelo en tu navegador.\n');
      rl.close();
    }
  });
}

main().catch(console.error);
