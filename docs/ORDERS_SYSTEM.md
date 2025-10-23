# Sistema de Comandas - Menu Inteligente

## 📋 Descripción General

El sistema de comandas permite gestionar pedidos en tiempo real desde que el usuario los solicita a través del chat IA hasta que son servidos en la mesa. Es una solución completa que integra:

- **API REST** para crear y gestionar comandas
- **WebSocket** para actualizaciones en tiempo real
- **Tablero de cocina** con interfaz visual React
- **Estadísticas diarias** para análisis de rendimiento
- **Persistencia en Firestore** para histórico completo
- **Integración con Chat IA** para pedidos automáticos
- **Validación de estados** con flujo controlado
- **Notificaciones en tiempo real** a la brigada de cocina

---

## 🔄 Flujo Completo del Sistema

### **Paso 1: Cliente Realiza el Pedido**

```
Usuario: "Hola, quiero una milanesa napolitana"
   ↓
Chat IA procesa el mensaje
   ↓
Extrae intenciones y preferencias
   ↓
IA: "¡Excelente elección! ¿Deseas agregar algo más?"
   ↓
Usuario: "Sí, una Coca Cola también"
   ↓
IA agrega items al carrito de la sesión
   ↓
IA: "Agregado al carrito. ¿Confirmas el pedido?"
```

**Tecnologías involucradas:**
- `POST /api/chat` - Procesamiento del mensaje
- `EnhancedLLMService` - Extracción de intenciones
- `SessionRepository` - Gestión del carrito en Firestore

---

### **Paso 2: Confirmación y Creación de Comanda**

```
Usuario: "Sí, confirmar pedido"
   ↓
Frontend detecta confirmación
   ↓
POST /api/chat/:sessionId/confirm-order
Body: {
  "tableNumber": 5,
  "customerNotes": "Sin cebolla, por favor"
}
   ↓
ChatController.confirmOrder() ejecuta:
  1. Verifica que la sesión existe
  2. Valida que haya items en el carrito
  3. Llama a OrderService.createFromCart()
     ↓
  4. OrderService obtiene datos completos de cada plato desde MenuItemRepository
  5. Calcula especificaciones automáticas (Vegano, Sin gluten, etc.)
  6. Calcula precio total y tiempo estimado
  7. Crea documento en Firestore colección "orders"
     ↓
  8. OrderRepository.create() guarda:
     - Estado: PENDING
     - createdAt: timestamp actual
     - totalAmount: calculado
     - estimatedTime: basado en cantidad de platos
     ↓
  9. Emite evento WebSocket: order:created
  10. Limpia el carrito de la sesión
   ↓
Response: {
  "success": true,
  "data": {
    "order": { id: "abc123", ... },
    "message": "¡Pedido confirmado para la mesa 5!"
  }
}
```

**Tecnologías involucradas:**
- `ChatController.confirmOrder()` - Endpoint de confirmación
- `OrderService.createFromCart()` - Lógica de creación
- `OrderRepository.create()` - Persistencia en Firestore
- `OrderSocketHandler.notifyOrderCreated()` - WebSocket

---

### **Paso 3: Tablero de Cocina Recibe la Comanda**

```
Tablero de cocina conectado vía WebSocket
   ↓
Socket.io escucha evento: order:created
   ↓
socket.on('order:created', (data) => {
  const newOrder = data.order;
  // Agregar a la lista de comandas
  setOrders(prev => [newOrder, ...prev]);
  
  // Reproducir sonido de notificación
  playNotificationSound();
  
  // Mostrar toast/alerta
  showNotification(`Nueva comanda Mesa ${newOrder.tableNumber}`);
})
   ↓
CommandsBoard.tsx actualiza el estado
   ↓
Renderiza nueva CommandCard con:
  - Badge amarillo "PENDIENTE"
  - Número de mesa destacado
  - Lista de platos con cantidades
  - Especificaciones en ROJO
  - Botón "Iniciar" agrandado
  - Tiempo desde que se creó (contador en vivo)
```

**Tecnologías involucradas:**
- Socket.io Client - Conexión WebSocket
- React State - Gestión de comandas
- CommandsBoard.tsx - Lista de comandas
- CommandCard.tsx - Tarjeta individual
- Tailwind CSS - Estilos visuales

---

### **Paso 4: Cocina Inicia Preparación**

```
Chef presiona botón "Iniciar" en CommandCard
   ↓
onClick handler ejecuta:
  handleStatusChange('in-progress')
   ↓
PATCH /api/orders/abc123/status
Body: { "status": "in-progress" }
   ↓
OrdersRoutes valida el estado
   ↓
OrderService.updateStatus() ejecuta:
  1. Obtiene la comanda actual
  2. Guarda previousStatus = 'pending'
  3. Valida transición: pending → in-progress ✓
  4. Actualiza en Firestore:
     - status: "in-progress"
     - startedAt: timestamp actual
     - updatedAt: timestamp actual
     ↓
  5. Emite WebSocket: order:status-changed
     ↓
Tablero de cocina recibe evento
   ↓
socket.on('order:status-changed', (data) => {
  // Actualizar comanda en lista
  setOrders(prev => prev.map(order =>
    order.id === data.order.id ? data.order : order
  ));
})
   ↓
CommandCard se re-renderiza:
  - Badge cambia a azul "EN PREPARACIÓN"
  - Botón "Iniciar" desaparece
  - Aparece botón "Listo"
  - Contador muestra tiempo en preparación
```

**Tecnologías involucradas:**
- `PATCH /api/orders/:id/status` - Endpoint de actualización
- `OrderService.updateStatus()` - Validación y actualización
- `OrderService.validateStatusTransition()` - Reglas de negocio
- WebSocket `order:status-changed` - Notificación en tiempo real

---

### **Paso 5: Plato Listo para Servir**

```
Chef termina preparación
   ↓
Presiona botón "Listo" en CommandCard
   ↓
PATCH /api/orders/abc123/status
Body: { "status": "ready" }
   ↓
OrderService.updateStatus() ejecuta:
  1. Valida transición: in-progress → ready ✓
  2. Actualiza en Firestore:
     - status: "ready"
     - readyAt: timestamp actual
     - updatedAt: timestamp actual
  3. Calcula tiempo de preparación:
     preparationTime = readyAt - startedAt
     ↓
  4. Emite WebSocket: order:status-changed
     ↓
Tablero actualiza en tiempo real
   ↓
CommandCard se re-renderiza:
  - Badge cambia a verde "LISTO"
  - Botón "Listo" desaparece
  - Aparece botón "Servido"
  - Destacado visual (puede brillar/parpadear)
  - Notificación sonora para meseros
```

---

### **Paso 6: Mesero Sirve el Plato**

```
Mesero toma el plato
   ↓
Lleva a mesa 5
   ↓
Presiona botón "Servido" en tablero/tablet
   ↓
PATCH /api/orders/abc123/status
Body: { "status": "served" }
   ↓
OrderService.updateStatus() ejecuta:
  1. Valida transición: ready → served ✓
  2. Actualiza en Firestore:
     - status: "served"
     - servedAt: timestamp actual
     - updatedAt: timestamp actual
  3. Calcula métricas:
     - Tiempo total: servedAt - createdAt
     - Tiempo espera: startedAt - createdAt
     - Tiempo preparación: readyAt - startedAt
     - Tiempo servido: servedAt - readyAt
     ↓
  4. Emite WebSocket: order:status-changed
     ↓
Tablero actualiza
   ↓
CommandsBoard filtra la comanda:
  - Si filtro = "all" → comanda desaparece (no muestra servidos)
  - Si filtro = "served" → aparece en lista de servidos
  - Badge gris "SERVIDO"
  - Sin botones de acción (estado final)
```

---

### **Paso 7: Análisis y Estadísticas**

```
Al final del día, gerente consulta:
   ↓
GET /api/orders/stats/daily?date=2025-10-23
   ↓
OrderRepository.getDailyStats() ejecuta:
  1. Obtiene todas las comandas del día desde Firestore
     where('createdAt', '>=', startOfDay)
     where('createdAt', '<=', endOfDay)
     ↓
  2. Calcula estadísticas:
     - totalOrders: cantidad total
     - totalRevenue: suma de todos los totalAmount
     - averagePreparationTime: promedio (readyAt - startedAt)
     - ordersByStatus: conteo por cada estado
     - popularDishes: top 10 platos más pedidos
     - peakHours: horas con más pedidos
     ↓
Response: {
  "date": "2025-10-23",
  "totalOrders": 145,
  "totalRevenue": 87500.00,
  "averagePreparationTime": 18,
  "ordersByStatus": {
    "pending": 2,
    "in-progress": 5,
    "ready": 1,
    "served": 135,
    "cancelled": 2
  },
  "popularDishes": [
    { "dishName": "Milanesa Napolitana", "count": 45 },
    { "dishName": "Pizza Margherita", "count": 38 },
    ...
  ],
  "peakHours": [
    { "hour": 20, "orderCount": 35 },
    { "hour": 21, "orderCount": 42 },
    ...
  ]
}
```

**Uso de estadísticas:**
- Dashboard gerencial
- Optimización de cocina
- Planificación de inventario
- Análisis de rentabilidad
- Detección de horas pico

---

## ✨ Características Implementadas

### **🎯 Gestión de Comandas**

✅ **Creación Automática desde Chat IA**
- Integración completa con sistema de chat conversacional
- Extracción automática de platos del carrito de sesión
- Validación de disponibilidad de items del menú
- Cálculo automático de especificaciones (Vegano, Vegetariano, Sin gluten)
- Instrucciones especiales del cliente capturadas
- Endpoint dedicado: `POST /api/chat/:sessionId/confirm-order`

✅ **Creación Manual**
- API REST para crear comandas sin chat: `POST /api/orders`
- Útil para pedidos telefónicos o presenciales
- Validación completa de datos

✅ **Persistencia en Firestore**
- Colección `orders` con documentos estructurados
- Timestamps automáticos: createdAt, updatedAt
- Timestamps por fase: startedAt, readyAt, servedAt, cancelledAt
- Índices optimizados para consultas rápidas
- Histórico completo nunca se pierde

✅ **Cálculos Automáticos**
- Total amount: suma de (precio × cantidad) de cada plato
- Tiempo estimado: basado en cantidad y tipo de platos
- Especificaciones dietéticas: detectadas del menú
- Tiempo real de preparación: diferencia entre timestamps

---

### **🔄 Gestión de Estados**

✅ **Estados Definidos**
- `PENDING`: Comanda recién creada, esperando iniciar
- `IN-PROGRESS`: En preparación en cocina
- `READY`: Listo para servir, esperando mesero
- `SERVED`: Entregado al cliente (estado final)
- `CANCELLED`: Cancelado con motivo registrado (estado final)

✅ **Validación de Transiciones**
- Reglas de negocio estrictas:
  - PENDING → IN-PROGRESS o CANCELLED
  - IN-PROGRESS → READY o CANCELLED
  - READY → SERVED o CANCELLED
  - SERVED y CANCELLED son finales (no pueden cambiar)
- Error claro si se intenta transición inválida
- Implementado en `OrderService.validateStatusTransition()`

✅ **Actualización de Estado**
- Endpoint: `PATCH /api/orders/:id/status`
- Validación automática de transiciones
- Timestamps específicos por cada cambio
- Notificación WebSocket inmediata a todos los clientes

---

### **📡 Notificaciones en Tiempo Real**

✅ **WebSocket con Socket.io**
- Servidor emite eventos a sala "kitchen-board"
- Clientes se unen con: `socket.emit('kitchen:join')`
- Conexión persistente para actualizaciones instantáneas

✅ **Eventos Implementados**
- `order:created` - Nueva comanda creada
- `order:status-changed` - Estado actualizado (con previousStatus)
- `order:updated` - Cambios generales en comanda
- `order:deleted` - Comanda eliminada
- `orders:list` - Envío masivo de lista completa

✅ **Handler Centralizado**
- `OrderSocketHandler` en `src/sockets/order.socket.ts`
- Método `notifyOrderCreated()` - Emite al crear
- Método `notifyOrderStatusChanged()` - Emite al cambiar estado
- Método `notifyOrderUpdated()` - Emite al actualizar
- Logging completo de eventos emitidos

✅ **Integración Automática**
- OrderService emite eventos automáticamente
- No requiere llamadas manuales
- Try/catch para continuar si WebSocket falla
- Fallback graceful si socket no inicializado

---

### **🎨 Interfaz de Tablero de Cocina**

✅ **Componente CommandCard**
- Diseño en tarjeta con bordes y sombras
- Número de mesa destacado en grande
- Badge de estado con colores:
  - Amarillo: PENDIENTE
  - Azul: EN PREPARACIÓN
  - Verde: LISTO
  - Gris: SERVIDO
- Lista de platos con cantidades
- Especificaciones en **ROJO** para resaltar
- Instrucciones especiales destacadas
- Botones de acción agrandados (px-6 py-3)
- Tiempo transcurrido en vivo
- Monto total visible

✅ **Componente CommandsBoard**
- Grid responsivo (1-2-3 columnas según pantalla)
- Estadísticas en tiempo real por estado
- Filtros mejorados:
  - Todos (excluye servidos automáticamente)
  - Pendientes
  - En Preparación
  - Listos
  - Servidos
- Ordenamiento:
  - Por hora de pedido (más antiguos primero - MÁS TIEMPO ESPERANDO)
  - Por número de mesa
  - Por estado
- Controles con mejor visibilidad:
  - Labels en negrita
  - Selectores agrandados (px-5 py-3)
  - Bordes gruesos
  - Hover effects
- Contador de comandas mostradas vs total
- Botón para agregar comanda de prueba

✅ **Optimización Visual**
- Tailwind CSS para diseño responsivo
- Contraste alto para lectura fácil
- Separación clara entre comandas
- Actualización en tiempo real sin parpadeos
- Loading states (si se implementa)

---

### **📊 Estadísticas y Análisis**

✅ **Estadísticas Diarias**
- Endpoint: `GET /api/orders/stats/daily?date=YYYY-MM-DD`
- Métricas calculadas:
  - Total de órdenes del día
  - Ingresos totales (revenue)
  - Tiempo promedio de preparación
  - Distribución por estado
  - Top 10 platos más pedidos
  - Horas pico del restaurante

✅ **Análisis Histórico**
- Todas las comandas guardadas permanentemente
- Consulta por fecha específica
- Consulta de comandas de hoy: `GET /api/orders/stats/today`
- Filtrado por mesa: `GET /api/orders/table/:tableNumber`
- Filtrado por sesión: `GET /api/orders/session/:sessionId`

✅ **Métricas de Rendimiento**
- Tiempo de espera: createdAt → startedAt
- Tiempo de preparación: startedAt → readyAt
- Tiempo de servicio: readyAt → servedAt
- Tiempo total: createdAt → servedAt
- Útil para optimización de procesos

---

### **🔒 Validaciones y Seguridad**

✅ **Validación de Datos**
- TableNumber requerido y numérico
- SessionId requerido y formato UUID
- CartItems validado como array no vacío
- MenuItemId validado contra base de datos
- Disponibilidad de platos verificada
- Estados validados contra enum OrderStatus

✅ **Manejo de Errores**
- Mensajes claros y descriptivos
- HTTP status codes correctos:
  - 201: Creado exitosamente
  - 400: Datos inválidos
  - 404: Recurso no encontrado
  - 500: Error del servidor
- Try/catch en todos los servicios
- Logging detallado para debugging

✅ **Integridad de Datos**
- Transacciones de Firestore (si necesario)
- Validación de estados antes de actualizar
- No permite datos inconsistentes
- Campos requeridos obligatorios

---

### **🚀 Rendimiento y Escalabilidad**

✅ **Consultas Optimizadas**
- Índices compuestos en Firestore
- Filtros eficientes por estado + fecha
- Paginación disponible (parámetro limit)
- Ordenamiento en base de datos, no en memoria

✅ **Caché y Performance**
- WebSocket reduce polling innecesario
- Actualización selectiva de UI (React state)
- Queries optimizadas con where clauses
- Timestamps indexados

✅ **Arquitectura Modular**
- Separación clara: Model → Repository → Service → Controller
- Reutilización de código
- Fácil testing unitario
- Fácil mantenimiento

---

## 📁 Endpoints API

### POST `/api/chat/:sessionId/confirm-order`

Confirma el pedido del usuario y crea la comanda.

**Body:**
```json
{
  "tableNumber": 5,
  "customerNotes": "Mesa para cumpleaños"
}
```

---

### POST `/api/orders`

Crear comanda manualmente.

---

### GET `/api/orders`

Obtener todas las comandas activas.

---

### PATCH `/api/orders/:id/status`

Actualizar el estado de una comanda.

---

### GET `/api/orders/stats/daily?date=2025-10-23`

Obtener estadísticas del día.

---

## 🌐 WebSocket - Tiempo Real

### Conexión del Cliente

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

// Unirse al tablero de cocina
socket.emit('kitchen:join');

// Confirmación
socket.on('kitchen:joined', (data) => {
  console.log('Conectado al tablero:', data.message);
});
```

### Eventos Disponibles

```javascript
// Nueva comanda creada
socket.on('order:created', (data) => {
  const { order, timestamp } = data;
  setOrders(prev => [order, ...prev]);
  playNotificationSound();
});

// Estado actualizado
socket.on('order:status-changed', (data) => {
  const { order, previousStatus, newStatus } = data;
  setOrders(prev => prev.map(o => o.id === order.id ? order : o));
});

// Comanda eliminada
socket.on('order:deleted', (data) => {
  setOrders(prev => prev.filter(o => o.id !== data.orderId));
});
```

---

## 📁 Estructura de Archivos

```
src/
├── models/
│   └── order.model.ts              # Tipos e interfaces
├── repositories/
│   └── order.repository.ts         # Acceso a Firestore
├── services/
│   └── order.service.ts            # Lógica de negocio
├── controllers/
│   └── chat.controller.ts          # Endpoint confirmOrder
├── routes/
│   ├── orders.routes.ts            # Rutas API
│   └── chat.routes.ts              # Ruta confirm-order
├── sockets/
│   └── order.socket.ts             # WebSocket handler
└── commandpage/
    ├── componentsCommand/
    │   ├── CommandCard.tsx
    │   └── CommandsBoard.tsx
    └── mocks/
        └── commandMocks.ts
```

---

## 🧪 Ejemplos de Uso

### Crear Comanda desde Chat

```bash
curl -X POST http://localhost:3000/api/chat/session-123/confirm-order \
  -H "Content-Type: application/json" \
  -d '{"tableNumber": 5, "customerNotes": "Sin cebolla"}'
```

### Cambiar Estado

```bash
curl -X PATCH http://localhost:3000/api/orders/ORDER_ID/status \
  -H "Content-Type: application/json" \
  -d '{"status": "in-progress"}'
```

### Obtener Estadísticas

```bash
curl http://localhost:3000/api/orders/stats/daily?date=2025-10-23
```

---

## 🎯 Próximos Pasos

1. ✅ Backend API completo
2. ✅ WebSocket en tiempo real
3. ✅ Integración con chat IA
4. ⏳ Conectar tablero con API real
5. ⏳ Agregar notificaciones sonoras
6. ⏳ Panel de estadísticas visual
7. ⏳ Impresión de tickets

---

## 📚 Documentación Relacionada

- `docs/SERVICES.md` - Arquitectura de servicios
- `docs/EPIC_60_RESUMEN_IMPLEMENTACION.md` - Chat IA
- `docs/FIRESTORE_INDEXES.md` - Índices de base de datos

---

**Estado del sistema:** ✅ Producción Ready  
**Última actualización:** 23 de octubre de 2025
