# US #89: Integración de Recomendaciones Personalizadas

## 📋 Resumen

Implementación de la funcionalidad de recomendaciones personalizadas del menú, integrando el API de recomendaciones con la interfaz de usuario. Los usuarios pueden ver sugerencias de platos basadas en sus preferencias, aplicar filtros dinámicos y visualizar scores de confianza con explicaciones.

---

## ✅ Tareas Completadas

### Task #101: Integrar componente Recommendations con API ✅

**Archivos Creados:**
- `src/hooks/useRecommendations.ts` (325 líneas)
- `src/components/RecommendationsPanel.tsx` (412 líneas)
- `src/hooks/index.ts` (exportaciones centralizadas)

#### 1. Hook `useRecommendations`

**Ubicación:** `src/hooks/useRecommendations.ts`

**Características:**
- **Auto-fetch**: Carga automática de recomendaciones al montar
- **Gestión de estado**: recommendations, isLoading, error, totalCount, hasMore
- **Filtros dinámicos**: Aplicación de filtros con actualizaciones en tiempo real
- **Contexto de preferencias**: Soporte para preferencias, alergias, restricciones dietéticas
- **Calificación**: Sistema de rating para recomendaciones (1-5 estrellas)

**Métodos principales:**
```typescript
{
  fetchRecommendations,      // Obtener recomendaciones del servidor
  applyFilters,              // Aplicar filtros de categoría, precio, alérgenos
  updateContext,             // Actualizar contexto de preferencias
  clearFilters,              // Limpiar todos los filtros
  rateRecommendation,        // Calificar recomendación (rating + feedback)
  getRecommendationById,     // Obtener recomendación específica
  searchRecommendations,     // Buscar por query
  fetchTrending,             // Obtener recomendaciones populares
  refresh,                   // Refrescar recomendaciones actuales
}
```

**Opciones de configuración:**
```typescript
interface UseRecommendationsOptions {
  autoFetch?: boolean;              // Auto-cargar al montar (default: false)
  sessionId?: string;               // ID de sesión para contexto
  initialContext?: {                // Contexto inicial
    preferences?: string[];
    allergies?: string[];
    dietary_restrictions?: string[];
  };
  initialFilters?: RecommendationFilters;
  maxRecommendations?: number;      // Límite de resultados (default: 10)
  minConfidence?: number;           // Confianza mínima 0-1 (default: 0.6)
  onRecommendationsLoaded?: (recs) => void;
  onError?: (error) => void;
}
```

**Ejemplo de uso:**
```typescript
const {
  recommendations,
  isLoading,
  error,
  applyFilters,
  rateRecommendation,
} = useRecommendations({
  autoFetch: true,
  sessionId: 'session-123',
  initialContext: {
    preferences: ['vegetariano'],
    allergies: ['nueces'],
  },
  maxRecommendations: 20,
  minConfidence: 0.7,
});
```

#### 2. Componente `RecommendationsPanel`

**Ubicación:** `src/components/RecommendationsPanel.tsx`

**Características:**
- **Integración con FoodCarousel**: Reutiliza componente existente para mostrar items
- **Filtros dinámicos**: Panel expandible con controles de filtrado
- **Estados visuales**: Loading, error, vacío, recomendaciones
- **Calificación automática**: Rating cuando usuario añade al carrito o muestra interés

**Props:**
```typescript
interface RecommendationsPanelProps {
  sessionId?: string;
  initialPreferences?: string[];
  allergies?: string[];
  dietaryRestrictions?: string[];
  onItemClick?: (item: MenuItem) => void;
  onAddToCart?: (item: MenuItem) => void;
  onInterested?: (item: MenuItem) => void;
  onViewAlternatives?: (item: MenuItem) => void;
  defaultFiltersExpanded?: boolean;
  className?: string;
}
```

**Filtros disponibles:**
- **Categorías** (checkboxes múltiples):
  - Entradas
  - Platos Principales
  - Postres
  - Bebidas
  - Acompañamientos

- **Rango de precio** (USD):
  - Precio mínimo
  - Precio máximo

- **Excluir alérgenos** (checkboxes):
  - Nueces
  - Lácteos
  - Gluten
  - Mariscos
  - Soja
  - Huevo

- **Solo disponibles** (checkbox):
  - Filtrar items no disponibles

**Estados manejados:**
1. **Loading**: Spinner animado con mensaje "Cargando recomendaciones..."
2. **Error**: Banner rojo con mensaje de error y botón "Reintentar"
3. **Vacío**: Mensaje amigable + sugerencia de ajustar filtros
4. **Con datos**: FoodCarousel con recomendaciones

**Conversión de tipos:**
```typescript
MenuRecommendation → MenuItem (para FoodCarousel)
{
  id, name, description, price, category,
  allergens, image, score, reason,
  availabilityStatus → available
}
```

**Calificación inteligente:**
- **Rating 5** + `accepted: true` → Usuario añadió al carrito
- **Rating 4** + `accepted: false` → Usuario mostró interés
- **Feedback automático**: "Añadido al carrito" / "Usuario mostró interés"

---

## 🔧 Integración con Servicios

### API Service: `recommendationService`

**Endpoints utilizados:**
```typescript
// Obtener recomendaciones
POST /api/recommendations
Body: {
  sessionId?: string;
  context?: {
    preferences?: string[];
    dietary_restrictions?: string[];
    allergies?: string[];
    budget?: number;
  };
  maxRecommendations?: number;
  minConfidence?: number;
}

// Obtener con filtros
GET /api/recommendations/filtered
Params: {
  categories: string[];
  excludeAllergens: string[];
  priceRange: { min, max };
  availableOnly: boolean;
}

// Calificar recomendación
POST /api/recommendations/{id}/rate
Body: {
  rating: number;        // 1-5
  feedback?: string;
  accepted: boolean;
}
```

### Tipos compartidos

```typescript
// De recommendationService
export interface MenuRecommendation {
  id: string;
  name: string;
  description: string;
  category: 'entrada' | 'plato_principal' | 'postre' | 'bebida' | 'acompañamiento';
  price?: number;
  image?: string;
  ingredients?: string[];
  allergens?: string[];
  nutritionalInfo?: { calories, protein, carbohydrates, fat };
  score: number;              // 0-1 (confianza)
  reason?: string;            // Explicación
  availabilityStatus?: 'available' | 'limited' | 'unavailable';
}

export interface RecommendationFilters {
  categories?: CategoryType[];
  excludeAllergens?: string[];
  priceRange?: { min?: number; max?: number };
  availableOnly?: boolean;
}
```

---

## 📊 Flujo de Datos

```
┌─────────────────────┐
│ RecommendationsPanel│
└──────────┬──────────┘
           │ usa
           ▼
┌─────────────────────┐
│ useRecommendations  │
└──────────┬──────────┘
           │ llama
           ▼
┌─────────────────────┐
│recommendationService│ ◄──► POST /api/recommendations
└──────────┬──────────┘      GET  /api/recommendations/filtered
           │ devuelve         POST /api/recommendations/{id}/rate
           ▼
┌─────────────────────┐
│MenuRecommendation[] │
└──────────┬──────────┘
           │ convierte
           ▼
┌─────────────────────┐
│    MenuItem[]       │
└──────────┬──────────┘
           │ pasa a
           ▼
┌─────────────────────┐
│   FoodCarousel      │ ◄──► DishCard (individual)
└─────────────────────┘
```

---

## 🎨 Interfaz de Usuario

### Panel de recomendaciones

**Header:**
- Ícono Sparkles (✨) + "Recomendaciones para ti"
- Contador de resultados: `(20)`
- Botón refrescar: ↻ con animación durante loading
- Botón filtros: ☰ (toggle panel de filtros)

**Panel de filtros (expandible):**
- Grid responsive (1 columna móvil, 2-3 desktop)
- Controles:
  - Checkboxes para categorías múltiples
  - Inputs numéricos para rango de precio
  - Checkboxes para excluir alérgenos
  - Checkbox para solo disponibles
- Botones:
  - "Limpiar" (secundario)
  - "Aplicar filtros" (primario, deshabilitado durante loading)

**Indicador de filtros activos:**
- Muestra cuando hay filtros aplicados
- Enlace "Limpiar todos" para reset

**Carousel de recomendaciones:**
- Reutiliza FoodCarousel existente
- Muestra 1.5 items por vista (mobile)
- Navegación con flechas izquierda/derecha
- Indicadores de posición (dots)
- Cards individuales con DishCard

**Estado vacío:**
- Ícono Sparkles grande (gris)
- Título: "No hay recomendaciones disponibles"
- Mensaje contextual:
  - Con filtros: "Intenta ajustar los filtros..."
  - Sin filtros: "Comienza a chatear para recibir recomendaciones..."
- Botón "Limpiar filtros" (si aplicable)

---

## 🧪 Testing

### Tests a implementar (Pendiente US #90):

```typescript
describe('useRecommendations', () => {
  it('debe cargar recomendaciones automáticamente si autoFetch=true');
  it('debe aplicar filtros correctamente');
  it('debe manejar errores de API');
  it('debe calificar recomendaciones');
  it('debe limpiar filtros');
});

describe('RecommendationsPanel', () => {
  it('debe renderizar correctamente');
  it('debe mostrar filtros al hacer clic en botón');
  it('debe aplicar filtros al enviar formulario');
  it('debe mostrar estado de loading');
  it('debe mostrar estado de error con reintentar');
  it('debe mostrar estado vacío');
  it('debe convertir MenuRecommendation a MenuItem');
  it('debe calificar con rating 5 al añadir al carrito');
});
```

---

## 📦 Dependencias

**Nuevas:**
- Ninguna (usa dependencias existentes)

**Existentes:**
- `react` (hooks: useState, useCallback, useEffect)
- `lucide-react` (iconos: Sparkles, SlidersHorizontal, X, AlertCircle, RefreshCw)
- `axios` (via apiClient)
- `FoodCarousel` (componente existente)
- `recommendationService` (creado en US #87)

---

## 🚀 Uso en Aplicación

### Integración en ChatContainer

**Opción 1: Mostrar recomendaciones en el chat (recomendado)**
```typescript
// En ChatContainer.tsx
import { RecommendationsPanel } from './RecommendationsPanel';

function ChatContainer() {
  const { sessionId } = useChatService();
  
  return (
    <div className="chat-container">
      {/* Chat messages */}
      
      {/* Panel de recomendaciones */}
      <RecommendationsPanel
        sessionId={sessionId}
        onAddToCart={handleAddToCart}
        onInterested={handleInterested}
      />
    </div>
  );
}
```

**Opción 2: Panel lateral separado**
```typescript
// En Layout principal
<div className="layout">
  <ChatContainer />
  <RecommendationsPanel sessionId={sessionId} />
</div>
```

**Opción 3: Modal/Drawer activado por botón**
```typescript
<button onClick={() => setShowRecommendations(true)}>
  Ver recomendaciones
</button>

{showRecommendations && (
  <Modal>
    <RecommendationsPanel sessionId={sessionId} />
  </Modal>
)}
```

---

## 📈 Próximos Pasos

### Task #102: Visualizar scores y explicaciones (PENDIENTE)
- Mejorar DishCard para mostrar badge de confianza
- Añadir tooltip/expandible con `reason`
- Estrellas o porcentaje visual para `score`

### Task #103: Filtros dinámicos de recomendaciones (COMPLETADO ✅)
- ✅ Panel de filtros implementado
- ✅ Categorías, precio, alérgenos, disponibilidad
- ✅ Aplicación dinámica con debounce implícito

### Task #104: Manejo de caso sin recomendaciones (COMPLETADO ✅)
- ✅ Estado vacío con mensaje amigable
- ✅ Sugerencia de ajustar filtros
- ✅ Botón para limpiar filtros

---

## 🐛 Issues Conocidos

1. **Campos extendidos en MenuItem**:
   - `score` y `reason` se añaden dinámicamente pero no están en el tipo MenuItem
   - Solución temporal: casting con tipo extendido
   - Solución permanente: Crear tipo RecommendedMenuItem extends MenuItem

2. **Preferencias del usuario no persisten**:
   - initialPreferences se pasa como prop pero no se guarda en localStorage
   - Considerar añadir persistencia en próximas iteraciones

---

## 📝 Notas Técnicas

### Decisiones de diseño

1. **Reutilización de FoodCarousel**:
   - Evita duplicación de código
   - Mantiene consistencia visual
   - Requiere conversión MenuRecommendation → MenuItem

2. **Filtros locales vs remotos**:
   - Filtros se aplican en backend (mejor performance)
   - Estado local solo para UI (UX inmediata)
   - BuildFilters() construye objeto antes de enviar a API

3. **Rating automático**:
   - Feedback implícito cuando usuario interactúa
   - Rating 5 = añadido al carrito (aceptado)
   - Rating 4 = mostró interés (no añadido aún)
   - Mejora algoritmo de recomendaciones futuras

4. **Auto-fetch**:
   - Deshabilitado por defecto (opt-in)
   - Evita llamadas innecesarias en componentes no activos
   - RecommendationsPanel lo habilita explícitamente

---

## ✅ Checklist de Integración

- [x] Hook `useRecommendations` creado
- [x] Componente `RecommendationsPanel` creado
- [x] Integración con `recommendationService`
- [x] Conversión MenuRecommendation → MenuItem
- [x] Panel de filtros dinámicos
- [x] Estados visuales (loading, error, vacío)
- [x] Sistema de calificación automática
- [x] Manejo de filtros activos
- [x] Responsive design
- [x] Compilación exitosa
- [x] Exportaciones actualizadas
- [ ] Tests unitarios (US #90)
- [ ] Integración en ChatContainer (pendiente decisión de UX)
- [ ] Mejoras visuales en DishCard para scores (Task #102)

---

## 🎯 Conclusión

**Task #101 completada con éxito ✅**

Se ha implementado la integración completa del componente de recomendaciones con la API:
- Hook robusto con múltiples funcionalidades
- Componente reutilizable y configurable
- Filtros dinámicos funcionales
- Estados visuales completos
- Sistema de calificación inteligente

El componente está listo para ser integrado en ChatContainer y puede ser usado inmediatamente. Las próximas tareas (#102, #103, #104) mejorarán la experiencia visual y el manejo de casos especiales.

---

**Fecha:** 2024
**Epic:** #73 - Frontend-Backend Integration
**User Story:** #89 - Integración de Recomendaciones Personalizadas (5 pts)
**Estado:** Task #101 ✅ | Tasks #102, #103, #104 pendientes
