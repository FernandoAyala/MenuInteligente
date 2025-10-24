/**
 * Tests para useTextToSpeech hook
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useTextToSpeech } from '../useTextToSpeech';

// Mock de SpeechSynthesis API
const mockUtterance = {
  text: '',
  voice: null,
  rate: 1,
  pitch: 1,
  volume: 1,
  onstart: null as any,
  onend: null as any,
  onerror: null as any,
};

const mockSpeechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  getVoices: jest.fn(),
  speaking: false,
  pending: false,
  paused: false,
  onvoiceschanged: null as any,
};

const MockSpeechSynthesisUtterance = jest.fn().mockImplementation((text: string) => {
  return { ...mockUtterance, text };
});

const mockVoices: SpeechSynthesisVoice[] = [
  {
    name: 'Google Español',
    lang: 'es-ES',
    voiceURI: 'Google Español',
    localService: false,
    default: false,
  } as SpeechSynthesisVoice,
  {
    name: 'Microsoft Helena - Spanish (Spain)',
    lang: 'es-ES',
    voiceURI: 'Microsoft Helena - Spanish (Spain)',
    localService: true,
    default: false,
  } as SpeechSynthesisVoice,
  {
    name: 'Alex',
    lang: 'en-US',
    voiceURI: 'Alex',
    localService: true,
    default: true,
  } as SpeechSynthesisVoice,
];

describe('useTextToSpeech', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(window, 'alert').mockImplementation();
    jest.spyOn(window, 'setTimeout').mockImplementation((fn) => {
      fn();
      return 1 as any;
    });

    // Setup global mocks
    (global as any).speechSynthesis = mockSpeechSynthesis;
    (global as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;

    // Reset mock values
    Object.assign(mockSpeechSynthesis, {
      speak: jest.fn(),
      cancel: jest.fn(),
      getVoices: jest.fn().mockReturnValue(mockVoices),
      speaking: false,
      pending: false,
      paused: false,
      onvoiceschanged: null,
    });

    Object.assign(mockUtterance, {
      text: '',
      voice: null,
      rate: 1,
      pitch: 1,
      volume: 1,
      onstart: null,
      onend: null,
      onerror: null,
    });
  });

  afterEach(() => {
    // Cleanup but keep speechSynthesis available during unmount
    jest.restoreAllMocks();
    // Keep mock active for cleanup
  });

  describe('Inicialización', () => {
    it('debe tener valores iniciales correctos', () => {
      const { result } = renderHook(() => useTextToSpeech());

      expect(result.current.isSpeaking).toBe(false);
      expect(result.current.rate).toBe(1);
      expect(result.current.pitch).toBe(1);
      expect(result.current.volume).toBe(1);
      expect(result.current.voices).toEqual(mockVoices);
      expect(typeof result.current.speak).toBe('function');
      expect(typeof result.current.stop).toBe('function');
    });

    it('debe cargar voces al inicializar', () => {
      const { result } = renderHook(() => useTextToSpeech());

      expect(mockSpeechSynthesis.getVoices).toHaveBeenCalled();
      expect(result.current.voices).toEqual(mockVoices);
    });

    it('debe seleccionar voz en español automáticamente', () => {
      const { result } = renderHook(() => useTextToSpeech());

      expect(result.current.selectedVoice).toEqual(mockVoices[0]); // Google Español
      expect(console.log).toHaveBeenCalledWith(
        '🎤 Seleccionando voz en español:',
        'Google Español'
      );
    });

    it('debe configurar event listener para cambio de voces', () => {
      renderHook(() => useTextToSpeech());

      expect(mockSpeechSynthesis.onvoiceschanged).toBeDefined();
    });
  });

  describe('speak', () => {
    it('debe crear utterance y iniciar síntesis', () => {
      const { result } = renderHook(() => useTextToSpeech());

      act(() => {
        result.current.speak('Hola mundo');
      });

      expect(MockSpeechSynthesisUtterance).toHaveBeenCalledWith('Hola mundo');
      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled(); // Cancela cualquier síntesis previa
      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
    });

    it('debe configurar propiedades del utterance', () => {
      const { result } = renderHook(() => useTextToSpeech());

      // Configurar propiedades personalizadas
      act(() => {
        result.current.setRate(1.5);
        result.current.setPitch(1.2);
        result.current.setVolume(0.8);
      });

      act(() => {
        result.current.speak('Texto de prueba');
      });

      const utteranceCall = MockSpeechSynthesisUtterance.mock.results[0].value;
      expect(utteranceCall.rate).toBe(1.5);
      expect(utteranceCall.pitch).toBe(1.2);
      expect(utteranceCall.volume).toBe(0.8);
    });

    it('debe usar voz seleccionada', () => {
      const { result } = renderHook(() => useTextToSpeech());

      const customVoice = mockVoices[1];
      act(() => {
        result.current.setSelectedVoice(customVoice);
      });

      act(() => {
        result.current.speak('Texto con voz personalizada');
      });

      const utteranceCall = MockSpeechSynthesisUtterance.mock.results[0].value;
      expect(utteranceCall.voice).toBe(customVoice);
    });

    it('debe manejar falta de soporte de navegador', () => {
      delete (global as any).speechSynthesis;

      const { result } = renderHook(() => useTextToSpeech());

      act(() => {
        result.current.speak('Texto de prueba');
      });

      expect(console.error).toHaveBeenCalledWith(
        '❌ Speech Synthesis no soportado en este navegador'
      );
      expect(window.alert).toHaveBeenCalledWith(
        'Tu navegador no soporta síntesis de voz. Intenta con Chrome, Edge o Safari.'
      );
    });

    it('debe establecer estado de isSpeaking cuando inicia', () => {
      const { result } = renderHook(() => useTextToSpeech());

      act(() => {
        result.current.speak('Texto de prueba');
      });

      const utteranceCall = MockSpeechSynthesisUtterance.mock.results[0].value;

      act(() => {
        utteranceCall.onstart();
      });

      expect(result.current.isSpeaking).toBe(true);
      expect(console.log).toHaveBeenCalledWith('✅ Síntesis de voz iniciada');
    });

    it('debe limpiar estado cuando termina', () => {
      const { result } = renderHook(() => useTextToSpeech());

      act(() => {
        result.current.speak('Texto de prueba');
      });

      const utteranceCall = MockSpeechSynthesisUtterance.mock.results[0].value;

      // Iniciar
      act(() => {
        utteranceCall.onstart();
      });

      expect(result.current.isSpeaking).toBe(true);

      // Terminar
      act(() => {
        utteranceCall.onend();
      });

      expect(result.current.isSpeaking).toBe(false);
      expect(console.log).toHaveBeenCalledWith('✅ Síntesis de voz completada');
    });

    it('debe manejar errores', () => {
      const { result } = renderHook(() => useTextToSpeech());

      act(() => {
        result.current.speak('Texto de prueba');
      });

      const utteranceCall = MockSpeechSynthesisUtterance.mock.results[0].value;

      const errorEvent = { error: 'network', type: 'error' };

      act(() => {
        utteranceCall.onerror(errorEvent);
      });

      expect(result.current.isSpeaking).toBe(false);
      expect(console.error).toHaveBeenCalledWith('❌ Error en síntesis de voz:', errorEvent);
    });

    it('debe loguear estado después de iniciar', () => {
      const { result } = renderHook(() => useTextToSpeech());

      mockSpeechSynthesis.speaking = true;
      mockSpeechSynthesis.pending = false;
      mockSpeechSynthesis.paused = false;

      act(() => {
        result.current.speak('Texto de prueba');
      });

      expect(console.log).toHaveBeenCalledWith('📊 Estado después de 100ms:', {
        speaking: true,
        pending: false,
        paused: false,
      });
    });
  });

  describe('stop', () => {
    it('debe cancelar síntesis y limpiar estado', () => {
      const { result } = renderHook(() => useTextToSpeech());

      // Establecer estado de hablando
      act(() => {
        result.current.speak('Texto de prueba');
      });

      const utteranceCall = MockSpeechSynthesisUtterance.mock.results[0].value;
      act(() => {
        utteranceCall.onstart();
      });

      expect(result.current.isSpeaking).toBe(true);

      // Detener
      act(() => {
        result.current.stop();
      });

      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
      expect(result.current.isSpeaking).toBe(false);
    });
  });

  describe('Configuración de propiedades', () => {
    it('debe actualizar rate', () => {
      const { result } = renderHook(() => useTextToSpeech());

      act(() => {
        result.current.setRate(2.0);
      });

      expect(result.current.rate).toBe(2.0);
    });

    it('debe actualizar pitch', () => {
      const { result } = renderHook(() => useTextToSpeech());

      act(() => {
        result.current.setPitch(1.5);
      });

      expect(result.current.pitch).toBe(1.5);
    });

    it('debe actualizar volume', () => {
      const { result } = renderHook(() => useTextToSpeech());

      act(() => {
        result.current.setVolume(0.5);
      });

      expect(result.current.volume).toBe(0.5);
    });

    it('debe actualizar voz seleccionada', () => {
      const { result } = renderHook(() => useTextToSpeech());

      const newVoice = mockVoices[2];

      act(() => {
        result.current.setSelectedVoice(newVoice);
      });

      expect(result.current.selectedVoice).toBe(newVoice);
    });
  });

  describe('Manejo de voces', () => {
    it('debe actualizar voces cuando cambian', () => {
      const { result } = renderHook(() => useTextToSpeech());

      const newVoices = [mockVoices[0]];
      mockSpeechSynthesis.getVoices.mockReturnValue(newVoices);

      act(() => {
        if (mockSpeechSynthesis.onvoiceschanged) {
          mockSpeechSynthesis.onvoiceschanged();
        }
      });

      expect(result.current.voices).toEqual(newVoices);
    });

    it('debe encontrar voz con nombre que incluya Spanish', () => {
      const spanishNameVoice = {
        name: 'Natural Spanish Voice',
        lang: 'en-US',
        voiceURI: 'Natural Spanish Voice',
        localService: true,
        default: false,
      } as SpeechSynthesisVoice;

      const voicesWithSpanishName = [spanishNameVoice, ...mockVoices.slice(2)];
      mockSpeechSynthesis.getVoices.mockReturnValue(voicesWithSpanishName);

      const { result } = renderHook(() => useTextToSpeech());

      expect(result.current.selectedVoice).toBe(spanishNameVoice);
    });

    it('no debe cambiar voz si ya hay una seleccionada', () => {
      const { result } = renderHook(() => useTextToSpeech());

      const initialVoice = result.current.selectedVoice;

      // Simular cambio de voces con nueva voz en español
      const newSpanishVoice = {
        name: 'Nueva Voz Española',
        lang: 'es-MX',
        voiceURI: 'Nueva Voz Española',
        localService: true,
        default: false,
      } as SpeechSynthesisVoice;

      mockSpeechSynthesis.getVoices.mockReturnValue([newSpanishVoice, ...mockVoices]);

      act(() => {
        if (mockSpeechSynthesis.onvoiceschanged) {
          mockSpeechSynthesis.onvoiceschanged();
        }
      });

      // No debe cambiar la voz ya seleccionada
      expect(result.current.selectedVoice).toBe(initialVoice);
    });
  });

  describe('Cleanup', () => {
    it('debe limpiar event listener al desmontar', () => {
      const { unmount } = renderHook(() => useTextToSpeech());

      unmount();

      expect(mockSpeechSynthesis.onvoiceschanged).toBe(null);
    });
  });

  describe('Casos de uso realistas', () => {
    it('debe manejar flujo completo de síntesis', () => {
      const { result } = renderHook(() => useTextToSpeech());

      // Configurar voz y propiedades
      act(() => {
        result.current.setSelectedVoice(mockVoices[1]);
        result.current.setRate(1.2);
        result.current.setPitch(1.1);
        result.current.setVolume(0.9);
      });

      // Iniciar síntesis
      act(() => {
        result.current.speak('Pizza Margherita disponible en mesa 5');
      });

      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();

      const utteranceCall = MockSpeechSynthesisUtterance.mock.results[0].value;
      expect(utteranceCall.text).toBe('Pizza Margherita disponible en mesa 5');
      expect(utteranceCall.voice).toBe(mockVoices[1]);
      expect(utteranceCall.rate).toBe(1.2);
      expect(utteranceCall.pitch).toBe(1.1);
      expect(utteranceCall.volume).toBe(0.9);

      // Simular inicio
      act(() => {
        utteranceCall.onstart();
      });

      expect(result.current.isSpeaking).toBe(true);

      // Simular finalización
      act(() => {
        utteranceCall.onend();
      });

      expect(result.current.isSpeaking).toBe(false);
    });

    it('debe manejar múltiples síntesis secuenciales', () => {
      const { result } = renderHook(() => useTextToSpeech());

      // Primera síntesis
      act(() => {
        result.current.speak('Primer mensaje');
      });

      let firstUtterance = MockSpeechSynthesisUtterance.mock.results[0].value;

      act(() => {
        firstUtterance.onstart();
      });

      expect(result.current.isSpeaking).toBe(true);

      act(() => {
        firstUtterance.onend();
      });

      expect(result.current.isSpeaking).toBe(false);

      // Segunda síntesis
      act(() => {
        result.current.speak('Segundo mensaje');
      });

      let secondUtterance = MockSpeechSynthesisUtterance.mock.results[1].value;

      expect(mockSpeechSynthesis.cancel).toHaveBeenCalledTimes(2); // Una por cada speak
      expect(mockSpeechSynthesis.speak).toHaveBeenCalledTimes(2);
    });

    it('debe manejar interrupción manual', () => {
      const { result } = renderHook(() => useTextToSpeech());

      // Iniciar síntesis
      act(() => {
        result.current.speak('Mensaje largo que será interrumpido');
      });

      const utteranceCall = MockSpeechSynthesisUtterance.mock.results[0].value;

      act(() => {
        utteranceCall.onstart();
      });

      expect(result.current.isSpeaking).toBe(true);

      // Interrumpir manualmente
      act(() => {
        result.current.stop();
      });

      expect(result.current.isSpeaking).toBe(false);
      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
    });

    it('debe manejar error durante síntesis activa', () => {
      const { result } = renderHook(() => useTextToSpeech());

      act(() => {
        result.current.speak('Mensaje que fallará');
      });

      const utteranceCall = MockSpeechSynthesisUtterance.mock.results[0].value;

      act(() => {
        utteranceCall.onstart();
      });

      expect(result.current.isSpeaking).toBe(true);

      // Simular error
      act(() => {
        utteranceCall.onerror({ error: 'interrupted', type: 'error' });
      });

      expect(result.current.isSpeaking).toBe(false);
      expect(console.error).toHaveBeenCalledWith('❌ Error en síntesis de voz:', {
        error: 'interrupted',
        type: 'error',
      });
    });
  });
});