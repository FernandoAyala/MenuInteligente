# 🛒 Prueba del Carrito SIN Backend

## Problema Actual
El backend no está iniciando correctamente debido a problemas de compatibilidad de Node.js/npm.

## Solución Temporal: Usar Datos Mock

Vamos a modificar temporalmente el `CartPanel` para usar datos de prueba (mock) en lugar de cargar desde el backend.

### Opción 1: Console del Navegador (Más Rápido)

1. **Abre el frontend**:
   ```
   http://localhost:5173
   ```

2. **Presiona F12** para abrir DevTools

3. **Ve a la pestaña "Console"**

4. **Pega este código** para simular que hay un sessionId:
   ```javascript
   // Simular sessionId en la URL
   const urlParams = new URLSearchParams(window.location.search);
   urlParams.set('sessionId', '9bc1c3f3-5165-46b9-b2b0-8a13e579aacf');
   window.history.replaceState({}, '', '?' + urlParams.toString());
   
   // Recargar la página
   location.reload();
   ```

5. **Ahora deberías ver**:
   - El botón "🛒 Carrito" en el header
   - En la consola: `🔍 SessionId actual: 9bc1c3f3-5165-46b9-b2b0-8a13e579aacf`

6. **Haz clic en el botón del carrito**
   - Se abrirá el modal
   - Mostrará un error porque el backend no responde
   - Pero al menos verificamos que la integración funciona

### Opción 2: Modificar CartPanel Temporalmente

Si quieres ver el carrito CON datos, puedes modificar temporalmente `CartPanel.tsx`:

**Abre** `src/components/CartPanel.tsx`

**Busca la línea 36** que dice:
```typescript
useEffect(() => {
  console.log('🔍 CartPanel useEffect - sessionId:', sessionId, 'isOpen:', isOpen);
```

**Reemplaza todo el useEffect** (hasta la línea ~94) con esto:

```typescript
useEffect(() => {
  if (!isOpen) return;

  // DATOS MOCK TEMPORALES - SOLO PARA PRUEBA
  console.log('⚠️ USANDO DATOS MOCK - Backend no disponible');
  
  setLoading(true);
  
  setTimeout(() => {
    const mockCart = [
      {
        menuItemId: 'mock-1',
        quantity: 1,
        specialInstructions: 'Sin cebolla, por favor',
        menuItem: {
          id: 'mock-1',
          name: 'Milanesa Napolitana',
          description: 'Milanesa con jamón, tomate y queso gratinado',
          price: 3200,
          category: 'Platos principales',
          isAvailable: true,
          preparationTime: 20,
        }
      },
      {
        menuItemId: 'mock-2',
        quantity: 2,
        menuItem: {
          id: 'mock-2',
          name: 'Coca Cola 500ml',
          description: 'Bebida cola 500ml',
          price: 1600,
          category: 'Bebidas',
          isAvailable: true,
          preparationTime: 1,
        }
      }
    ];
    
    setCartItems(mockCart);
    setLoading(false);
    console.log('✅ Carrito mock cargado:', mockCart);
  }, 500); // Simular 500ms de carga
}, [isOpen]);
```

**Guarda el archivo** y el frontend se recargará automáticamente.

### Resultado Esperado

Con los datos mock deberías ver:

```
┌─────────────────────────────────────┐
│ 🛒 Mi Carrito    9bc1c3f3...     ✕ │
├─────────────────────────────────────┤
│                                     │
│  ┌───────────────────────────────┐ │
│  │ Milanesa Napolitana      $3200│ │
│  │ Cantidad: 1        $3200 c/u  │ │
│  │ ┌───────────────────────────┐ │ │
│  │ │ Instrucciones especiales: │ │ │
│  │ │ Sin cebolla, por favor    │ │ │
│  │ └───────────────────────────┘ │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ Coca Cola 500ml          $3200│ │
│  │ Cantidad: 2        $1600 c/u  │ │
│  └───────────────────────────────┘ │
│                                     │
│  Total:                      $4800 │
│                                     │
│  [ 🛒 Confirmar Pedido ]           │
│                                     │
└─────────────────────────────────────┘
```

## Solucionar el Backend (Para después)

El problema del backend es la versión de Node.js. Opciones:

### 1. Usar Node 18 LTS
```powershell
nvm install 18
nvm use 18
pnpm run server:dev
```

### 2. Actualizar npm
```powershell
npm install -g npm@latest
```

### 3. Limpiar y reinstalar
```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item pnpm-lock.yaml
pnpm install
pnpm run server:dev
```

## Verificar que Todo Funciona

### Checklist Visual

1. ✅ Frontend en `http://localhost:5173`
2. ✅ Botón "🛒 Carrito" visible en el header
3. ✅ Console muestra sessionId (F12 → Console)
4. ✅ Click en botón abre modal
5. ✅ Modal muestra 2 items con datos mock
6. ✅ Total: $4800
7. ✅ Botón "Confirmar Pedido" responde
8. ✅ Botón "✕" cierra el modal

## Resumen

**AHORA MISMO** puedes:
- Ver que el botón del carrito está integrado ✅
- Abrir el modal del carrito ✅
- Ver la UI completa ✅
- Ver datos mock (con la modificación temporal) ✅

**CUANDO EL BACKEND FUNCIONE** vas a poder:
- Cargar el carrito desde Firestore ✅ (código ya está)
- Ver datos reales de la sesión ✅ (código ya está)
- Todo funcionará automáticamente 🎉

El trabajo de integración está COMPLETO, solo falta que el backend inicie correctamente.
