# Integración del Carrito Completada

## Resumen
Se ha integrado completamente el componente `CartPanel` en el chat del asistente culinario para mostrar los items del carrito cargados desde Firestore.

## Cambios Realizados

### 1. Componente CartPanel (`src/components/CartPanel.tsx`)
- **Ya existía**: Componente modal creado previamente (230 líneas)
- **Funcionalidad**: 
  - Carga la sesión desde `/api/sessions/:sessionId`
  - Enriquece los items del carrito con datos del menú desde `/api/menu-items/:id`
  - Muestra nombre, cantidad, precio e instrucciones especiales
  - Calcula el total del pedido
  - Botón "Confirmar Pedido"

### 2. Integración en ChatContainer (`src/components/ChatContainer.tsx`)
**Cambios realizados**:

#### Importaciones
```typescript
import { CartPanel } from './CartPanel';
```

#### Estado del modal
```typescript
const [isCartOpen, setIsCartOpen] = useState(false);
```

#### Botón del carrito mejorado
**ANTES** (líneas 218-225):
```typescript
{getTotalCartItems() > 0 && (
  <div className="relative">
    <div className="bg-accent-green text-white px-3 py-1 rounded-full text-sm">
      🛒 {getTotalCartItems()} platos
    </div>
  </div>
)}
```

**DESPUÉS**:
```typescript
{getTotalCartItems() > 0 && (
  <button
    onClick={() => setIsCartOpen(true)}
    className="relative bg-accent-green text-white px-3 py-1 rounded-full text-sm hover:bg-green-600 transition-colors cursor-pointer"
  >
    🛒 {getTotalCartItems()} platos
  </button>
)}
```

#### Función para confirmar pedido
```typescript
const handleConfirmOrder = () => {
  console.log('📦 Confirmando pedido desde sesión');
  setIsCartOpen(false);
  // Aquí puedes agregar lógica adicional
};
```

#### Renderizado del CartPanel
```typescript
{/* Panel del carrito */}
<CartPanel
  sessionId={sessionId}
  isOpen={isCartOpen}
  onClose={() => setIsCartOpen(false)}
  onConfirmOrder={handleConfirmOrder}
/>
```

### 3. Backend - Endpoint de Sesiones
**Archivo**: `src/routes/session.routes.ts` (ya existía)
- **GET /api/sessions/:sessionId**: Retorna la sesión completa con el carrito

**Registrado en**: `src/index.ts`
```typescript
app.use('/api/sessions', sessionRoutes);
```

## Datos de Prueba

### Sesión de Prueba Creada
- **Session ID**: `9bc1c3f3-5165-46b9-b2b0-8a13e579aacf`
- **Items en el carrito**:
  1. **Milanesa Napolitana** x1 - $3200
  2. **Coca Cola 500ml** x2 - $1600
- **Total**: $4800

### Menú Items Creados
25 platos distribuidos en 5 categorías:
- Entradas (4 items)
- Platos principales (8 items)
- Postres (4 items)
- Bebidas (6 items)
- Guarniciones (3 items)

## Cómo Probar

### 1. Iniciar el Backend
```powershell
npm run dev
```
El servidor debe estar corriendo en `http://localhost:3000`

### 2. Iniciar el Frontend
```powershell
npm run dev:client
```
El cliente debe estar corriendo en `http://localhost:5173`

### 3. Abrir con Session ID
Navegar a:
```
http://localhost:5173?sessionId=9bc1c3f3-5165-46b9-b2b0-8a13e579aacf
```

### 4. Ver el Carrito
1. Deberías ver un botón verde en el header que dice **"🛒 2 platos"**
2. Hacer clic en el botón para abrir el modal del carrito
3. Deberías ver:
   - Milanesa Napolitana (Cantidad: 1, Precio: $3200)
   - Coca Cola 500ml (Cantidad: 2, Precio: $1600)
   - **Total: $4800**
4. Botones de "Cerrar" (X) y "Confirmar Pedido"

### 5. Verificar Endpoint Manualmente
```powershell
curl http://localhost:3000/api/sessions/9bc1c3f3-5165-46b9-b2b0-8a13e579aacf
```

Respuesta esperada:
```json
{
  "success": true,
  "data": {
    "id": "9bc1c3f3-5165-46b9-b2b0-8a13e579aacf",
    "userId": "test-user",
    "cart": [
      {
        "menuItemId": "DX6KTpGayCwihZNmEIxi",
        "quantity": 1,
        "specialInstructions": "Sin cebolla, por favor"
      },
      {
        "menuItemId": "3zn7igKqGm68qAqZjLuz",
        "quantity": 2
      }
    ],
    "messages": [...],
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

## Flujo de Datos

```
1. URL con sessionId
   ↓
2. ChatContainer obtiene sessionId de useChatService
   ↓
3. Usuario hace clic en botón del carrito
   ↓
4. Se abre CartPanel con sessionId
   ↓
5. CartPanel carga sesión: GET /api/sessions/:sessionId
   ↓
6. Por cada item del carrito, carga detalles: GET /api/menu-items/:id
   ↓
7. Muestra items enriquecidos con nombre, precio, etc.
   ↓
8. Calcula total y lo muestra
   ↓
9. Usuario puede confirmar o cerrar
```

## Problemas Conocidos y Soluciones

### Problema: "No se ve el carrito"
**Causa**: sessionId no está en la URL o el sessionId no existe en Firestore
**Solución**: 
- Verificar que la URL tenga el parámetro `?sessionId=...`
- Verificar que el backend esté corriendo
- Verificar que la sesión exista en Firestore

### Problema: "CartPanel no se importa"
**Causa**: Export incorrecto
**Solución**: Usar `import { CartPanel } from './CartPanel'` (con llaves)

### Problema: "sessionId es null"
**Causa**: useChatService no está obteniendo el sessionId de la URL
**Solución**: Verificar que useChatService lea los parámetros de la URL o del localStorage

## Próximos Pasos (Opcional)

1. **Sincronizar con localStorage**: Decidir si el carrito de Firestore debe sincronizarse con el carrito local (useShoppingCart)

2. **Editar cantidad**: Agregar botones +/- para modificar cantidades en el CartPanel

3. **Eliminar items**: Agregar botón de eliminar individual

4. **Confirmar pedido**: Implementar lógica completa para crear orden desde el carrito

5. **Manejo de errores**: Mejorar mensajes de error cuando falla la carga

6. **Loading state**: Mejorar la UI del loading en CartPanel

7. **Animaciones**: Agregar transiciones suaves al abrir/cerrar el modal

## Archivos Modificados

1. ✅ `src/components/ChatContainer.tsx` - Integración del CartPanel
2. ✅ `src/components/CartPanel.tsx` - Ya existía, sin cambios
3. ✅ `src/routes/session.routes.ts` - Ya existía, sin cambios
4. ✅ `src/index.ts` - Ya tenía las rutas registradas

## Testing Checklist

- [ ] Backend corriendo en puerto 3000
- [ ] Frontend corriendo en puerto 5173
- [ ] Sesión de prueba existe en Firestore
- [ ] Endpoint `/api/sessions/:sessionId` responde correctamente
- [ ] URL con sessionId carga correctamente
- [ ] Botón del carrito aparece en el header
- [ ] Click en el botón abre el modal
- [ ] Modal muestra 2 items (Milanesa + Coca Cola)
- [ ] Precios se muestran correctamente
- [ ] Total calcula $4800
- [ ] Botón "Cerrar" funciona
- [ ] Botón "Confirmar Pedido" cierra el modal

## Notas Técnicas

- **Export vs Default**: CartPanel usa `export const` en lugar de `export default`, por eso se importa con llaves
- **sessionId source**: Viene de `useChatService` que debería leerlo de la URL o localStorage
- **Cart items**: Se almacenan en Firestore con solo `menuItemId` y `quantity`, se enriquecen con datos del menú al cargar
- **Total calculation**: Se calcula en el cliente multiplicando precio × cantidad y sumando todos los items
