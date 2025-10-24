/**
 * Script para agregar imageUrl a todos los platos en seed-menu.ts
 * Ejecutar con: node add-image-urls.js
 */

const fs = require('fs');
const path = require('path');

// Mapeo completo de nombres de platos a términos de búsqueda de Unsplash
const imageMapping = {
  // Entradas (ya agregadas anteriormente)
  'Ensalada César': 'caesar-salad',
  'Bruschetta Caprese': 'bruschetta',
  'Spring Rolls Veganos': 'spring-rolls',
  'Empanadas de Carne': 'empanadas',
  'Hummus con Crudités': 'hummus',
  'Tabla de Quesos Artesanales': 'cheese-board',
  'Ceviche de Pescado': 'ceviche',
  'Provoleta a la Parrilla': 'provolone-cheese',
  'Gyozas de Cerdo': 'gyoza',
  'Ensalada Caprese': 'caprese-salad',
  'Sopa de Calabaza': 'pumpkin-soup',
  'Aguacate Relleno': 'stuffed-avocado',
  'Carpaccio de Res': 'beef-carpaccio',
  'Bastones de Mozzarella': 'mozzarella-sticks',
  'Ensalada Griega': 'greek-salad',
  'Tacos de Hongos': 'mushroom-tacos',
  'Camarones al Ajillo': 'garlic-shrimp',
  'Baba Ganoush': 'baba-ganoush',
  'Alcachofas a la Romana': 'fried-artichokes',
  'Sopa de Miso': 'miso-soup',
  'Champiñones Rellenos': 'stuffed-mushrooms',
  
  // Platos Principales (los que faltan)
  'Pizza Margarita': 'pizza-margherita',
  'Risotto de Hongos': 'mushroom-risotto',
  'Curry Tailandés de Vegetales': 'thai-curry',
  'Salmón a la Plancha': 'grilled-salmon',
  'Bowl Vegano de Quinoa': 'quinoa-bowl',
  
  // Postres (los que faltan)
  'Helado Vegano de Frutas': 'vegan-ice-cream',
  
  // Bebidas (las que faltan)
  'Smoothie de Frutas Tropicales': 'tropical-smoothie',
  'Cerveza Artesanal IPA': 'craft-beer',
};

const filePath = path.join(__dirname, 'src', 'scripts', 'seed-menu.ts');

try {
  // Leer el archivo
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Contador de reemplazos
  let replacements = 0;
  
  // Para cada plato en el mapeo
  for (const [dishName, searchTerm] of Object.entries(imageMapping)) {
    // Patrón para encontrar platos SIN imageUrl
    // Busca: name: 'NOMBRE', \n description: ... \n price: ... \n currency: ... \n category: ...
    // Y luego NO imageUrl (sino directamente spicyLevel)
    const escapedName = dishName.replace(/[()]/g, '\\$&');
    const pattern = new RegExp(
      `(\\s+name: '${escapedName}',\\s*\\n` +
      `\\s+description: [^\\n]+\\n` +
      `\\s+price: \\d+,\\s*\\n` +
      `\\s+currency: 'ARS',\\s*\\n` +
      `\\s+category: MenuCategory\\.\\w+,)\\s*\\n` +
      `(\\s+spicyLevel:)`,
      'g'
    );
    
    // Reemplazar agregando imageUrl después de category
    const imageUrl = `https://source.unsplash.com/400x300/?${searchTerm}`;
    const replacement = `$1\n    imageUrl: '${imageUrl}',\n$2`;
    
    const before = content;
    content = content.replace(pattern, replacement);
    
    if (content !== before) {
      replacements++;
      console.log(`✓ Agregada imagen para: ${dishName}`);
    }
  }
  
  // Guardar el archivo modificado
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log(`\n✅ Proceso completado: ${replacements} imágenes agregadas`);
  console.log(`📊 Total de platos en mapeo: ${Object.keys(imageMapping).length}`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
