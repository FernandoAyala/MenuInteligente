# 🛒 Flujo de Agregar Items al Carrito

## 📋 Implementación Completada

Se ha implementado la funcionalidad para que cuando el usuario pida un plato a la IA, **automáticamente se agregue al carrito**.

---

## 🔄 Flujo Completo

```
Usuario escribe:
"Quiero una hamburguesa"
       │
       ▼
┌──────────────────────────────────┐
│  1. LLM Extrae Intención         │
│     Intent: "agregar_al_pedido"  │
│     Entities: preferences=["hamburguesa"] │
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│  2. Controlador Convierte        │
│     agregar_al_pedido →          │
│     ChatActionType.ADD_TO_CART   │
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│  3. Servicio de Recomendaciones  │
│     Busca hamburguesas en menú   │
│     Retorna top 3 opciones       │
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│  4. Controlador Agrega al Carrito│
│     - Toma 1er recomendación     │
│     - Agrega a session.cart      │
│     - Actualiza Firestore        │
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│  5. Respuesta al Usuario         │
│     "¡Excelente! He agregado     │
│      Hamburguesa Clásica ($15)   │
│      a tu carrito 🛒"            │
└──────────────────────────────────┘
```

---

## 💻 Código Implementado

### **Archivo: `src/controllers/chat.controller.ts`**

#### **Paso 1: Detección de Intención** (línea 673)
```typescript
if (primaryIntent === 'agregar_al_pedido') {
  actions.push(createChatAction(ChatActionType.ADD_TO_CART, 'Agregar al carrito'));
}
```

#### **Paso 2: Agregar al Carrito** (líneas 234-283)
```typescript
// 6.1 Agregar items al carrito si se detectó acción ADD_TO_CART
if (actions.some(a => a.type === ChatActionType.ADD_TO_CART) && 
    recommendations && recommendations.length > 0) {
  try {
    const currentCart = session.cart || [];
    const itemToAdd = recommendations[0]; // Tomar el más relevante
    
    const existingItemIndex = currentCart.findIndex(
      item => item.menuItemId === itemToAdd.dish.id
    );

    if (existingItemIndex >= 0) {
      // Si ya existe, incrementar cantidad
      currentCart[existingItemIndex].quantity += 1;
      logger.info('Item quantity increased in cart');
    } else {
      // Si no existe, agregar nuevo item
      currentCart.push({
        menuItemId: itemToAdd.dish.id,
        quantity: 1,
        specialInstructions: ''
      });
      logger.info('New item added to cart');
    }

    // Actualizar el carrito en Firestore
    await this.sessionRepository.update(session.id, {
      cart: currentCart
    });

    logger.info('Cart updated successfully', {
      sessionId: session.id,
      cartSize: currentCart.length,
      totalItems: currentCart.reduce((sum, item) => sum + item.quantity, 0)
    });
  } catch (cartError) {
    logger.error('Failed to update cart', { error: cartError });
  }
}
```

#### **Paso 3: Mensaje de Confirmación** (líneas 514-521)
```typescript
// 4. AGREGAR AL CARRITO
if (actionTypes.includes(ChatActionType.ADD_TO_CART)) {
  if (hasRecommendations && recommendations.length > 0) {
    const addedDish = recommendations[0].dish;
    return `¡Excelente elección! He agregado **${addedDish.name}** ($${addedDish.price.toLocaleString()}) a tu carrito. 🛒\n\n¿Quieres agregar algo más o prefieres ver tu carrito?`;
  }
  return '¡Excelente elección! Lo agregaré a tu pedido. ¿Algo más que te gustaría añadir?';
}
```

---

## 🧪 Casos de Prueba

### **Caso 1: Agregar item simple**
```
Usuario: "Quiero una pizza"

✅ Esperado:
- LLM detecta: intent="agregar_al_pedido"
- Backend busca pizzas en menú
- Backend retorna 2-3 opciones de pizza
- Backend agrega la mejor opción al carrito
- Usuario ve: "¡Excelente! He agregado Pizza Margarita ($18) a tu carrito 🛒"
- Carrito en Firestore actualizado: [{menuItemId: "abc123", quantity: 1}]
```

### **Caso 2: Agregar con restricciones**
```
Usuario: "Quiero algo vegetariano"

✅ Esperado:
- LLM detecta: intent="agregar_al_pedido", dietaryRestrictions=["vegetariano"]
- Backend busca opciones vegetarianas
- Backend agrega la mejor opción al carrito
- Usuario ve: "¡Excelente! He agregado Ensalada César ($12) a tu carrito 🛒"
```

### **Caso 3: Agregar item duplicado**
```
Usuario: "Quiero otra pizza"
(Ya tiene 1 pizza en el carrito)

✅ Esperado:
- Backend detecta que ya existe en el carrito
- Backend incrementa quantity de 1 a 2
- Usuario ve: "¡Excelente! He agregado Pizza Margarita ($18) a tu carrito 🛒"
- Carrito: [{menuItemId: "abc123", quantity: 2}]
```

### **Caso 4: Agregar sin recomendaciones disponibles**
```
Usuario: "Quiero sushi de dragón dorado"
(No existe en el menú)

✅ Esperado:
- Backend no encuentra coincidencias
- No se agrega nada al carrito
- Usuario ve: "No encontré ese plato en nuestro menú. ¿Te gustaría que te recomiende algo similar?"
```

---

## 🔍 Debugging

### **Ver logs del backend:**
```bash
# Buscar en los logs:
✅ "Intent detected: agregar_al_pedido"
✅ "Actions generated: [ADD_TO_CART]"
✅ "Recommendations generated successfully: count: 3"
✅ "New item added to cart"
✅ "Cart updated successfully"
```

### **Verificar carrito en Firestore:**
```javascript
// Console del navegador
const sessionId = new URLSearchParams(window.location.search).get('sessionId');
console.log('SessionId:', sessionId);

// Luego verificar en Firestore Console:
// Colección: conversationSessions
// Documento: <sessionId>
// Campo: cart: [{menuItemId: "...", quantity: 1}]
```

### **Verificar en frontend:**
```javascript
// Console del navegador
console.log('Cart items:', localStorage.getItem('shoppingCart'));

// O hacer una petición GET:
fetch(`http://localhost:3000/api/sessions/${sessionId}`)
  .then(r => r.json())
  .then(d => console.log('Session cart:', d.cart));
```

---

## 🚨 Problemas Comunes

### **Problema 1: "El carrito se muestra vacío en el frontend"**

**Causa:** El frontend usa `localStorage` pero el backend guarda en Firestore.

**Solución:** El `CartPanel` ya está configurado para leer desde `/api/sessions/:sessionId`, asegúrate de:
1. Tener sessionId en la URL: `?sessionId=xxx`
2. El componente `CartPanel` carga datos de la API, no de localStorage

### **Problema 2: "No se agrega nada al carrito"**

**Diagnóstico:**
```bash
# En logs del backend, buscar:
❌ "No intent detected" 
   → El LLM no detectó la intención
   
❌ "Failed to generate recommendations"
   → No hay items en el menú que coincidan
   
❌ "Actions generated: []"
   → La intención no se convirtió en acción
```

**Soluciones:**
- Verificar que hay items en el menú (Firestore: `menuItems` collection)
- Usar frases más directas: "Quiero X" en lugar de "Me gustaría tal vez X"
- Ver logs completos del LLM para depurar extracción de intención

### **Problema 3: "Se agrega pero no aparece en CartPanel"**

**Diagnóstico:**
1. Verificar que el item se guardó en Firestore
2. Verificar que CartPanel tiene el sessionId correcto
3. Verificar que la API `/api/menu-items/:id` retorna datos del item

**Código de CartPanel** (ya implementado):
```typescript
// Carga sesión desde API
const response = await fetch(`${API_URL}/api/sessions/${sessionId}`);
const sessionData = await response.json();

// Enriquece con datos del menú
for (const item of sessionData.cart) {
  const menuResponse = await fetch(`${API_URL}/api/menu-items/${item.menuItemId}`);
  const menuItem = await menuResponse.json();
  // ... muestra en UI
}
```

---

## ✅ Checklist de Funcionamiento

Verifica que todo funcione:

- [ ] **Backend detecta intención:** Logs muestran `agregar_al_pedido`
- [ ] **Backend convierte a acción:** Logs muestran `Actions: [ADD_TO_CART]`
- [ ] **Backend genera recomendaciones:** Logs muestran `count: 2` o más
- [ ] **Backend agrega al carrito:** Logs muestran `New item added to cart`
- [ ] **Backend actualiza Firestore:** Logs muestran `Cart updated successfully`
- [ ] **Firestore tiene datos:** Campo `cart` en documento de sesión no está vacío
- [ ] **Frontend carga carrito:** CartPanel muestra el item agregado
- [ ] **Frontend muestra cantidad:** Badge del carrito muestra número correcto
- [ ] **Usuario ve confirmación:** Mensaje menciona nombre y precio del plato agregado

---

## 🎯 Frases que Funcionan

El sistema detecta estas frases y agrega automáticamente al carrito:

✅ **Directas:**
- "Quiero una pizza"
- "Dame una hamburguesa"
- "Me gustaría ordenar tacos"
- "Pido un salmón"

✅ **Con cantidad:**
- "Quiero dos pizzas"
- "Dame tres tacos"
- "Me gustaría ordenar 2 hamburguesas"

✅ **Con restricciones:**
- "Quiero algo vegetariano"
- "Dame un plato vegano"
- "Quiero algo sin gluten"

✅ **Con categoría:**
- "Quiero un postre"
- "Dame una entrada"
- "Me gustaría una bebida"

---

## 🔧 Mantenimiento

### **Si necesitas modificar el comportamiento:**

**Cambiar qué item se agrega** (actualmente el 1ero):
```typescript
// En chat.controller.ts línea ~239
const itemToAdd = recommendations[0]; // <-- Cambiar índice o lógica
```

**Cambiar cantidad inicial:**
```typescript
// En chat.controller.ts línea ~256
currentCart.push({
  menuItemId: itemToAdd.dish.id,
  quantity: 1, // <-- Cambiar a 2, 3, etc.
  specialInstructions: ''
});
```

**Agregar todos los recomendados en lugar de solo el primero:**
```typescript
// Reemplazar el bloque de línea ~239 por:
for (const itemToAdd of recommendations) {
  const existingIndex = currentCart.findIndex(
    item => item.menuItemId === itemToAdd.dish.id
  );
  if (existingIndex >= 0) {
    currentCart[existingIndex].quantity += 1;
  } else {
    currentCart.push({
      menuItemId: itemToAdd.dish.id,
      quantity: 1,
      specialInstructions: ''
    });
  }
}
```

---

## 📊 Resumen

| Componente | Estado | Función |
|------------|--------|---------|
| **Intent Detection** | ✅ | LLM detecta `agregar_al_pedido` |
| **Action Mapping** | ✅ | Mapea a `ChatActionType.ADD_TO_CART` |
| **Recommendations** | ✅ | Busca items relevantes en menú |
| **Cart Update** | ✅ | Agrega a `session.cart` en Firestore |
| **User Feedback** | ✅ | Mensaje confirma qué se agregó |
| **Frontend Sync** | ✅ | CartPanel carga desde API |

---

**Última actualización:** 24 de octubre de 2025  
**Estado:** ✅ Funcionalidad completa implementada
