# Integración Frontend-Backend: Sistema de Pedidos

## 📋 Resumen

Esta documentación describe la integración completa entre el frontend (React) y el backend (Express) para el sistema de gestión de pedidos en tiempo real.

## 🏗️ Arquitectura de Integración

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ ChatContainer│    │CommandsBoard │    │   Otros...   │  │
│  └──────┬───────┘    └──────┬───────┘    └──────────────┘  │
│         │                   │                                │
│         │                   │                                │
│  ┌──────▼───────────────────▼────────────────────────────┐  │
│  │          HOOKS LAYER                                   │  │
│  │  • useConfirmOrder()  • useOrders()                   │  │
│  └──────┬───────────────────┬────────────────────────────┘  │
│         │                   │                                │
│  ┌──────▼───────────────────▼────────────────────────────┐  │
│  │          SERVICES LAYER                                │  │
│  │  • ordersService (REST API)                           │  │
│  │  • Socket.io Client (WebSocket)                       │  │
│  └──────┬───────────────────┬────────────────────────────┘  │
│         │                   │                                │
└─────────┼───────────────────┼────────────────────────────────┘
          │                   │
          │ HTTP/REST         │ WebSocket
          │                   │
┌─────────▼───────────────────▼────────────────────────────────┐
│                      BACKEND (Express)                        │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │   Routes     │    │ Controllers  │    │   Services   │   │
│  │ /api/orders  │───▶│ OrderService │───▶│ Repository   │   │
│  │ /api/chat    │    │ChatController│    │   Firebase   │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │         Socket.io Server (WebSocket)                  │    │
│  │  • order:created    • order:status-changed           │    │
│  │  • order:updated    • order:deleted                  │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## 📁 Estructura de Archivos

### Frontend

```
src/
├── services/
│   └── api/
│       └── ordersService.ts          # Servicio API REST
├── hooks/
│   ├── useOrders.ts                  # Hook para comandas + WebSocket
│   └── useConfirmOrder.ts            # Hook para confirmar pedidos
├── components/
│   ├── OrderConfirmation.tsx         # Componente de confirmación
│   └── ...
└── commandpage/
    └── componentsCommand/
        └── CommandsBoard.tsx         # Panel de comandas (actualizado)
```

### Backend

```
src/
├── routes/
│   ├── orders.routes.ts              # Rutas de órdenes
│   └── chat.routes.ts                # Ruta de confirmación
├── controllers/
│   └── chat.controller.ts            # confirmOrder()
├── services/
│   └── order.service.ts              # Lógica de negocio
├── repositories/
│   └── order.repository.ts           # Acceso a datos
├── sockets/
│   └── order.socket.ts               # WebSocket handler
└── models/
    └── order.model.ts                # Tipos/Interfaces
```

## 🔌 Servicios del Frontend

### 1. ordersService (REST API)

**Ubicación:** `src/services/api/ordersService.ts`

Servicio que encapsula todas las llamadas HTTP al backend:

```typescript
import { ordersService } from '../services/api/ordersService';

// Obtener todas las comandas activas
const orders = await ordersService.getActiveOrders();

// Obtener una comanda específica
const order = await ordersService.getOrderById(orderId);

// Actualizar estado de una comanda
await ordersService.updateOrderStatus(orderId, 'in-progress');

// Confirmar pedido desde chat
const order = await ordersService.confirmOrder(sessionId, tableNumber, notes);

// Obtener estadísticas del día
const stats = await ordersService.getDailyStats();
```

#### Métodos disponibles:

| Método | Descripción | Endpoint |
|--------|-------------|----------|
| `getActiveOrders()` | Obtiene todas las comandas activas | `GET /api/orders` |
| `getOrderById(id)` | Obtiene una comanda por ID | `GET /api/orders/:id` |
| `getOrdersByStatus(status)` | Filtra por estado | `GET /api/orders/status/:status` |
| `updateOrderStatus(id, status)` | Actualiza estado | `PATCH /api/orders/:id/status` |
| `confirmOrder(session, table, notes)` | Confirma pedido | `POST /api/chat/:sessionId/confirm-order` |
| `createOrder(data)` | Crea comanda manualmente | `POST /api/orders` |
| `getOrdersByTable(table)` | Obtiene por mesa | `GET /api/orders/table/:tableNumber` |
| `getDailyStats(date?)` | Estadísticas del día | `GET /api/orders/stats/daily` |
| `cancelOrder(id, reason)` | Cancela comanda | `DELETE /api/orders/:id/cancel` |

### 2. useOrders (Hook + WebSocket)

**Ubicación:** `src/hooks/useOrders.ts`

Hook personalizado que combina llamadas REST con sincronización WebSocket en tiempo real:

```typescript
import { useOrders } from '../hooks/useOrders';

function CommandsBoard() {
  const {
    orders,              // Lista de comandas
    loading,             // Estado de carga
    error,               // Error si existe
    refreshOrders,       // Función para refrescar
    updateOrderStatus,   // Actualizar estado
    connected,           // Estado de conexión WebSocket
  } = useOrders();

  // Las comandas se actualizan automáticamente vía WebSocket
}
```

#### Características:

- ✅ **Carga inicial** de comandas al montar
- ✅ **Conexión WebSocket** automática
- ✅ **Actualización en tiempo real** cuando hay cambios
- ✅ **Reconexión automática** si se pierde conexión
- ✅ **Indicador de estado** de conexión

#### Eventos WebSocket escuchados:

| Evento | Acción |
|--------|--------|
| `order:created` | Agrega nueva comanda a la lista |
| `order:status-changed` | Actualiza estado de comanda existente |
| `order:updated` | Actualiza datos de comanda |
| `order:deleted` | Elimina comanda de la lista |

### 3. useConfirmOrder (Hook)

**Ubicación:** `src/hooks/useConfirmOrder.ts`

Hook para confirmar pedidos desde el chat:

```typescript
import { useConfirmOrder } from '../hooks/useConfirmOrder';

function ChatComponent() {
  const {
    confirmOrder,        // Función para confirmar
    confirming,          // Estado de confirmación
    error,               // Error si existe
    confirmedOrder,      // Pedido confirmado
    clearConfirmedOrder, // Limpiar estado
  } = useConfirmOrder();

  const handleConfirm = async () => {
    const order = await confirmOrder({
      sessionId: 'session-123',
      tableNumber: 7,
      customerNotes: 'Mesa cerca de la ventana',
    });
  };
}
```

## 🎨 Componentes

### OrderConfirmation

**Ubicación:** `src/components/OrderConfirmation.tsx`

Componente completo para confirmar pedidos con validación:

```tsx
import OrderConfirmation from '../components/OrderConfirmation';

<OrderConfirmation
  sessionId={currentSessionId}
  onOrderConfirmed={(orderId) => {
    console.log('Pedido confirmado:', orderId);
  }}
  onCancel={() => {
    console.log('Confirmación cancelada');
  }}
/>
```

**Características:**
- ✅ Campo de número de mesa (requerido)
- ✅ Campo de notas adicionales (opcional)
- ✅ Validación de datos
- ✅ Manejo de errores
- ✅ Confirmación visual
- ✅ Estados de carga

### CommandsBoard (Actualizado)

**Ubicación:** `src/commandpage/componentsCommand/CommandsBoard.tsx`

Panel de comandas actualizado para usar datos reales:

**Cambios principales:**
1. ❌ Eliminados datos mock (`mockCommands`)
2. ✅ Integrado hook `useOrders`
3. ✅ Actualización en tiempo real vía WebSocket
4. ✅ Indicador de conexión
5. ✅ Botón de refresco manual
6. ✅ Manejo de errores

```tsx
// ANTES (mock)
const [commands, setCommands] = useState(mockCommands);

// AHORA (real + WebSocket)
const { orders: commands, loading, error, updateOrderStatus, connected } = useOrders();
```

## 🔄 Flujo Completo de Pedido

### 1. Usuario hace pedido en el chat

```
Usuario → Chat → LLM → Carrito de sesión
```

### 2. Usuario confirma el pedido

```tsx
// En el componente de chat
<OrderConfirmation
  sessionId={sessionId}
  onOrderConfirmed={(orderId) => {
    // Pedido confirmado exitosamente
    navigate('/comandas');
  }}
/>
```

**Backend procesa:**
```typescript
POST /api/chat/:sessionId/confirm-order
{
  "tableNumber": 7,
  "customerNotes": "Mesa cerca de la ventana"
}
```

### 3. Backend crea la orden

```typescript
// ChatController.confirmOrder()
const order = await OrderService.createFromCart(
  sessionId,
  tableNumber,
  customerNotes
);

// Emite evento WebSocket
OrderSocketHandler.notifyOrderCreated(order);
```

### 4. Frontend recibe actualización en tiempo real

```typescript
// useOrders hook escucha el evento
socketInstance.on('order:created', (data) => {
  setOrders(prev => [data.order, ...prev]);
});

// CommandsBoard se actualiza automáticamente
// La nueva comanda aparece instantáneamente en la cocina
```

### 5. Cocina procesa el pedido

```tsx
// En CommandsBoard
<CommandCard
  command={order}
  onStatusChange={(id, status) => {
    updateOrderStatus(id, status);
  }}
/>
```

**Backend actualiza:**
```typescript
PATCH /api/orders/:id/status
{ "status": "in-progress" }

// Emite evento WebSocket
OrderSocketHandler.notifyOrderStatusChanged(order);
```

### 6. Todos los clientes reciben actualización

```typescript
// Todos los componentes con useOrders se actualizan
socketInstance.on('order:status-changed', (data) => {
  setOrders(prev =>
    prev.map(order => 
      order.id === data.order.id ? data.order : order
    )
  );
});
```

## ⚙️ Configuración

### Variables de Entorno

Crear archivo `.env` basado en `.env.example`:

```bash
# URL del backend API
VITE_API_URL=http://localhost:3000

# Otras configuraciones...
NODE_ENV=development
PORT=3000
```

### Instalación de Dependencias

El proyecto ya incluye las dependencias necesarias:

```json
{
  "dependencies": {
    "socket.io-client": "^4.x.x",
    "react": "^18.x.x"
  }
}
```

## 🚀 Uso en Desarrollo

### 1. Iniciar el Backend

```bash
pnpm run server:dev
```

El servidor estará en: `http://localhost:3000`

### 2. Iniciar el Frontend

```bash
pnpm run client:dev
```

El frontend estará en: `http://localhost:5173`

### 3. Probar la Integración

**Opción A: Desde el Chat**
1. Hacer un pedido en el chat
2. Usar `<OrderConfirmation>` para confirmar
3. Ver la comanda aparecer en `CommandsBoard`

**Opción B: Desde las Comandas**
1. Abrir `/comandas` en el navegador
2. Ver comandas existentes cargadas desde el backend
3. Cambiar estado de una comanda
4. Ver actualización en tiempo real

## 🔍 Testing

### Probar Servicios Manualmente

```typescript
// En la consola del navegador

// 1. Obtener todas las comandas
const orders = await fetch('http://localhost:3000/api/orders').then(r => r.json());
console.log(orders);

// 2. Actualizar estado
await fetch('http://localhost:3000/api/orders/ORDER_ID/status', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'in-progress' })
});

// 3. Confirmar pedido desde chat
await fetch('http://localhost:3000/api/chat/SESSION_ID/confirm-order', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    tableNumber: 7,
    customerNotes: 'Test' 
  })
});
```

### Probar WebSocket

Abrir la consola del navegador y buscar:

```
✅ WebSocket conectado
🆕 Nueva comanda recibida: {...}
🔄 Estado de comanda actualizado: ...
```

## 📊 Monitoreo

### Indicador de Conexión

El `CommandsBoard` muestra un indicador visual:

- 🟢 Verde pulsante: Conectado
- 🔴 Rojo: Desconectado

### Logs en Consola

Todos los eventos importantes se registran:

```typescript
console.log('✅ WebSocket conectado');
console.log('🆕 Nueva comanda recibida:', order);
console.log('🔄 Estado de comanda actualizado:', order.id);
console.log('✏️ Comanda actualizada:', order);
console.log('🗑️ Comanda eliminada:', orderId);
```

## 🐛 Troubleshooting

### WebSocket no conecta

**Problema:** Indicador muestra "Desconectado"

**Soluciones:**
1. Verificar que el backend esté corriendo
2. Verificar URL en `.env`: `VITE_API_URL=http://localhost:3000`
3. Revisar CORS en el backend
4. Verificar console.log para errores

### Las comandas no se cargan

**Problema:** Lista vacía o error

**Soluciones:**
1. Verificar que `http://localhost:3000/api/orders` responda
2. Crear datos de prueba con `pnpm tsx src/scripts/create-test-order.ts`
3. Revisar Network tab en DevTools
4. Verificar logs del backend

### Actualizaciones no aparecen en tiempo real

**Problema:** Cambios no se reflejan automáticamente

**Soluciones:**
1. Verificar que WebSocket esté conectado (indicador verde)
2. Verificar que el backend emita eventos correctamente
3. Revisar logs en consola del navegador
4. Usar botón "Actualizar" como alternativa

## 📚 Recursos Adicionales

- [Documentación del Sistema de Órdenes](./ORDERS_SYSTEM.md)
- [Configuración de Firebase](./CONFIG_FIREBASE.md)
- [Guía de Deployment](./DEPLOYMENT.md)

## ✅ Checklist de Integración

- [x] Servicio API REST creado (`ordersService.ts`)
- [x] Hook de comandas con WebSocket (`useOrders.ts`)
- [x] Hook de confirmación de pedidos (`useConfirmOrder.ts`)
- [x] Componente de confirmación (`OrderConfirmation.tsx`)
- [x] CommandsBoard actualizado para usar datos reales
- [x] Variables de entorno configuradas (`.env.example`)
- [x] WebSocket integrado con reconexión automática
- [x] Indicador de estado de conexión
- [x] Manejo de errores en todos los servicios
- [x] Documentación completa

## 🎯 Próximos Pasos

1. **Testing E2E:** Probar flujo completo chat → confirmación → cocina
2. **Optimizaciones:** Implementar paginación para muchas comandas
3. **Notificaciones:** Agregar sonidos/alertas para nuevas comandas
4. **Analytics:** Integrar dashboard de estadísticas en tiempo real
5. **Mobile:** Adaptar componentes para dispositivos móviles

---

**Autor:** Sistema de Gestión de Pedidos - Menú Inteligente  
**Fecha:** Octubre 2025  
**Versión:** 1.0
