# 🎤 Agente de Voz - Funcionalidades Implementadas

## ✨ **Nuevas Características de Voz**

Tu aplicación de chat ahora incluye un **agente de voz completo** con las siguientes funcionalidades:

### **🎤 Entrada de Voz (Speech-to-Text)**
- **Ubicación**: Botón de micrófono en la barra de input del chat
- **Función**: Convierte tu voz a texto automáticamente
- **Cómo usar**:
  1. Haz clic en el botón del micrófono 🎤
  2. Habla claramente tu mensaje
  3. El texto aparecerá automáticamente y se enviará al chat
- **Estados visuales**:
  - 🔵 Azul: Listo para grabar
  - 🔴 Rojo pulsante: Grabando (con indicador "Escuchando...")
  - Muestra el texto en tiempo real mientras hablas

### **🔊 Salida de Voz (Text-to-Speech)**
- **Ubicación**: Botón de altavoz en mensajes del bot (aparece al pasar el mouse)
- **Función**: Reproduce audiblemente las respuestas del asistente
- **Cómo usar**:
  1. Pasa el mouse sobre cualquier mensaje del bot
  2. Haz clic en el botón 🔊 que aparece
  3. Escucha la respuesta reproducida con voz sintetizada
- **Funciones**:
  - ⏸️ Detener reproducción haciendo clic nuevamente
  - 🧹 Limpieza automática de emojis para mejor pronunciación
  - 💱 Conversión de símbolos ($ → "pesos")

### **⚙️ Configuración de Voz**
- **Ubicación**: Botón de engrane ⚙️ en la esquina superior derecha
- **Configuraciones disponibles**:
  - **Voz**: Selecciona entre voces disponibles en español/inglés
  - **Velocidad**: 0.5x a 2.0x (ajustable)
  - **Tono**: 0.5 a 2.0 (ajustable)
  - **Volumen**: 0% a 100%
  - **Prueba**: Botón para probar la configuración

## 🌐 **Tecnologías Utilizadas**

### **Web Speech API**
- **Speech Recognition**: Para convertir voz a texto
- **Speech Synthesis**: Para convertir texto a voz
- **Soporte**: Chrome, Edge, Safari (navegadores modernos)

### **Custom Hooks Implementados**
```typescript
// Entrada de voz
useSpeechRecognition()
- transcript: string
- isListening: boolean
- startListening()
- stopListening()
- resetTranscript()
- browserSupportsSpeech: boolean

// Salida de voz  
useTextToSpeech()
- speak(text: string)
- stop()
- isSpeaking: boolean
- voices: SpeechSynthesisVoice[]
- selectedVoice, rate, pitch, volume
```

## 📱 **Compatibilidad**

### **✅ Navegadores Soportados**
- **Chrome**: Soporte completo
- **Edge**: Soporte completo
- **Safari**: Soporte completo
- **Firefox**: Limitado (solo Text-to-Speech)

### **⚠️ Requisitos**
- **Micrófono**: Necesario para entrada de voz
- **Altavoces/Audífonos**: Para escuchar las respuestas
- **Permisos**: El navegador solicitará permisos de micrófono

## 🔧 **Archivos Implementados**

```
src/
├── hooks/
│   ├── useSpeechRecognition.ts    # Hook para entrada de voz
│   └── useTextToSpeech.ts         # Hook para salida de voz
├── components/
│   ├── VoiceInputButton.tsx       # Botón de entrada de voz
│   ├── VoiceOutputButton.tsx      # Botón de salida de voz
│   └── VoiceSettings.tsx          # Panel de configuración
└── components/
    ├── InputArea.tsx              # Integrado con voz
    ├── MessageBubble.tsx          # Integrado con voz
    └── ChatContainer.tsx          # Botón de configuración
```

## 🚀 **Funcionalidades Avanzadas**

### **Inteligencia en el Procesamiento**
- **Limpieza de texto**: Automática para mejor pronunciación
- **Detección de idioma**: Prioriza voces en español
- **Feedback visual**: Estados claros para el usuario
- **Persistencia**: Configuraciones guardadas en la sesión

### **UX/UI Mejorado**
- **Indicadores en tiempo real**: Durante grabación y reproducción
- **Animaciones suaves**: Transiciones fluidas
- **Estados hover**: Botones aparecen cuando son necesarios
- **Responsive**: Funciona en móviles y desktop

## 💡 **Casos de Uso**

1. **🍕 Pedido por Voz**: "Quiero una pizza margherita grande"
2. **🔍 Consultas Rápidas**: "¿Qué opciones vegetarianas tienen?"
3. **♿ Accesibilidad**: Usuarios con dificultades para escribir
4. **📱 Mobile**: Más fácil que escribir en pantalla pequeña
5. **🚗 Manos Libres**: Mientras manejas o cocinas

## 🔒 **Privacidad**

- **Procesamiento Local**: La voz se procesa en el navegador
- **Sin Servidores**: No se envía audio a servidores externos
- **Web Speech API**: Usa la API nativa del sistema operativo
- **Sin Almacenamiento**: No se guardan grabaciones de voz

## 🎯 **Próximas Mejoras**

- **Comandos de Voz**: "Agregar al carrito", "Mostrar menú"
- **Múltiples Idiomas**: Detección automática de idioma
- **Voces Premium**: Integración con servicios como Elevenlabs
- **Interrupciones**: Poder interrumpir al bot mientras habla
- **Hotkeys**: Atajos de teclado para activar voz (Ctrl+Space)

---

¡Disfruta de tu nuevo asistente de voz! 🎉