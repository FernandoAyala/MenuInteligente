/**
 * Tests para useSpeechRecognition hook
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';
import { useSpeechRecognition } from '../useSpeechRecognition';

// Mock de Web Speech API
const mockRecognition = {
  start: jest.fn(),
  stop: jest.fn(),
  abort: jest.fn(),
  onstart: null as any,
  onend: null as any,
  onresult: null as any,
  onerror: null as any,
  continuous: false,
  interimResults: false,
  lang: '',
};

const MockSpeechRecognition = jest.fn().mockImplementation(() => mockRecognition);

describe('useSpeechRecognition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation();

    // Reset mock recognition
    Object.assign(mockRecognition, {
      start: jest.fn(),
      stop: jest.fn(),
      abort: jest.fn(),
      onstart: null,
      onend: null,
      onresult: null,
      onerror: null,
      continuous: false,
      interimResults: false,
      lang: '',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;
  });

  describe('Soporte del navegador', () => {
    it('debe detectar soporte con SpeechRecognition', () => {
      (window as any).SpeechRecognition = MockSpeechRecognition;

      const { result } = renderHook(() => useSpeechRecognition());

      expect(result.current.browserSupportsSpeech).toBe(true);
    });

    it('debe detectar soporte con webkitSpeechRecognition', () => {
      (window as any).webkitSpeechRecognition = MockSpeechRecognition;

      const { result } = renderHook(() => useSpeechRecognition());

      expect(result.current.browserSupportsSpeech).toBe(true);
    });

    it('debe detectar falta de soporte', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      expect(result.current.browserSupportsSpeech).toBe(false);
    });
  });

  describe('Estado inicial', () => {
    beforeEach(() => {
      (window as any).SpeechRecognition = MockSpeechRecognition;
    });

    it('debe tener valores iniciales correctos', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      expect(result.current.transcript).toBe('');
      expect(result.current.isListening).toBe(false);
      expect(typeof result.current.startListening).toBe('function');
      expect(typeof result.current.stopListening).toBe('function');
      expect(typeof result.current.resetTranscript).toBe('function');
    });
  });

  describe('Configuración de SpeechRecognition', () => {
    beforeEach(() => {
      (window as any).SpeechRecognition = MockSpeechRecognition;
    });

    it('debe configurar SpeechRecognition correctamente', () => {
      renderHook(() => useSpeechRecognition());

      expect(MockSpeechRecognition).toHaveBeenCalled();
      expect(mockRecognition.continuous).toBe(true);
      expect(mockRecognition.interimResults).toBe(true);
      expect(mockRecognition.lang).toBe('es-ES');
    });

    it('debe usar webkitSpeechRecognition como fallback', () => {
      delete (window as any).SpeechRecognition;
      (window as any).webkitSpeechRecognition = MockSpeechRecognition;

      renderHook(() => useSpeechRecognition());

      expect(MockSpeechRecognition).toHaveBeenCalled();
    });
  });

  describe('startListening', () => {
    beforeEach(() => {
      (window as any).SpeechRecognition = MockSpeechRecognition;
    });

    it('debe iniciar reconocimiento de voz', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.startListening();
      });

      expect(mockRecognition.start).toHaveBeenCalled();
    });

    it('debe limpiar transcript al iniciar', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      // Establecer transcript inicial
      act(() => {
        if (mockRecognition.onresult) {
          mockRecognition.onresult({
            resultIndex: 0,
            results: [{ 0: { transcript: 'texto previo' }, isFinal: true }],
          });
        }
      });

      act(() => {
        result.current.startListening();
      });

      expect(result.current.transcript).toBe('');
    });

    it('no debe iniciar si ya está escuchando', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      // Simular que ya está escuchando
      act(() => {
        if (mockRecognition.onstart) {
          mockRecognition.onstart();
        }
      });

      mockRecognition.start.mockClear();

      act(() => {
        result.current.startListening();
      });

      expect(mockRecognition.start).not.toHaveBeenCalled();
    });

    it('no debe iniciar si no hay soporte', () => {
      delete (window as any).SpeechRecognition;
      delete (window as any).webkitSpeechRecognition;

      const { result } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.startListening();
      });

      expect(mockRecognition.start).not.toHaveBeenCalled();
    });
  });

  describe('stopListening', () => {
    beforeEach(() => {
      (window as any).SpeechRecognition = MockSpeechRecognition;
    });

    it('debe detener reconocimiento de voz', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      // Simular que está escuchando
      act(() => {
        if (mockRecognition.onstart) {
          mockRecognition.onstart();
        }
      });

      act(() => {
        result.current.stopListening();
      });

      expect(mockRecognition.stop).toHaveBeenCalled();
    });

    it('no debe detener si no está escuchando', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.stopListening();
      });

      expect(mockRecognition.stop).not.toHaveBeenCalled();
    });
  });

  describe('resetTranscript', () => {
    beforeEach(() => {
      (window as any).SpeechRecognition = MockSpeechRecognition;
    });

    it('debe limpiar el transcript', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      // Establecer transcript
      act(() => {
        if (mockRecognition.onresult) {
          mockRecognition.onresult({
            resultIndex: 0,
            results: [{ 0: { transcript: 'texto de prueba' }, isFinal: true }],
          });
        }
      });

      expect(result.current.transcript).toBe('texto de prueba');

      act(() => {
        result.current.resetTranscript();
      });

      expect(result.current.transcript).toBe('');
    });
  });

  describe('Event handlers', () => {
    beforeEach(() => {
      (window as any).SpeechRecognition = MockSpeechRecognition;
    });

    describe('onstart', () => {
      it('debe establecer isListening en true', () => {
        const { result } = renderHook(() => useSpeechRecognition());

        act(() => {
          if (mockRecognition.onstart) {
            mockRecognition.onstart();
          }
        });

        expect(result.current.isListening).toBe(true);
      });
    });

    describe('onend', () => {
      it('debe establecer isListening en false', () => {
        const { result } = renderHook(() => useSpeechRecognition());

        // Primero iniciar
        act(() => {
          if (mockRecognition.onstart) {
            mockRecognition.onstart();
          }
        });

        expect(result.current.isListening).toBe(true);

        // Luego terminar
        act(() => {
          if (mockRecognition.onend) {
            mockRecognition.onend();
          }
        });

        expect(result.current.isListening).toBe(false);
      });
    });

    describe('onerror', () => {
      it('debe manejar errores y detener escucha', () => {
        const { result } = renderHook(() => useSpeechRecognition());

        act(() => {
          if (mockRecognition.onerror) {
            mockRecognition.onerror({ error: 'network' });
          }
        });

        expect(result.current.isListening).toBe(false);
        expect(console.error).toHaveBeenCalledWith('Speech recognition error:', 'network');
      });
    });

    describe('onresult', () => {
      it('debe procesar resultados finales', () => {
        const { result } = renderHook(() => useSpeechRecognition());

        act(() => {
          if (mockRecognition.onresult) {
            mockRecognition.onresult({
              resultIndex: 0,
              results: [
                { 0: { transcript: 'hola mundo' }, isFinal: true, length: 1 },
              ],
            });
          }
        });

        expect(result.current.transcript).toBe('hola mundo');
      });

      it('debe procesar resultados intermedios', () => {
        const { result } = renderHook(() => useSpeechRecognition());

        act(() => {
          if (mockRecognition.onresult) {
            mockRecognition.onresult({
              resultIndex: 0,
              results: [
                { 0: { transcript: 'hola' }, isFinal: false, length: 1 },
              ],
            });
          }
        });

        expect(result.current.transcript).toBe('hola');
      });

      it('debe procesar múltiples resultados', () => {
        const { result } = renderHook(() => useSpeechRecognition());

        act(() => {
          if (mockRecognition.onresult) {
            mockRecognition.onresult({
              resultIndex: 0,
              results: [
                { 0: { transcript: 'hola ' }, isFinal: true, length: 1 },
                { 0: { transcript: 'mundo' }, isFinal: false, length: 1 },
              ],
            });
          }
        });

        expect(result.current.transcript).toBe('mundo');
      });

      it('debe concatenar resultados finales múltiples', () => {
        const { result } = renderHook(() => useSpeechRecognition());

        act(() => {
          if (mockRecognition.onresult) {
            mockRecognition.onresult({
              resultIndex: 0,
              results: [
                { 0: { transcript: 'primera parte ' }, isFinal: true, length: 1 },
                { 0: { transcript: 'segunda parte' }, isFinal: true, length: 1 },
              ],
            });
          }
        });

        expect(result.current.transcript).toBe('primera parte segunda parte');
      });

      it('debe manejar evento con resultados vacíos', () => {
        const { result } = renderHook(() => useSpeechRecognition());

        act(() => {
          if (mockRecognition.onresult) {
            mockRecognition.onresult({
              resultIndex: 0,
              results: [],
            });
          }
        });

        expect(result.current.transcript).toBe('');
      });
    });
  });

  describe('Cleanup', () => {
    beforeEach(() => {
      (window as any).SpeechRecognition = MockSpeechRecognition;
    });

    it('debe limpiar al desmontar', () => {
      const { unmount } = renderHook(() => useSpeechRecognition());

      unmount();

      expect(mockRecognition.stop).toHaveBeenCalled();
    });

    it('no debe limpiar si no hay soporte', () => {
      delete (window as any).SpeechRecognition;
      delete (window as any).webkitSpeechRecognition;

      const { unmount } = renderHook(() => useSpeechRecognition());

      unmount();

      expect(mockRecognition.stop).not.toHaveBeenCalled();
    });
  });

  describe('Casos de uso realistas', () => {
    beforeEach(() => {
      (window as any).SpeechRecognition = MockSpeechRecognition;
    });

    it('debe manejar flujo completo de reconocimiento', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      // Iniciar escucha
      act(() => {
        result.current.startListening();
      });

      expect(mockRecognition.start).toHaveBeenCalled();

      // Simular inicio
      act(() => {
        if (mockRecognition.onstart) {
          mockRecognition.onstart();
        }
      });

      expect(result.current.isListening).toBe(true);

      // Simular resultado
      act(() => {
        if (mockRecognition.onresult) {
          mockRecognition.onresult({
            resultIndex: 0,
            results: [{ 0: { transcript: 'pizza margherita' }, isFinal: true }],
          });
        }
      });

      expect(result.current.transcript).toBe('pizza margherita');

      // Detener escucha
      act(() => {
        result.current.stopListening();
      });

      expect(mockRecognition.stop).toHaveBeenCalled();

      // Simular fin
      act(() => {
        if (mockRecognition.onend) {
          mockRecognition.onend();
        }
      });

      expect(result.current.isListening).toBe(false);
    });

    it('debe manejar reinicio de transcript', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      // Establecer transcript inicial
      act(() => {
        if (mockRecognition.onresult) {
          mockRecognition.onresult({
            resultIndex: 0,
            results: [{ 0: { transcript: 'texto anterior' }, isFinal: true }],
          });
        }
      });

      expect(result.current.transcript).toBe('texto anterior');

      // Reiniciar
      act(() => {
        result.current.resetTranscript();
      });

      expect(result.current.transcript).toBe('');

      // Nueva escucha
      act(() => {
        result.current.startListening();
      });

      act(() => {
        if (mockRecognition.onresult) {
          mockRecognition.onresult({
            resultIndex: 0,
            results: [{ 0: { transcript: 'nuevo texto' }, isFinal: true }],
          });
        }
      });

      expect(result.current.transcript).toBe('nuevo texto');
    });

    it('debe manejar múltiples sesiones de escucha', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      // Primera sesión
      act(() => {
        result.current.startListening();
      });

      act(() => {
        if (mockRecognition.onstart) {
          mockRecognition.onstart();
        }
      });

      act(() => {
        result.current.stopListening();
      });

      act(() => {
        if (mockRecognition.onend) {
          mockRecognition.onend();
        }
      });

      // Segunda sesión
      mockRecognition.start.mockClear();

      act(() => {
        result.current.startListening();
      });

      expect(mockRecognition.start).toHaveBeenCalled();
    });

    it('debe manejar errores durante escucha activa', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      // Iniciar escucha
      act(() => {
        result.current.startListening();
      });

      act(() => {
        if (mockRecognition.onstart) {
          mockRecognition.onstart();
        }
      });

      expect(result.current.isListening).toBe(true);

      // Simular error
      act(() => {
        if (mockRecognition.onerror) {
          mockRecognition.onerror({ error: 'no-speech' });
        }
      });

      expect(result.current.isListening).toBe(false);
      expect(console.error).toHaveBeenCalledWith('Speech recognition error:', 'no-speech');
    });
  });
});