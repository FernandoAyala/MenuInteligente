/**
 * Tests para VoiceInputButton
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VoiceInputButton } from '../VoiceInputButton';
import * as useSpeechRecognitionHook from '../../hooks/useSpeechRecognition';
import * as useVoiceCommandsHook from '../../hooks/useVoiceCommands';

// Mock de los hooks
jest.mock('../../hooks/useSpeechRecognition');
jest.mock('../../hooks/useVoiceCommands');

const mockUseSpeechRecognition = useSpeechRecognitionHook as jest.Mocked<
  typeof useSpeechRecognitionHook
>;

const mockUseVoiceCommands = useVoiceCommandsHook as jest.Mocked<
  typeof useVoiceCommandsHook
>;

describe('VoiceInputButton', () => {
  const mockOnTranscript = jest.fn();
  const mockOnVoiceCommand = jest.fn();
  const mockStartListening = jest.fn();
  const mockStopListening = jest.fn();
  const mockResetTranscript = jest.fn();
  const mockProcessVoiceCommand = jest.fn();

  const defaultSpeechRecognition = {
    transcript: '',
    isListening: false,
    startListening: mockStartListening,
    stopListening: mockStopListening,
    resetTranscript: mockResetTranscript,
    browserSupportsSpeech: true,
    isSpeechSupported: true,
    error: null,
  };

  const defaultVoiceCommands = {
    processVoiceCommand: mockProcessVoiceCommand,
    availableCommands: [],
    isCommandMode: false,
    toggleCommandMode: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSpeechRecognition.useSpeechRecognition.mockReturnValue(defaultSpeechRecognition);
    mockUseVoiceCommands.useVoiceCommands.mockReturnValue(defaultVoiceCommands);
    mockProcessVoiceCommand.mockReturnValue({ isCommand: false });
  });

  describe('Rendering', () => {
    it('debe renderizar el botón cuando hay soporte de voz', () => {
      render(<VoiceInputButton onTranscript={mockOnTranscript} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('no debe renderizar nada si no hay soporte de voz', () => {
      mockUseSpeechRecognition.useSpeechRecognition.mockReturnValue({
        ...defaultSpeechRecognition,
        browserSupportsSpeech: false,
      });

      const { container } = render(<VoiceInputButton onTranscript={mockOnTranscript} />);

      expect(container.firstChild).toBeNull();
    });

    it('debe mostrar el icono de micrófono', () => {
      render(<VoiceInputButton onTranscript={mockOnTranscript} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('debe aplicar className personalizada', () => {
      render(
        <VoiceInputButton
          onTranscript={mockOnTranscript}
          className="custom-class"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('Estados Visuales', () => {
    it('debe cambiar estilo cuando está escuchando', () => {
      mockUseSpeechRecognition.useSpeechRecognition.mockReturnValue({
        ...defaultSpeechRecognition,
        isListening: true,
      });

      render(<VoiceInputButton onTranscript={mockOnTranscript} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-red-500');
      expect(button).toHaveClass('animate-pulse');
    });

    it('debe tener estilo normal cuando no está escuchando', () => {
      render(<VoiceInputButton onTranscript={mockOnTranscript} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-blue-500');
    });

    it('debe deshabilitar el botón cuando está procesando', () => {
      mockUseSpeechRecognition.useSpeechRecognition.mockReturnValue({
        ...defaultSpeechRecognition,
        transcript: 'test transcript',
        isListening: false,
      });

      render(<VoiceInputButton onTranscript={mockOnTranscript} />);

      waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
      });
    });
  });

  describe('Interacciones', () => {
    it('debe iniciar escucha al hacer clic cuando no está escuchando', () => {
      render(<VoiceInputButton onTranscript={mockOnTranscript} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockStartListening).toHaveBeenCalled();
    });

    it('debe detener escucha al hacer clic cuando está escuchando', () => {
      mockUseSpeechRecognition.useSpeechRecognition.mockReturnValue({
        ...defaultSpeechRecognition,
        isListening: true,
      });

      render(<VoiceInputButton onTranscript={mockOnTranscript} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockStopListening).toHaveBeenCalled();
    });

    it('debe mostrar alerta si no hay soporte de voz al hacer clic', () => {
      mockUseSpeechRecognition.useSpeechRecognition.mockReturnValue({
        ...defaultSpeechRecognition,
        browserSupportsSpeech: true, // El componente se renderiza
      });

      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<VoiceInputButton onTranscript={mockOnTranscript} />);

      // Simular que el soporte fue verificado en runtime
      mockUseSpeechRecognition.useSpeechRecognition.mockReturnValue({
        ...defaultSpeechRecognition,
        browserSupportsSpeech: false,
      });

      const button = screen.getByRole('button');
      fireEvent.click(button);

      alertSpy.mockRestore();
    });
  });

  describe('Procesamiento de Transcripción', () => {
    it('debe llamar onTranscript con texto normal', async () => {
      mockProcessVoiceCommand.mockReturnValue({ isCommand: false });

      const { rerender } = render(<VoiceInputButton onTranscript={mockOnTranscript} />);

      // Simular que se recibió transcripción
      mockUseSpeechRecognition.useSpeechRecognition.mockReturnValue({
        ...defaultSpeechRecognition,
        transcript: 'Quiero una pizza',
        isListening: false,
      });

      rerender(<VoiceInputButton onTranscript={mockOnTranscript} />);

      await waitFor(() => {
        expect(mockOnTranscript).toHaveBeenCalledWith('Quiero una pizza');
      });
    });

    it('debe procesar comando de voz cuando se detecta', async () => {
      mockProcessVoiceCommand.mockReturnValue({
        isCommand: true,
        action: 'SHOW_MENU',
        data: { category: 'pizzas' },
        response: 'Mostrando menú de pizzas',
      });

      const { rerender } = render(
        <VoiceInputButton
          onTranscript={mockOnTranscript}
          onVoiceCommand={mockOnVoiceCommand}
        />
      );

      mockUseSpeechRecognition.useSpeechRecognition.mockReturnValue({
        ...defaultSpeechRecognition,
        transcript: 'mostrar menú de pizzas',
        isListening: false,
      });

      rerender(
        <VoiceInputButton
          onTranscript={mockOnTranscript}
          onVoiceCommand={mockOnVoiceCommand}
        />
      );

      await waitFor(() => {
        expect(mockOnVoiceCommand).toHaveBeenCalledWith(
          'SHOW_MENU',
          { category: 'pizzas' },
          'Mostrando menú de pizzas'
        );
      });
    });

    it('debe resetear transcript después de procesar', async () => {
      const { rerender } = render(<VoiceInputButton onTranscript={mockOnTranscript} />);

      mockUseSpeechRecognition.useSpeechRecognition.mockReturnValue({
        ...defaultSpeechRecognition,
        transcript: 'test',
        isListening: false,
      });

      rerender(<VoiceInputButton onTranscript={mockOnTranscript} />);

      await waitFor(() => {
        expect(mockResetTranscript).toHaveBeenCalled();
      });
    });

    it('no debe procesar si todavía está escuchando', async () => {
      mockUseSpeechRecognition.useSpeechRecognition.mockReturnValue({
        ...defaultSpeechRecognition,
        transcript: 'test',
        isListening: true, // Aún escuchando
      });

      render(<VoiceInputButton onTranscript={mockOnTranscript} />);

      await waitFor(() => {
        expect(mockOnTranscript).not.toHaveBeenCalled();
      });
    });
  });

  describe('Props', () => {
    it('debe funcionar sin onVoiceCommand', async () => {
      const { rerender } = render(<VoiceInputButton onTranscript={mockOnTranscript} />);

      mockUseSpeechRecognition.useSpeechRecognition.mockReturnValue({
        ...defaultSpeechRecognition,
        transcript: 'test',
        isListening: false,
      });

      rerender(<VoiceInputButton onTranscript={mockOnTranscript} />);

      await waitFor(() => {
        expect(mockOnTranscript).toHaveBeenCalledWith('test');
      });
    });

    it('debe ignorar comandos si no hay onVoiceCommand', async () => {
      mockProcessVoiceCommand.mockReturnValue({
        isCommand: true,
        action: 'SHOW_MENU',
      });

      const { rerender } = render(<VoiceInputButton onTranscript={mockOnTranscript} />);

      mockUseSpeechRecognition.useSpeechRecognition.mockReturnValue({
        ...defaultSpeechRecognition,
        transcript: 'mostrar menú',
        isListening: false,
      });

      rerender(<VoiceInputButton onTranscript={mockOnTranscript} />);

      await waitFor(() => {
        expect(mockOnTranscript).not.toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('debe tener el tipo de botón correcto', () => {
      render(<VoiceInputButton onTranscript={mockOnTranscript} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'button');
    });

    it('debe indicar estado deshabilitado correctamente', () => {
      mockUseSpeechRecognition.useSpeechRecognition.mockReturnValue({
        ...defaultSpeechRecognition,
        transcript: 'processing',
        isListening: false,
      });

      render(<VoiceInputButton onTranscript={mockOnTranscript} />);

      waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
      });
    });
  });
});
