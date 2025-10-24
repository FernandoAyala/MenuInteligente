# Prueba del Carrito - Instrucciones

## Estado Actual
✅ **CartPanel integrado en ChatContainer**
✅ **Botón del carrito funcional** (se abre el modal al hacer clic)
✅ **Endpoint backend creado** (`/api/sessions/:sessionId`)
✅ **Datos de prueba creados** (Session ID: `9bc1c3f3-5165-46b9-b2b0-8a13e579aacf`)

## Problema Detectado
El servidor backend tiene un problema de compatibilidad de npm/Node.js:
```
ERROR: npm v9.6.4 is known not to run on Node.js v20.0.0
```

## Solución Temporal
Si el servidor no arranca, puedes:
1. Usar Node.js v18 LTS
2. O actualizar npm: `npm install -g npm@latest`

## Cómo Probar SIN Backend (Modo Frontend)

### Opción 1: Mock del CartPanel
Puedes modificar temporalmente `CartPanel.tsx` para usar datos mock en lugar de cargar desde la API.

En la línea 40 de `CartPanel.tsx`, reemplaza el `useEffect` con esto:

```typescript
useEffect(() => {
  if (!isOpen) return;

  // Datos mock para prueba
  const mockCartItems = [
    {
      menuItemId: 'mock-1',
      quantity: 1,
      specialInstructions: 'Sin cebolla, por favor',
      menuItem: {
        id: 'mock-1',
        name: 'Milanesa Napolitana',
        price: 3200,
        description: 'Milanesa con jamón, tomate y queso',
        category: 'Platos principales',
        isAvailable: true
      }
    },
    {
      menuItemId: 'mock-2',
      quantity: 2,
      menuItem: {
        id: 'mock-2',
        name: 'Coca Cola 500ml',
        price: 1600,
        description: 'Bebida cola 500ml',
        category: 'Bebidas',
        isAvailable: true
      }
    }
  ];

  setCartItems(mockCartItems);
  setLoading(false);
}, [isOpen]);
```

### Opción 2: Usar localStorage como Source
Modificar `ChatContainer.tsx` para que siempre muestre el botón del carrito:

En la línea 220, cambiar:
```typescript
{getTotalCartItems() > 0 && (
  <button ...>
)}
```

Por:
```typescript
<button
  onClick={() => setIsCartOpen(true)}
  className="relative bg-accent-green text-white px-3 py-1 rounded-full text-sm hover:bg-green-600 transition-colors cursor-pointer"
>
  🛒 {getTotalCartItems() || 2} platos
</button>
```

## Cómo Probar CON Backend (Cuando funcione)

### 1. Iniciar Backend
```powershell
# Opción A: Si tienes Node 18
nvm use 18
npm run server:dev

# Opción B: Actualizar npm primero
npm install -g npm@latest
npm run server:dev
```

### 2. Iniciar Frontend
```powershell
npm run dev:client
```

### 3. Abrir con Session ID
```
http://localhost:5173?sessionId=9bc1c3f3-5165-46b9-b2b0-8a13e579aacf
```

### 4. Verificar
- ✅ Botón "🛒 2 platos" visible en el header
- ✅ Click abre el modal
- ✅ Se muestran 2 items (Milanesa + Coca Cola)
- ✅ Total: $4800
- ✅ Botones "Cerrar" y "Confirmar Pedido" funcionan

## Comandos Útiles

### Verificar versiones
```powershell
node --version
npm --version
```

### Limpiar y reinstalar
```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### Probar endpoint manualmente (cuando backend funcione)
```powershell
curl http://localhost:3000/api/sessions/9bc1c3f3-5165-46b9-b2b0-8a13e579aacf
```

## Testing Visual Rápido

Para ver que la integración funciona visualmente sin backend:

1. Abrir `http://localhost:5173`
2. Agregar algún item al carrito usando el chat (esto usa localStorage)
3. Deberías ver el botón "🛒 X platos"
4. Click en el botón
5. Se abre el modal (aunque puede estar vacío sin backend)

## Resumen de Cambios

### ✅ ChatContainer.tsx
- Import de CartPanel ✅
- Estado `isCartOpen` ✅
- Botón del carrito clickeable ✅
- Función `handleConfirmOrder` ✅
- Componente `<CartPanel>` renderizado ✅

### ✅ CartPanel.tsx
- Componente completo (230 líneas) ✅
- Carga desde `/api/sessions/:sessionId` ✅
- Enriquece con `/api/menu-items/:id` ✅
- Calcula total ✅
- UI responsive ✅

### ✅ Backend
- Endpoint `/api/sessions/:sessionId` ✅
- Registrado en `index.ts` ✅
- SessionRepository funcional ✅

## Próximos Pasos

1. **Solucionar problema de npm/Node** para probar con backend real
2. **Probar carga desde Firestore** con la session ID de prueba
3. **Verificar enriquecimiento** de items con datos del menú
4. **Implementar confirmación** de pedido completa

## ¿Todo listo para probar?

Si el backend no arranca, usa la **Opción 1** de Mock para ver la UI funcionando.
Si el backend funciona, abre la URL con sessionId y disfruta! 🎉
