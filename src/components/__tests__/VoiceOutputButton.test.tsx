/**
 * Tests para VoiceOutputButton
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VoiceOutputButton } from '../VoiceOutputButton';
import * as useTextToSpeechHook from '../../hooks/useTextToSpeech';

// Mock del hook
jest.mock('../../hooks/useTextToSpeech');

const mockUseTextToSpeech = useTextToSpeechHook as jest.Mocked<
  typeof useTextToSpeechHook
>;

describe('VoiceOutputButton', () => {
  const mockSpeak = jest.fn();
  const mockStop = jest.fn();

  const defaultTextToSpeech = {
    speak: mockSpeak,
    stop: mockStop,
    isSpeaking: false,
    isPaused: false,
    pause: jest.fn(),
    resume: jest.fn(),
    cancel: jest.fn(),
    getVoices: jest.fn().mockReturnValue([]),
    setVoice: jest.fn(),
    setRate: jest.fn(),
    setPitch: jest.fn(),
    setVolume: jest.fn(),
    isSupported: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTextToSpeech.useTextToSpeech.mockReturnValue(defaultTextToSpeech);
  });

  describe('Rendering', () => {
    it('debe renderizar el botón correctamente', () => {
      render(<VoiceOutputButton text="Hola mundo" />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('debe mostrar el icono de play cuando no está hablando', () => {
      render(<VoiceOutputButton text="Test" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Reproducir mensaje');
    });

    it('debe mostrar el icono de stop cuando está hablando', () => {
      mockUseTextToSpeech.useTextToSpeech.mockReturnValue({
        ...defaultTextToSpeech,
        isSpeaking: true,
      });

      render(<VoiceOutputButton text="Test" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Detener audio');
    });

    it('debe aplicar className personalizada', () => {
      render(<VoiceOutputButton text="Test" className="custom-class" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('Estados Visuales', () => {
    it('debe tener estilo normal cuando no está hablando', () => {
      render(<VoiceOutputButton text="Test" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-gray-500');
    });

    it('debe tener estilo activo y animación cuando está hablando', () => {
      mockUseTextToSpeech.useTextToSpeech.mockReturnValue({
        ...defaultTextToSpeech,
        isSpeaking: true,
      });

      render(<VoiceOutputButton text="Test" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-blue-600');
      expect(button).toHaveClass('animate-pulse');
    });
  });

  describe('Interacciones', () => {
    it('debe iniciar síntesis de voz al hacer clic', () => {
      render(<VoiceOutputButton text="Hola mundo" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockSpeak).toHaveBeenCalledWith('Hola mundo');
    });

    it('debe detener síntesis de voz si ya está hablando', () => {
      mockUseTextToSpeech.useTextToSpeech.mockReturnValue({
        ...defaultTextToSpeech,
        isSpeaking: true,
      });

      render(<VoiceOutputButton text="Test" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockStop).toHaveBeenCalled();
      expect(mockSpeak).not.toHaveBeenCalled();
    });

    it('debe limpiar emojis del texto antes de hablar', () => {
      render(<VoiceOutputButton text="🍕 Pizza $1500" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockSpeak).toHaveBeenCalledWith('Pizza 1500 pesos');
    });

    it('debe reemplazar símbolo de dólar por "pesos"', () => {
      render(<VoiceOutputButton text="Precio: $2500" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockSpeak).toHaveBeenCalledWith('Precio: 2500 pesos');
    });

    it('debe usar texto original si queda vacío después de limpieza', () => {
      render(<VoiceOutputButton text="🍕🍝🍗" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockSpeak).toHaveBeenCalledWith('🍕🍝🍗');
    });

    it('debe manejar múltiples símbolos de dólar', () => {
      render(<VoiceOutputButton text="Total: $100 + $50 = $150" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockSpeak).toHaveBeenCalledWith('Total: 100 pesos + 50 pesos = 150 pesos');
    });
  });

  describe('Limpieza de Texto', () => {
    it('debe remover múltiples emojis de comida', () => {
      render(<VoiceOutputButton text="🍕 Pizza 🍝 Pasta 🍗 Pollo" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockSpeak).toHaveBeenCalledWith('Pizza  Pasta  Pollo');
    });

    it('debe remover emojis especiales', () => {
      render(<VoiceOutputButton text="⭐ Destacado 💫 Especial 🎉" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockSpeak).toHaveBeenCalledWith('Destacado  Especial');
    });

    it('debe hacer trim del texto resultante', () => {
      render(<VoiceOutputButton text="   Texto con espacios   " />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockSpeak).toHaveBeenCalledWith('Texto con espacios');
    });

    it('debe procesar texto complejo con múltiples elementos', () => {
      render(<VoiceOutputButton text="🍕 Pizza Margarita $1500 ⭐" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockSpeak).toHaveBeenCalledWith('Pizza Margarita 1500 pesos');
    });

    it('debe preservar texto normal sin modificaciones', () => {
      render(<VoiceOutputButton text="Esta es una orden de pizza" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockSpeak).toHaveBeenCalledWith('Esta es una orden de pizza');
    });
  });

  describe('Props', () => {
    it('debe aceptar texto vacío', () => {
      render(<VoiceOutputButton text="" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockSpeak).toHaveBeenCalledWith('');
    });

    it('debe actualizar cuando cambia el texto', () => {
      const { rerender } = render(<VoiceOutputButton text="Texto 1" />);

      rerender(<VoiceOutputButton text="Texto 2" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockSpeak).toHaveBeenCalledWith('Texto 2');
    });
  });

  describe('Accessibility', () => {
    it('debe tener el tipo de botón correcto', () => {
      render(<VoiceOutputButton text="Test" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'button');
    });

    it('debe tener título descriptivo cuando no está hablando', () => {
      render(<VoiceOutputButton text="Test" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Reproducir mensaje');
    });

    it('debe tener título descriptivo cuando está hablando', () => {
      mockUseTextToSpeech.useTextToSpeech.mockReturnValue({
        ...defaultTextToSpeech,
        isSpeaking: true,
      });

      render(<VoiceOutputButton text="Test" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Detener audio');
    });

    it('debe ser accesible por teclado', () => {
      render(<VoiceOutputButton text="Test" />);

      const button = screen.getByRole('button');
      button.focus();

      expect(button).toHaveFocus();
    });
  });

  describe('Logging', () => {
    it('debe loguear información al hacer clic', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      render(<VoiceOutputButton text="Test" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(consoleSpy).toHaveBeenCalledWith(
        '🔊 Click en botón de voz:',
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });

    it('debe loguear al detener síntesis', () => {
      mockUseTextToSpeech.useTextToSpeech.mockReturnValue({
        ...defaultTextToSpeech,
        isSpeaking: true,
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      render(<VoiceOutputButton text="Test" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(consoleSpy).toHaveBeenCalledWith('⏹️ Deteniendo síntesis...');

      consoleSpy.mockRestore();
    });
  });
});
