# Proveedores LLM

El directorio "providers' contiene las implementaciones de proveedores LLM.

## 📁 Estructura

```
providers/
├── openai.provider.ts    # Adapter para OpenAI (GPT-4, GPT-3.5, etc)
├── gemini.provider.ts    # Adapter para Google Gemini
└── llm.factory.ts        # Factory para crear e instanciar proveedores
```

## 🎯 Objetivo

Abstraer la complejidad de diferentes APIs de LLM detrás de una interfaz común (`ILLMProvider`), permitiendo:

- Cambiar de proveedor sin modificar el código del servicio
- Agregar nuevos proveedores fácilmente
- Testear con mocks
- Implementar estrategias de failover y balanceo