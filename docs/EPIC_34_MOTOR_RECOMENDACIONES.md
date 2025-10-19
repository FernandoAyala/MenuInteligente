# 🎯 Épica #34: Motor de Recomendaciones Inteligente

**Estado**: 🚧 En Desarrollo (70% Completado)  
**Prioridad**: Alta  
**Esfuerzo estimado**: 112 puntos  
**Fecha inicio**: 18 de octubre de 2025  
**Última actualización**: 18 de octubre de 2025

## 📊 Progreso General

### ✅ Completado (7/10 tareas):
- ✅ Task #37: Filtrado de seguridad (CRÍTICO) - 100% funcional
- ✅ Task #38: Sistema de scoring híbrido - 6 componentes
- ✅ Task #40: Logs de auditoría - Trazabilidad completa
- ✅ Task #42: Algoritmo de ranking con diversidad
- ✅ Task #44: Justificaciones personalizadas (básicas)
- ✅ Task #41: **Tests críticos de seguridad - 18/18 tests pasando** ✅
- ✅ Interfaces y tipos TypeScript completos

### 🔄 Pendiente (3/10 tareas):
- ⏳ Task #39: Optimización de consultas Firestore
- ⏳ Task #43: Integración LLM para scoring semántico
- ⏳ Task #45: Optimización de base de datos
- ⏳ Task #46: A/B testing (post-MVP)

### 🎯 Tests de Seguridad (Task #41):
```
✅ 18/18 tests pasando (100%)
  🚨 Allergen Filtering: 4/4 tests ✅
  🥗 Dietary Restrictions: 4/4 tests ✅
  🔒 Combined Filters: 3/3 tests ✅
  📊 Scoring Quality: 4/4 tests ✅
  ⚠️  Edge Cases: 2/2 tests ✅
  🔍 Safety Validation: 1/1 test ✅
```

**CRÍTICO**: Todos los tests de seguridad alimentaria están pasando al 100%. El sistema:
- ✅ NUNCA recomienda platos con alérgenos declarados
- ✅ Respeta TODAS las restricciones dietarias (vegano/vegetariano/gluten-free)
- ✅ NO recomienda platos no disponibles
- ✅ Maneja correctamente combinaciones de filtros
- ✅ Gestiona casos edge sin crashes

## 📋 Descripción

Sistema crítico de recomendaciones híbrido que combina:
- **Filtrado de seguridad estricto** (alérgenos + dietas) ANTES del LLM
- **Scoring semántico** usando LLM para relevancia
- **Exactamente 2-3 sugerencias** diversas y relevantes
- **Justificaciones personalizadas** para cada recomendación

## 🎯 Objetivo

Garantizar sugerencias **seguras** (sin alérgenos peligrosos) y **relevantes** (match con preferencias) con justificaciones específicas del por qué se recomienda cada plato.

---

## 📚 User Stories

### US #35: Filtrado de seguridad para alérgenos y dietas
**Prioridad**: 1 (CRÍTICO)  
**Esfuerzo**: 56 puntos

**Como** cliente con alergias,  
**Quiero** que nunca se sugieran platos peligrosos para mi salud.

**Criterios de aceptación**:
- ✅ Filtro estricto ANTES del LLM que excluye platos con alérgenos declarados
- ✅ Validación de restricciones dietarias (vegano/vegetariano/sin gluten) como reglas duras
- ✅ Sistema de scoring que combina seguridad + preferencias
- ✅ Logs de auditoría para decisiones de filtrado

#### Tareas:
- [x] **Task #37**: Función de filtrado de seguridad (alérgenos/dietas) **(CRÍTICO)** ✅
- [x] **Task #38**: Sistema de scoring híbrido ✅
- [ ] **Task #39**: Integración con consultas de base de datos
- [x] **Task #40**: Logs de trazabilidad de recomendaciones ✅
- [x] **Task #41**: Testing exhaustivo de casos de alergia **(CRÍTICO)** ✅ **18/18 tests**

---

### US #36: Sistema de sugerencias relevantes y diversas
**Prioridad**: 2  
**Esfuerzo**: 56 puntos

**Como** sistema,  
**Quiero** proporcionar exactamente 2-3 sugerencias relevantes y diversas.

**Criterios de aceptación**:
- ✅ Máximo 3 platos sugeridos por respuesta
- ✅ Diversidad en categorías/precios cuando es posible
- ✅ Ordenamiento por relevancia (match de preferencias + precio + disponibilidad)
- ✅ Justificación específica por cada recomendación

#### Tareas:
- [x] **Task #42**: Algoritmo de ranking y diversidad ✅
- [ ] **Task #43**: Integración LLM para scoring semántico
- [x] **Task #44**: Generación de justificaciones personalizadas ✅ (básicas)
- [ ] **Task #45**: Optimización de consultas de base de datos
- [ ] **Task #46**: A/B testing básico de algoritmos (post-MVP)

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────┐
│                  RecommendationService                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. INPUT: Preferencias del usuario                     │
│     - Restricciones dietarias                           │
│     - Alergias declaradas                               │
│     - Presupuesto                                       │
│     - Preferencias (picante, tipo de comida, etc)       │
│                                                          │
│  2. FILTRADO DE SEGURIDAD (Pre-LLM) ⚠️ CRÍTICO         │
│     ├─ Excluir alérgenos peligrosos                    │
│     ├─ Aplicar restricciones dietarias duras            │
│     └─ Verificar disponibilidad                         │
│                                                          │
│  3. SCORING HÍBRIDO                                     │
│     ├─ Score de seguridad (100% o 0%)                  │
│     ├─ Score de match dietario                         │
│     ├─ Score de presupuesto                            │
│     ├─ Score de preferencias                           │
│     └─ Score semántico (LLM)                           │
│                                                          │
│  4. RANKING Y DIVERSIDAD                                │
│     ├─ Ordenar por score total                         │
│     ├─ Garantizar diversidad categórica                │
│     └─ Seleccionar top 2-3                             │
│                                                          │
│  5. GENERACIÓN DE JUSTIFICACIONES                       │
│     ├─ Por qué match con preferencias                  │
│     ├─ Características específicas del plato           │
│     └─ Info dietaria relevante                         │
│                                                          │
│  6. OUTPUT: 2-3 recomendaciones + justificaciones       │
│     + Logs de auditoría                                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Componentes a Implementar

### 1. RecommendationService (`src/services/recommendation.service.ts`)

Servicio principal que orquesta todo el flujo:

```typescript
class RecommendationService {
  // Método principal
  async generateRecommendations(params: RecommendationParams): Promise<Recommendation[]>
  
  // Filtrado de seguridad
  private filterBySafety(menuItems, allergies, dietaryRestrictions)
  
  // Sistema de scoring
  private calculateScore(dish, preferences): Score
  
  // Ranking y diversidad
  private rankAndDiversify(scoredDishes): Dish[]
  
  // Generación de justificaciones
  private generateJustifications(dish, preferences): string
}
```

### 2. Interfaces (`src/interfaces/recommendation.interface.ts`)

```typescript
interface RecommendationParams {
  allergies: string[];
  dietaryRestrictions: string[];
  budget?: { min: number; max: number };
  preferences: UserPreferences;
  context?: ConversationContext;
}

interface Recommendation {
  dish: MenuItem;
  score: number;
  justification: string;
  safetyChecks: SafetyCheck[];
}

interface Score {
  safety: number;        // 100 o 0
  dietaryMatch: number;  // 0-100
  budgetFit: number;     // 0-100
  preferencesMatch: number; // 0-100
  semanticScore: number; // 0-100 (from LLM)
  total: number;
}
```

### 3. Logger de Auditoría (`src/utils/recommendation-logger.ts`)

Sistema de logs para trazabilidad de decisiones:

```typescript
class RecommendationLogger {
  logFilteringDecision(dish, reason, safety)
  logScoringDecision(dish, scores)
  logFinalRecommendations(recommendations)
}
```

---

## 🧪 Testing Requerido

### Tests Críticos (Task #41):

1. **Seguridad de Alergias**:
   - ✅ Cliente alérgico a mariscos → NUNCA recomendar platos con mariscos
   - ✅ Cliente alérgico a nueces → NUNCA recomendar platos con frutos secos
   - ✅ Múltiples alergias → Filtrado correcto de todas
   - ✅ Contaminación cruzada → Advertencias apropiadas

2. **Restricciones Dietarias**:
   - ✅ Vegano → Solo platos 100% veganos
   - ✅ Vegetariano → Sin carne ni pescado
   - ✅ Sin gluten → Solo platos certificados sin gluten
   - ✅ Combinaciones (vegano + sin gluten)

3. **Relevancia y Diversidad**:
   - ✅ Exactamente 2-3 recomendaciones
   - ✅ Diversidad en categorías cuando posible
   - ✅ Ordenamiento correcto por relevancia
   - ✅ Justificaciones específicas y personalizadas

---

## 📊 Métricas de Éxito

- **Seguridad**: 0% de recomendaciones con alérgenos declarados
- **Relevancia**: Score promedio de match > 80%
- **Diversidad**: Variedad en categorías cuando hay opciones
- **Cantidad**: Siempre 2-3 recomendaciones (nunca más, nunca menos)
- **Justificaciones**: 100% de recomendaciones con justificación específica

---

## 🚀 Plan de Implementación

### Fase 1: Fundamentos (Tasks #37, #39)
1. Crear `RecommendationService` base
2. Implementar filtrado de seguridad CRÍTICO
3. Integración con Firestore (queries optimizadas)

### Fase 2: Scoring y Ranking (Tasks #38, #42, #43)
1. Sistema de scoring híbrido
2. Algoritmo de ranking y diversidad
3. Integración con `EnhancedLLMService` para scoring semántico

### Fase 3: Justificaciones y Logs (Tasks #40, #44)
1. Generación de justificaciones personalizadas
2. Sistema de logs de auditoría
3. Trazabilidad completa

### Fase 4: Testing (Task #41)
1. Tests exhaustivos de seguridad alimentaria
2. Tests de relevancia y diversidad
3. Tests de edge cases

### Fase 5: Optimización (Task #45, #46)
1. Optimización de queries
2. Caching de resultados
3. A/B testing (post-MVP)

---

## 🔗 Dependencias

- ✅ Epic #9: Base de datos (Firestore) - **COMPLETADO**
- ✅ Epic #21: LLM y NLU - **COMPLETADO**
- 🔄 `MenuItemRepository` - Ya existe
- 🔄 `EnhancedLLMService` - Ya existe
- ⚠️ Índices de Firestore optimizados - **A verificar**

---

## 📝 Notas Importantes

### ⚠️ Seguridad Alimentaria - PRIORIDAD MÁXIMA

El filtrado de alérgenos es **CRÍTICO**:
- Debe ejecutarse **ANTES** de cualquier llamada al LLM
- Debe ser una regla **DURA** (no sugerencia)
- Debe estar **ampliamente testeado**
- Debe tener **logs de auditoría** completos

### 🎯 Calidad de Recomendaciones

Las justificaciones deben ser:
- **Específicas**: "Este risotto es cremoso y abundante" ✅
- **Personalizadas**: "Como buscás algo vegetariano..." ✅
- **NO genéricas**: "Es muy rico" ❌

---

## 📅 Estado Actual

**Fecha**: 18 de octubre de 2025  
**Estado**: Iniciando desarrollo  
**Próximo paso**: Crear RecommendationService base (Task #37)
