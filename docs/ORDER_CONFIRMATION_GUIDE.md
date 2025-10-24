# 📋 Guía de Confirmación de Pedidos

## 🎯 Formas de Confirmar un Pedido

El sistema ahora soporta **3 formas diferentes** de confirmar pedidos:

---

## 1️⃣ **Confirmación por PANEL DEL CARRITO** ✅

### Cómo usar:
1. Agrega items al carrito durante la conversación
2. Haz clic en el botón **"🛒 Carrito"** en la esquina superior derecha
3. Revisa los items en el panel que se abre
4. Haz clic en el botón **"Confirmar Pedido"** al final del panel

### Características:
- ✅ Totalmente implementado
- ✅ Muestra resumen visual antes de confirmar
- ✅ Genera número de mesa aleatorio (1-20)
- ✅ Envía orden a cocina en tiempo real vía WebSocket
- ✅ Limpia el carrito automáticamente
- ✅ Muestra confirmación con número de orden

### Código relevante:
```typescript
// src/components/ChatContainer.tsx
const handleConfirmOrder = async (cartItems: any[]) => {
  // Validaciones
  // Generar número de mesa aleatorio
  // Enviar POST a /api/orders
  // Limpiar carrito
  // Mostrar confirmación
}
```

---

## 2️⃣ **Confirmación por COMANDOS DE VOZ** ✅

### Cómo usar:
1. Agrega items al carrito
2. Activa el micrófono 🎤
3. Di cualquiera de estos comandos:
   - **"Confirmar pedido"**
   - **"Finalizar pedido"**
   - **"Hacer pedido"**
   - **"Proceder al pago"**

### Características:
- ✅ Detecta múltiples variaciones del comando
- ✅ Valida que haya items en el carrito
- ✅ Abre el panel del carrito automáticamente
- ✅ Ejecuta la confirmación después de 500ms
- ✅ Muestra mensaje si el carrito está vacío

### Código relevante:
```typescript
// src/hooks/useVoiceCommands.ts
{
  trigger: ['finalizar pedido', 'hacer pedido', 'confirmar pedido', 'proceder al pago'],
  action: 'CHECKOUT',
  description: 'Procede al checkout con los items del carrito',
  category: 'ordering'
}

// src/components/ChatContainer.tsx
case 'CHECKOUT':
  if (getTotalItems() === 0) {
    handleSendMessage('Mi carrito está vacío...');
  } else {
    setIsCartOpen(true);
    setTimeout(() => handleConfirmOrder(currentCartItems), 500);
  }
  break;
```

---

## 3️⃣ **Confirmación por CHAT CONVERSACIONAL** ✅

### Cómo usar:
1. Agrega items al carrito conversando con el bot
2. En el campo de texto, escribe cualquiera de estas frases:
   - **"Confirmar pedido"**
   - **"Confirmar el pedido"**
   - **"Confirmar mi pedido"**
   - **"Hacer el pedido"**
   - **"Hacer pedido"**
   - **"Finalizar pedido"**
   - **"Finalizar el pedido"**
   - **"Proceder al pago"**
   - **"Quiero pagar"**
   - **"Enviar a cocina"**
   - **"Enviar el pedido"**

### Características:
- ✅ Detecta intención de confirmar en lenguaje natural
- ✅ Valida que haya items en el carrito
- ✅ Envía el mensaje al bot para respuesta contextual
- ✅ Abre el panel del carrito automáticamente
- ✅ Ejecuta la confirmación después de 800ms
- ✅ El bot responde si no hay items en el carrito

### Código relevante:
```typescript
// src/components/ChatContainer.tsx
const handleSendMessage = async (content: string) => {
  const lowerContent = content.toLowerCase().trim();
  const confirmPatterns = [
    'confirmar pedido',
    'confirmar el pedido',
    'hacer el pedido',
    // ... más patrones
  ];

  const isConfirmIntent = confirmPatterns.some(pattern => 
    lowerContent.includes(pattern)
  );

  if (isConfirmIntent && getTotalItems() > 0) {
    setIsCartOpen(true);
    await sendChatMessage(content); // Bot responde
    setTimeout(() => handleConfirmOrder(currentCartItems), 800);
    return;
  }
  
  // Flujo normal...
}
```

---

## 🔄 Flujo Completo de Confirmación

```
┌─────────────────────────────────────────┐
│  Usuario tiene items en el carrito      │
└──────────────┬──────────────────────────┘
               │
               ├─── Opción 1: Click en "Confirmar Pedido" (Panel)
               │
               ├─── Opción 2: Comando de voz "confirmar pedido"
               │
               └─── Opción 3: Escribe "confirmar pedido" en chat
               │
               ▼
┌─────────────────────────────────────────┐
│  handleConfirmOrder() se ejecuta        │
│  1. Valida sessionId                    │
│  2. Valida items en carrito             │
│  3. Genera número de mesa (random 1-20) │
│  4. Formatea items al formato backend   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  POST /api/orders                       │
│  {                                       │
│    tableNumber: random(1-20),           │
│    sessionId: "...",                    │
│    cartItems: [...],                    │
│    customerNotes: "Pedido desde chat"   │
│  }                                       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Backend (order.service.ts)             │
│  1. Valida items del menú               │
│  2. Crea orden en Firestore             │
│  3. Emite WebSocket: order:created      │
└──────────────┬──────────────────────────┘
               │
               ├─────────────┬─────────────┐
               ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │  Cliente │  │  Cocina  │  │ Backend  │
        │ Frontend │  │  Panel   │  │   Log    │
        └────┬─────┘  └────┬─────┘  └──────────┘
             │             │
             │             ├─ 🔔 Orden aparece INSTANTÁNEAMENTE
             │             └─ Socket: order:created recibido
             │
             ├─ ✅ Alert: "Pedido confirmado! Mesa X, Orden #ABC"
             ├─ 🗑️ Carrito se limpia (clearCart)
             └─ ❌ Panel del carrito se cierra
```

---

## 🧪 Pruebas Paso a Paso

### Test 1: Confirmación por Panel
```
1. Abrir: http://localhost:5173?sessionId=9bc1c3f3-5165-46b9-b2b0-8a13e579aacf
2. Escribir: "Quiero un salmón a la plancha"
3. Bot recomienda y agrega al carrito
4. Click en "🛒 Carrito" (esquina superior derecha)
5. Verificar que aparece "Salmón a la Plancha $26,500"
6. Click en "Confirmar Pedido"
7. ✅ Debe aparecer alert con número de orden
8. ✅ Carrito debe quedar vacío
9. Abrir: http://localhost:5174 (panel cocina)
10. ✅ Orden debe aparecer INSTANTÁNEAMENTE sin refrescar
```

### Test 2: Confirmación por Voz
```
1. Abrir: http://localhost:5173?sessionId=<nueva-sesion>
2. Escribir: "Quiero una hamburguesa"
3. Esperar recomendación y agregar al carrito
4. Click en icono de micrófono 🎤
5. Decir: "Confirmar pedido"
6. ✅ Panel del carrito se abre automáticamente
7. ✅ Después de 0.5s se ejecuta la confirmación
8. ✅ Alert con número de orden
9. ✅ Carrito queda vacío
10. ✅ Orden en panel de cocina
```

### Test 3: Confirmación por Chat
```
1. Abrir: http://localhost:5173?sessionId=<nueva-sesion>
2. Escribir: "Quiero tacos al pastor"
3. Esperar recomendación
4. Escribir: "Sí, agrégalo al carrito"
5. Escribir: "Confirmar pedido" o "Quiero hacer el pedido"
6. ✅ Bot responde confirmando
7. ✅ Panel del carrito se abre
8. ✅ Después de 0.8s se ejecuta la confirmación
9. ✅ Alert con número de orden
10. ✅ Orden en panel de cocina
```

---

## 🎨 Mejoras Futuras Sugeridas

### UX/UI
- [ ] Reemplazar `alert()` con toast notifications (react-hot-toast)
- [ ] Animación suave al abrir panel del carrito
- [ ] Confetti o animación de celebración al confirmar
- [ ] Sonido de confirmación (opcional)

### Funcionalidad
- [ ] Preguntar número de mesa al usuario en lugar de aleatorio
- [ ] Permitir agregar nota especial antes de confirmar
- [ ] Mostrar tiempo estimado de preparación
- [ ] Historial de pedidos en la sesión
- [ ] Opción de "Repetir último pedido"

### Backend
- [ ] Endpoint específico para confirmar desde chat con contexto LLM
- [ ] Validación de horarios del restaurante
- [ ] Cálculo de tiempo de preparación basado en cocina
- [ ] Notificaciones push cuando orden esté lista

---

## 📊 Resumen de Implementación

| Método | Estado | Validación Carrito | WebSocket | Limpia Carrito | Feedback |
|--------|--------|-------------------|-----------|---------------|----------|
| Panel  | ✅ 100% | ✅ Sí | ✅ Sí | ✅ Sí | ✅ Alert |
| Voz    | ✅ 100% | ✅ Sí | ✅ Sí | ✅ Sí | ✅ Alert |
| Chat   | ✅ 100% | ✅ Sí | ✅ Sí | ✅ Sí | ✅ Alert + Bot |

---

## 🐛 Debugging

### Si la confirmación no funciona:

**1. Verificar Backend corriendo:**
```powershell
netstat -ano | Select-String ":3000"
# Debe mostrar proceso escuchando en puerto 3000
```

**2. Verificar WebSocket conectado:**
- Abrir DevTools → Console
- Buscar: `✅ WebSocket conectado`
- Buscar: `✅ Unido a la sala de cocina`

**3. Verificar sessionId:**
```javascript
// En console del navegador
console.log('SessionId:', new URLSearchParams(window.location.search).get('sessionId'))
// Debe retornar un UUID válido
```

**4. Verificar carrito:**
```javascript
// En console del navegador
console.log('Items:', localStorage.getItem('shoppingCart'))
// Debe mostrar array de items
```

**5. Logs del servidor:**
```
📦 Nueva orden creada
🔔 Emitiendo order:created a sala kitchen-board
✅ Orden guardada en Firestore: <orderId>
```

---

## 📝 Archivos Modificados

### Frontend
- `src/components/ChatContainer.tsx` - Lógica principal de confirmación
- `src/components/CartPanel.tsx` - Botón de confirmación del panel
- `src/hooks/useVoiceCommands.ts` - Definición de comandos de voz
- `src/hooks/useOrders.ts` - WebSocket corregido (kitchen:join)

### Backend
- `src/routes/orders.routes.ts` - Endpoint POST /api/orders
- `src/services/order.service.ts` - Lógica de creación de órdenes
- `src/sockets/order.socket.ts` - Emisión de eventos WebSocket

---

## ✅ Checklist de Funcionalidad

- [x] Confirmación desde panel del carrito
- [x] Confirmación por comandos de voz
- [x] Confirmación por chat conversacional
- [x] Validación de carrito no vacío
- [x] Validación de sessionId
- [x] Generación de número de mesa aleatorio
- [x] Formato correcto para backend (cartItems)
- [x] WebSocket emite evento a cocina
- [x] Panel de cocina recibe orden en tiempo real
- [x] Carrito se limpia después de confirmar
- [x] Feedback visual al usuario
- [x] Manejo de errores
- [x] Logs de debugging

---

**Última actualización:** 24 de octubre de 2025  
**Estado:** ✅ Todas las formas de confirmación implementadas y funcionales
