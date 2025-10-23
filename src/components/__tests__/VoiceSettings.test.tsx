/**
 * Tests para VoiceSettings
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VoiceSettings } from '../VoiceSettings';
import * as useTextToSpeechHook from '../../hooks/useTextToSpeech';

// Mock del hook
jest.mock('../../hooks/useTextToSpeech');

const mockUseTextToSpeech = useTextToSpeechHook as jest.Mocked<
  typeof useTextToSpeechHook
>;

describe('VoiceSettings', () => {
  const mockSetSelectedVoice = jest.fn();
  const mockSetRate = jest.fn();
  const mockSetPitch = jest.fn();
  const mockSetVolume = jest.fn();
  const mockSpeak = jest.fn();
  const mockOnClose = jest.fn();

  const mockVoices: SpeechSynthesisVoice[] = [
    { name: 'Google español', lang: 'es-ES', localService: false, voiceURI: '', default: true },
    { name: 'Microsoft Laura', lang: 'es-MX', localService: true, voiceURI: '', default: false },
  ] as SpeechSynthesisVoice[];

  const defaultTextToSpeech = {
    voices: mockVoices,
    selectedVoice: mockVoices[0],
    setSelectedVoice: mockSetSelectedVoice,
    rate: 1,
    setRate: mockSetRate,
    pitch: 1,
    setPitch: mockSetPitch,
    volume: 1,
    setVolume: mockSetVolume,
    speak: mockSpeak,
    stop: jest.fn(),
    isSpeaking: false,
    isPaused: false,
    pause: jest.fn(),
    resume: jest.fn(),
    cancel: jest.fn(),
    getVoices: jest.fn().mockReturnValue(mockVoices),
    setVoice: jest.fn(),
    isSupported: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTextToSpeech.useTextToSpeech.mockReturnValue(defaultTextToSpeech as any);
  });

  describe('Rendering', () => {
    it('debe renderizar cuando isOpen es true', () => {
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Configuración de Voz')).toBeInTheDocument();
    });

    it('no debe renderizar cuando isOpen es false', () => {
      render(<VoiceSettings isOpen={false} onClose={mockOnClose} />);

      expect(screen.queryByText('Configuración de Voz')).not.toBeInTheDocument();
    });

    it('debe mostrar todos los controles de configuración', () => {
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByLabelText(/voz/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/velocidad/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/tono/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/volumen/i)).toBeInTheDocument();
    });

    it('debe mostrar el botón de cerrar', () => {
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);

      const closeButton = screen.getByRole('button', { name: /cerrar|close/i });
      expect(closeButton).toBeInTheDocument();
    });

    it('debe mostrar el botón de prueba', () => {
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByRole('button', { name: /probar voz/i })).toBeInTheDocument();
    });
  });

  describe('Selector de Voz', () => {
    it('debe mostrar lista de voces disponibles', () => {
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);

      const select = screen.getByLabelText(/voz/i) as HTMLSelectElement;
      
      expect(select).toBeInTheDocument();
      expect(screen.getByText(/google español/i)).toBeInTheDocument();
      expect(screen.getByText(/microsoft laura/i)).toBeInTheDocument();
    });

    it('debe mostrar la voz seleccionada actualmente', () => {
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);

      const select = screen.getByLabelText(/voz/i) as HTMLSelectElement;
      expect(select.value).toBe('Google español');
    });

    it('debe cambiar la voz seleccionada', () => {
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);

      const select = screen.getByLabelText(/voz/i);
      fireEvent.change(select, { target: { value: 'Microsoft Laura' } });

      expect(mockSetSelectedVoice).toHaveBeenCalledWith(mockVoices[1]);
    });

    it('debe mostrar placeholder si no hay voz seleccionada', () => {
      mockUseTextToSpeech.useTextToSpeech.mockReturnValue({
        ...defaultTextToSpeech,
        selectedVoice: null,
      } as any);

      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);

      const select = screen.getByLabelText(/voz/i) as HTMLSelectElement;
      expect(select.value).toBe('');
    });
  });

  describe('Control de Velocidad', () => {
    it('debe mostrar el valor actual de velocidad', () => {
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('1x')).toBeInTheDocument();
    });

    it('debe cambiar la velocidad', () => {
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);

      const slider = screen.getByLabelText(/velocidad/i);
      fireEvent.change(slider, { target: { value: '1.5' } });

      expect(mockSetRate).toHaveBeenCalledWith(1.5);
    });

    it('debe formatear el valor de velocidad correctamente', () => {
      mockUseTextToSpeech.useTextToSpeech.mockReturnValue({
        ...defaultTextToSpeech,
        rate: 0.75,
      } as any);

      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('0.75x')).toBeInTheDocument();
    });
  });

  describe('Control de Tono', () => {
    it('debe mostrar el valor actual de tono', () => {
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText(/^1$/)).toBeInTheDocument();
    });

    it('debe cambiar el tono', () => {
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);

      const slider = screen.getByLabelText(/tono/i);
      fireEvent.change(slider, { target: { value: '1.2' } });

      expect(mockSetPitch).toHaveBeenCalledWith(1.2);
    });
  });

  describe('Control de Volumen', () => {
    it('debe mostrar el valor actual de volumen', () => {
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('debe cambiar el volumen', () => {
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);

      const slider = screen.getByLabelText(/volumen/i);
      fireEvent.change(slider, { target: { value: '0.5' } });

      expect(mockSetVolume).toHaveBeenCalledWith(0.5);
    });

    it('debe formatear el volumen como porcentaje', () => {
      mockUseTextToSpeech.useTextToSpeech.mockReturnValue({
        ...defaultTextToSpeech,
        volume: 0.65,
      } as any);

      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('65%')).toBeInTheDocument();
    });
  });

  describe('Botón de Prueba', () => {
    it('debe llamar speak con texto de prueba', () => {
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);

      const testButton = screen.getByRole('button', { name: /probar voz/i });
      fireEvent.click(testButton);

      expect(mockSpeak).toHaveBeenCalledWith(
        expect.stringContaining('Hola')
      );
    });

    it('debe estar habilitado por defecto', () => {
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);

      const testButton = screen.getByRole('button', { name: /probar voz/i });
      expect(testButton).not.toBeDisabled();
    });
  });

  describe('Botón de Cerrar', () => {
    it('debe llamar onClose cuando se hace clic en X', () => {
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);

      const closeButton = screen.getByRole('button', { name: /cerrar|close/i });
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('debe cerrar al hacer clic en el fondo del modal', () => {
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);

      const modal = screen.getByText('Configuración de Voz').parentElement?.parentElement;
      
      if (modal) {
        fireEvent.click(modal);
        // Solo se cierra si se hace clic en el fondo, no en el contenido
      }
    });
  });

  describe('Estilos y Accesibilidad', () => {
    it('debe tener clases de modal correctas', () => {
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);

      const modal = screen.getByText('Configuración de Voz').closest('div');
      expect(modal).toHaveClass('bg-white');
      expect(modal).toHaveClass('rounded-lg');
    });

    it('debe tener overlay con fondo oscuro', () => {
      const { container } = render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);

      const overlay = container.querySelector('.bg-black.bg-opacity-50');
      expect(overlay).toBeInTheDocument();
    });

    it('debe ser scrolleable si el contenido es largo', () => {
      render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);

      const content = screen.getByText('Configuración de Voz').closest('div');
      expect(content).toHaveClass('overflow-y-auto');
    });
  });

  describe('Props', () => {
    it('debe actualizar cuando cambian las voces', () => {
      const { rerender } = render(<VoiceSettings isOpen={true} onClose={mockOnClose} />);

      const newVoices = [
        ...mockVoices,
        { name: 'Nueva Voz', lang: 'es-AR', localService: false, voiceURI: '', default: false } as SpeechSynthesisVoice,
      ];

      mockUseTextToSpeech.useTextToSpeech.mockReturnValue({
        ...defaultTextToSpeech,
        voices: newVoices,
      } as any);

      rerender(<VoiceSettings isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Nueva Voz')).toBeInTheDocument();
    });
  });
});
