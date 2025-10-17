# Guía de Índices en Firestore

## 📋 Índices Básicos Configurados

Para optimizar las consultas en Firestore, se han identificado los siguientes índices necesarios:

### 1. Índice Simple: `available`

**Propósito**: Filtrar platos disponibles en el menú

**Colección**: `menuItems`
**Campo**: `available` (Boolean)
**Tipo**: Ascendente

**Consultas optimizadas**:
```typescript
// Obtener todos los platos disponibles
menuItems.where('available', '==', true).get();
```

### 2. Índice Simple: `price`

**Propósito**: Ordenar platos por precio

**Colección**: `menuItems`
**Campo**: `price` (Number)
**Tipo**: Ascendente

**Consultas optimizadas**:
```typescript
// Obtener platos ordenados por precio
menuItems.orderBy('price', 'asc').get();
```

### 3. Índice Compuesto: `category` + `available`

**Propósito**: Filtrar platos disponibles por categoría

**Colección**: `menuItems`
**Campos**:
- `category` (String) - Ascendente
- `available` (Boolean) - Ascendente

**Consultas optimizadas**:
```typescript
// Obtener platos principales disponibles
menuItems
  .where('category', '==', 'main_course')
  .where('available', '==', true)
  .get();
```

### 4. Índice Compuesto: `available` + `price`

**Propósito**: Obtener platos disponibles ordenados por precio

**Colección**: `menuItems`
**Campos**:
- `available` (Boolean) - Ascendente
- `price` (Number) - Ascendente

**Consultas optimizadas**:
```typescript
// Obtener platos disponibles ordenados por precio
menuItems
  .where('available', '==', true)
  .orderBy('price', 'asc')
  .get();
```

### 5. Índice Compuesto: `isVegan` + `available`

**Propósito**: Filtrar platos veganos disponibles

**Colección**: `menuItems`
**Campos**:
- `isVegan` (Boolean) - Ascendente
- `available` (Boolean) - Ascendente

**Consultas optimizadas**:
```typescript
// Obtener platos veganos disponibles
menuItems
  .where('isVegan', '==', true)
  .where('available', '==', true)
  .get();
```

### 6. Índice Compuesto: `isVegetarian` + `available`

**Propósito**: Filtrar platos vegetarianos disponibles

**Colección**: `menuItems`
**Campos**:
- `isVegetarian` (Boolean) - Ascendente
- `available` (Boolean) - Ascendente

**Consultas optimizadas**:
```typescript
// Obtener platos vegetarianos disponibles
menuItems
  .where('isVegetarian', '==', true)
  .where('available', '==', true)
  .get();
```

### 7. Índice Compuesto: `category` + `available` + `price`

**Propósito**: Filtrar por categoría y ordenar por precio

**Colección**: `menuItems`
**Campos**:
- `category` (String) - Ascendente
- `available` (Boolean) - Ascendente
- `price` (Number) - Ascendente

**Consultas optimizadas**:
```typescript
// Obtener postres disponibles ordenados por precio
menuItems
  .where('category', '==', 'dessert')
  .where('available', '==', true)
  .orderBy('price', 'asc')
  .get();
```

---

## 🔧 Cómo Crear los Índices

### Opción 1: Automático (Recomendado para desarrollo)

Cuando ejecutes una consulta que requiera un índice compuesto, Firestore te mostrará un error con un enlace directo para crear el índice. Por ejemplo:

```
Error: The query requires an index. You can create it here: 
https://console.firebase.google.com/project/...
```

### Opción 2: Manual en Firebase Console

1. Ve a Firebase Console: https://console.firebase.google.com
2. Selecciona tu proyecto: `iaa-menu-inteligente`
3. Ve a **Firestore Database** → **Indexes**
4. Click en **Create Index**
5. Configura:
   - **Collection**: `menuItems`
   - **Fields**: Agrega los campos según la tabla arriba
   - **Query scope**: Collection
6. Click **Create**

### Opción 3: Usando firestore.indexes.json

Crea un archivo `firestore.indexes.json` en la raíz del proyecto:

```json
{
  "indexes": [
    {
      "collectionGroup": "menuItems",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "category", "order": "ASCENDING" },
        { "fieldPath": "available", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "menuItems",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "available", "order": "ASCENDING" },
        { "fieldPath": "price", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "menuItems",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "isVegan", "order": "ASCENDING" },
        { "fieldPath": "available", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "menuItems",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "isVegetarian", "order": "ASCENDING" },
        { "fieldPath": "available", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "menuItems",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "category", "order": "ASCENDING" },
        { "fieldPath": "available", "order": "ASCENDING" },
        { "fieldPath": "price", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

Luego deploy con Firebase CLI:
```bash
firebase deploy --only firestore:indexes
```

---

## 📊 Índices para `conversationSessions`

### 1. Índice Simple: `updatedAt`

**Propósito**: Obtener sesiones recientes

**Colección**: `conversationSessions`
**Campo**: `updatedAt` (Timestamp)
**Tipo**: Descendente

**Consultas optimizadas**:
```typescript
// Obtener sesiones más recientes
conversationSessions.orderBy('updatedAt', 'desc').limit(10).get();
```

### 2. Índice Simple: `startedAt`

**Propósito**: Obtener sesiones por fecha de inicio

**Colección**: `conversationSessions`
**Campo**: `startedAt` (Timestamp)
**Tipo**: Descendente

---

## ⚡ Mejores Prácticas

1. **Crear índices bajo demanda**: Solo crea índices cuando realmente los necesites
2. **Monitorear uso**: Revisa el uso de índices en Firebase Console
3. **Eliminar índices innecesarios**: Los índices consumen espacio de almacenamiento
4. **Considerar límites**: Firestore tiene límites de índices compuestos (200 por base de datos)
5. **Testing local**: Usa emuladores para testear índices sin afectar producción

---

## 🧪 Testing de Índices

Para verificar que los índices funcionan correctamente:

```typescript
// Test de índice compuesto
const result = await menuItems
  .where('category', '==', 'main_course')
  .where('available', '==', true)
  .orderBy('price', 'asc')
  .get();

console.log(`Encontrados ${result.size} platos`);
```

Si la consulta falla con un error de índice faltante, sigue el enlace en el error para crear el índice automáticamente.

---

## 📝 Notas

- Los índices simples (un solo campo) se crean automáticamente
- Los índices compuestos deben crearse manualmente
- Los cambios en índices pueden tardar varios minutos en aplicarse
- Los índices no se pueden modificar, solo eliminar y recrear
