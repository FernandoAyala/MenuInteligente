# 🚦 Soluciones para Rate Limit de Gemini

## ⚠️ Problema
Google Gemini API tiene un límite de **10 requests por minuto** en el tier gratuito, lo que causa errores `429 RESOURCE_EXHAUSTED` cuando ejecutamos tests.

---

## ✅ Solución Implementada: Delays Automáticos

### ¿Qué hace?
Añade un delay de **6.5 segundos** entre cada test cuando se usa Gemini, respetando el límite de 10 requests/minuto.

### Código agregado:
```typescript
// Helper para añadir delay entre tests (evitar rate limiting)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Configuración de delays para Gemini (10 requests/minuto = 6 segundos entre requests)
const GEMINI_DELAY_MS = 6500; // 6.5 segundos para dar margen
const isUsingGemini = config.llm.defaultProvider === 'gemini';

beforeEach(async () => {
  if (isDefaultProviderAvailable) {
    service = new EnhancedLLMService(defaultProvider);
    
    // Añadir delay si usamos Gemini para evitar rate limiting
    if (isUsingGemini) {
      await delay(GEMINI_DELAY_MS);
    }
  }
});
```

### Ventajas:
- ✅ **Automático**: No requiere cambios manuales
- ✅ **Específico**: Solo aplica cuando se usa Gemini
- ✅ **Simple**: No requiere infraestructura adicional
- ✅ **Efectivo**: Elimina errores 429

### Desventajas:
- ⏱️ Los tests tardan más (aprox. 3-4 minutos para 29 tests)

---

## 🔄 Otras Soluciones Alternativas

### **Opción 2: Usar OpenAI en lugar de Gemini**

Cambiar el provider en `.env`:
```bash
# OpenAI tiene límites más altos (3,500 requests/minuto en tier gratuito)
LLM_DEFAULT_PROVIDER=openai
OPENAI_API_KEY=tu_api_key_aqui
```

**Ventajas:**
- ✅ Sin delays necesarios
- ✅ Tests más rápidos
- ✅ Límites mucho más altos

**Desventajas:**
- 💰 Requiere API key de OpenAI (de pago después de free tier)

---

### **Opción 3: Ejecutar Tests en Grupos Pequeños**

Ejecutar solo grupos de tests a la vez:

```bash
# Solo tests de intent extraction
npm test -- -t "Intent Extraction"

# Solo tests de response generation
npm test -- -t "Response Generation"

# Solo tests de context understanding
npm test -- -t "Context Understanding"
```

**Ventajas:**
- ✅ Evita acumular muchos requests
- ✅ Más control sobre qué testear
- ✅ Útil durante desarrollo

**Desventajas:**
- 🔧 Proceso manual
- 🔄 Hay que ejecutar múltiples comandos

---

### **Opción 4: Usar Mocks para Tests Unitarios**

Crear mocks de las respuestas del LLM para tests que no requieren API real:

```typescript
jest.mock('../../providers/gemini.provider', () => ({
  GeminiProvider: jest.fn().mockImplementation(() => ({
    generateResponse: jest.fn().mockResolvedValue({
      content: '{"intent": "consultar_menu", "confidence": 0.95}'
    })
  }))
}));
```

**Ventajas:**
- ✅ Sin límites de rate
- ✅ Tests instantáneos
- ✅ Sin costos de API
- ✅ Tests determinísticos

**Desventajas:**
- 🔧 Más trabajo de setup
- ⚠️ No prueba la integración real con el LLM

---

### **Opción 5: Upgrade a Gemini API Paid Tier**

Actualizar a un plan de pago de Google AI:

**Límites del tier de pago:**
- 🚀 1,000 requests por minuto
- 🚀 1,500,000 requests por día

**Ventajas:**
- ✅ Sin problemas de rate limit
- ✅ Mejor rendimiento

**Desventajas:**
- 💰 Costo mensual

---

### **Opción 6: Configurar Test Parallelization**

Ajustar Jest para ejecutar tests secuencialmente:

```javascript
// jest.config.js
module.exports = {
  maxWorkers: 1,  // Un solo worker (secuencial)
  testTimeout: 30000,  // Timeout más largo
};
```

**Ventajas:**
- ✅ Previene requests paralelos
- ✅ Más predecible

**Desventajas:**
- ⏱️ Tests aún más lentos

---

## 📊 Comparación de Soluciones

| Solución | Costo | Velocidad | Complejidad | Efectividad |
|----------|-------|-----------|-------------|-------------|
| **Delays (actual)** | ✅ Gratis | ⚠️ Lento | ✅ Simple | ✅ 100% |
| **OpenAI** | ⚠️ Pago | ✅ Rápido | ✅ Simple | ✅ 100% |
| **Grupos** | ✅ Gratis | ⚠️ Manual | ⚠️ Medio | ✅ 100% |
| **Mocks** | ✅ Gratis | ✅ Rápido | ⚠️ Complejo | ⚠️ Parcial |
| **Paid Tier** | ❌ Caro | ✅ Rápido | ✅ Simple | ✅ 100% |
| **Sequential** | ✅ Gratis | ❌ Muy lento | ✅ Simple | ✅ 100% |

---

## 🎯 Recomendación

**Para desarrollo y testing:**
1. ✅ **Usar delays automáticos** (solución actual) - Gratis y efectivo
2. 🔄 **Ejecutar grupos pequeños** durante desarrollo iterativo
3. 🚀 **Considerar OpenAI** si se necesita velocidad

**Para CI/CD en producción:**
1. ✅ **Mocks para tests unitarios** - Rápido y sin costos
2. 🔄 **Tests de integración limitados** con delays
3. 💰 **Paid tier** para tests completos frecuentes

---

## 📝 Notas Adicionales

### Límites Actuales de Gemini (Free Tier)
- 10 requests por minuto
- 1,500 requests por día
- Basado en modelo `gemini-2.0-flash-exp`

### Cómo Verificar tu Cuota
```bash
# Ver errores de rate limit en logs
npm test 2>&1 | grep "429"
```

### Documentación Oficial
- [Gemini API Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [OpenAI Rate Limits](https://platform.openai.com/docs/guides/rate-limits)

---

## 🚀 Estado Actual

✅ **Solución implementada**: Delays automáticos de 6.5s entre tests con Gemini  
✅ **Timeouts actualizados**: 25-30 segundos para permitir delays  
✅ **Tests funcionando**: Respeta límite de 10 requests/minuto  
✅ **Sin errores 429**: Rate limiting completamente solucionado  

**Los tests ahora pasan exitosamente, solo toman más tiempo! ⏱️**
