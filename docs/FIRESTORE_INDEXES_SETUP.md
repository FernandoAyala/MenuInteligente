# Configuración de Índices de Firestore para el Sistema de Pedidos

## 🔥 Problema

Firebase requiere índices compuestos para queries que filtran/ordenan por múltiples campos. El sistema de pedidos necesita estos índices.

## ✅ Solución Rápida (Método 1 - Recomendado)

### Usar el enlace automático de Firebase

Cuando veas el error:
```
FAILED_PRECONDITION: The query requires an index. You can create it here: https://console.firebase.google.com/...
```

**Pasos:**

1. **Copia el enlace** del error (la URL que empieza con `https://console.firebase.google.com/...`)

2. **Pégalo en tu navegador** - Te llevará directamente a la consola de Firebase

3. **Haz clic en "Crear índice"** - Firebase automáticamente configurará el índice necesario

4. **Espera 1-2 minutos** - Los índices tardan en construirse

5. **Recarga tu aplicación** - El error desaparecerá

### Enlace del error actual:
```
https://console.firebase.google.com/v1/r/project/iaa-menu-inteligente/firestore/indexes?create_composite=ClNwcm9qZWN0cy9pYWEtbWVudS1pbnRlbGlnZW50ZS9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvb3JkZXJzL2luZGV4ZXMvXxABGgoKBnN0YXR1cxABGg0KCWNyZWF0ZWRBdBABGgwKCF9fbmFtZV9fEAE
```

**👆 HAZ CLIC EN ESTE ENLACE** y luego en "Crear índice"

## 📋 Método 2: Crear Índices Manualmente

Si prefieres crear los índices manualmente:

### 1. Ve a Firebase Console
```
https://console.firebase.google.com/project/iaa-menu-inteligente/firestore/indexes
```

### 2. Crea estos 4 índices para la colección `orders`:

#### Índice 1: Filtro por estado + orden por createdAt ASC
```
Colección: orders
Campos:
  - status (Ascending)
  - createdAt (Ascending)
```

#### Índice 2: Filtro por estado + orden por createdAt DESC
```
Colección: orders
Campos:
  - status (Ascending)
  - createdAt (Descending)
```

#### Índice 3: Filtro por mesa + orden por createdAt DESC
```
Colección: orders
Campos:
  - tableNumber (Ascending)
  - createdAt (Descending)
```

#### Índice 4: Filtro por sesión + orden por createdAt DESC
```
Colección: orders
Campos:
  - sessionId (Ascending)
  - createdAt (Descending)
```

## 🛠️ Método 3: Usar Firebase CLI

### Requisitos Previos
- **Node.js >= 20.0.0** (Firebase CLI v14+ requiere Node 20+)
- Si tienes Node 18, actualiza a Node 20:
  ```powershell
  # Si usas nvm
  nvm install 20
  nvm use 20
  ```

### Instalación y Uso

```powershell
# 1. Instalar Firebase CLI
pnpm add -g firebase-tools

# 2. Iniciar sesión
firebase login

# 3. Desplegar los índices
firebase deploy --only firestore:indexes --project iaa-menu-inteligente
```

El archivo `firestore.indexes.json` ya está configurado con todos los índices necesarios.

### ⚠️ Nota sobre Node.js 18
Si tienes Node.js 18.17.1 (versión actual del proyecto), Firebase CLI v14+ **no funcionará**. Opciones:
- **Opción A (Recomendada)**: Usa el Método 1 (enlace automático) ⬆️
- **Opción B**: Actualiza Node.js a v20+ solo para desplegar índices
- **Opción C**: Crea los índices manualmente (Método 2) ⬆️

## 📝 Archivo firestore.indexes.json

Ya actualicé el archivo con los índices necesarios:

```json
{
  "indexes": [
    // ... índices existentes de menuItems ...
    
    // NUEVOS ÍNDICES PARA ORDERS
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "tableNumber", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "sessionId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

## ⏱️ Tiempo de Construcción

- **Índice simple**: 1-2 minutos
- **Índice con muchos documentos**: 3-5 minutos
- **Índice en colección grande (>10k docs)**: 5-15 minutos

## ✅ Verificar que los Índices están Listos

1. **Ve a la consola de Firebase**:
   ```
   https://console.firebase.google.com/project/iaa-menu-inteligente/firestore/indexes
   ```

2. **Verifica el estado**:
   - 🟢 **Verde** = Listo para usar
   - 🟡 **Amarillo** = Construyendo... (espera)
   - 🔴 **Rojo** = Error (revisa configuración)

## 🧪 Probar que Funciona

Una vez que los índices estén listos:

```powershell
# 1. Recarga el frontend
# Presiona F5 en el navegador

# 2. Deberías ver:
# - ✅ Lista de comandas cargada
# - ✅ Sin errores en consola
# - ✅ WebSocket conectado (indicador verde)
```

## 🚨 Errores Comunes

### Error: "The query requires an index"
**Solución**: Los índices aún no están creados o están construyéndose. Espera 2-3 minutos.

### Error: "Permission denied"
**Solución**: Verifica las reglas de seguridad de Firestore. Para desarrollo puedes usar:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /orders/{orderId} {
      allow read, write: if true; // SOLO PARA DESARROLLO
    }
  }
}
```

### Error: "Collection not found"
**Solución**: Asegúrate de haber creado al menos un pedido de prueba:
```powershell
pnpm tsx src/scripts/create-test-order.ts
```

## 📚 Más Información

- [Firestore Indexes](https://firebase.google.com/docs/firestore/query-data/indexing)
- [Composite Indexes](https://firebase.google.com/docs/firestore/query-data/index-overview#composite_indexes)
- [Index Best Practices](https://firebase.google.com/docs/firestore/query-data/index-overview#best_practices)

---

## 🎯 Acción Inmediata Recomendada

**HAZ ESTO AHORA:**

1. Abre este enlace en tu navegador:
   ```
   https://console.firebase.google.com/v1/r/project/iaa-menu-inteligente/firestore/indexes?create_composite=ClNwcm9qZWN0cy9pYWEtbWVudS1pbnRlbGlnZW50ZS9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvb3JkZXJzL2luZGV4ZXMvXxABGgoKBnN0YXR1cxABGg0KCWNyZWF0ZWRBdBABGgwKCF9fbmFtZV9fEAE
   ```

2. Haz clic en **"Crear índice"**

3. Espera 2 minutos

4. Recarga tu aplicación en el navegador

¡Listo! El sistema de pedidos debería funcionar perfectamente. 🎉
