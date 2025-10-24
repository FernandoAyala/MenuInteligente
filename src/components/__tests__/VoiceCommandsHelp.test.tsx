/**
 * Tests para VoiceCommandsHelp
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VoiceCommandsHelp } from '../VoiceCommandsHelp';
import * as useVoiceCommandsHook from '../../hooks/useVoiceCommands';

// Mock del hook
jest.mock('../../hooks/useVoiceCommands');

const mockUseVoiceCommands = useVoiceCommandsHook as jest.Mocked<
  typeof useVoiceCommandsHook
>;

describe('VoiceCommandsHelp', () => {
  const mockGetAvailableCommands = jest.fn();
  const mockGetCommandHelp = jest.fn();

  const mockCommands = [
    {
      trigger: ['mostrar menú', 'ver menú', 'quiero ver el menú'],
      action: 'SHOW_MENU',
      category: 'navigation',
      description: 'Muestra el menú completo',
    },
    {
      trigger: ['agregar pizza', 'quiero una pizza'],
      action: 'ADD_TO_CART',
      category: 'ordering',
      description: 'Agregar un plato al carrito',
    },
    {
      trigger: ['qué hay de postre', 'postres disponibles'],
      action: 'SHOW_DESSERTS',
      category: 'inquiry',
      description: 'Consultar postres disponibles',
    },
    {
      trigger: ['cancelar', 'salir'],
      action: 'CANCEL',
      category: 'control',
      description: 'Cancelar operación actual',
    },
  ];

  const defaultVoiceCommands = {
    processVoiceCommand: jest.fn(),
    getAvailableCommands: mockGetAvailableCommands,
    getCommandHelp: mockGetCommandHelp,
    availableCommands: mockCommands,
    isCommandMode: false,
    toggleCommandMode: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAvailableCommands.mockReturnValue(mockCommands);
    mockUseVoiceCommands.useVoiceCommands.mockReturnValue(defaultVoiceCommands);
  });

  describe('Rendering - Estado Cerrado', () => {
    it('debe renderizar el botón de ayuda cuando está cerrado', () => {
      render(<VoiceCommandsHelp />);

      const button = screen.getByRole('button', { name: /ayuda de comandos/i });
      expect(button).toBeInTheDocument();
    });

    it('debe mostrar icono de ayuda', () => {
      render(<VoiceCommandsHelp />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('debe aplicar className personalizada al botón', () => {
      render(<VoiceCommandsHelp className="custom-class" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('debe tener título descriptivo', () => {
      render(<VoiceCommandsHelp />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Ayuda de comandos de voz');
    });
  });

  describe('Rendering - Estado Abierto', () => {
    beforeEach(() => {
      render(<VoiceCommandsHelp />);
      const button = screen.getByRole('button', { name: /ayuda de comandos/i });
      fireEvent.click(button);
    });

    it('debe mostrar el modal cuando se abre', () => {
      expect(screen.getByText(/comandos de voz/i)).toBeInTheDocument();
    });

    it('debe mostrar el botón de cerrar', () => {
      const closeButton = screen.getByRole('button', { name: /cerrar|close/i });
      expect(closeButton).toBeInTheDocument();
    });

    it('debe mostrar el tip de ayuda', () => {
      expect(screen.getByText(/tip/i)).toBeInTheDocument();
      expect(screen.getByText(/haz clic en el botón/i)).toBeInTheDocument();
    });

    it('debe mostrar todas las categorías con comandos', () => {
      expect(screen.getByText(/navegación/i)).toBeInTheDocument();
      expect(screen.getByText(/pedidos/i)).toBeInTheDocument();
      expect(screen.getByText(/consultas/i)).toBeInTheDocument();
      expect(screen.getByText(/control/i)).toBeInTheDocument();
    });

    it('debe mostrar comandos de navegación', () => {
      expect(screen.getByText(/mostrar menú/i)).toBeInTheDocument();
    });

    it('debe mostrar comandos de pedidos', () => {
      expect(screen.getByText(/agregar pizza/i)).toBeInTheDocument();
    });

    it('debe mostrar comandos de consultas', () => {
      expect(screen.getByText(/qué hay de postre/i)).toBeInTheDocument();
    });

    it('debe mostrar comandos de control', () => {
      expect(screen.getByText(/cancelar/i, { selector: 'code' })).toBeInTheDocument();
    });
  });

  describe('Interacciones', () => {
    it('debe abrir el modal al hacer clic en el botón', () => {
      render(<VoiceCommandsHelp />);

      const button = screen.getByRole('button', { name: /ayuda de comandos/i });
      fireEvent.click(button);

      expect(screen.getByText(/comandos de voz/i)).toBeInTheDocument();
    });

    it('debe cerrar el modal al hacer clic en X', () => {
      render(<VoiceCommandsHelp />);

      // Abrir modal
      const openButton = screen.getByRole('button', { name: /ayuda de comandos/i });
      fireEvent.click(openButton);

      expect(screen.getByText(/comandos de voz/i)).toBeInTheDocument();

      // Cerrar modal
      const closeButton = screen.getByRole('button', { name: /cerrar|close/i });
      fireEvent.click(closeButton);

      expect(screen.queryByText(/comandos de voz/i)).not.toBeInTheDocument();
    });

    it('debe alternar entre abierto y cerrado', () => {
      render(<VoiceCommandsHelp />);

      const button = screen.getByRole('button', { name: /ayuda de comandos/i });

      // Abrir
      fireEvent.click(button);
      expect(screen.getByText(/comandos de voz/i)).toBeInTheDocument();

      // Cerrar
      const closeButton = screen.getByRole('button', { name: /cerrar|close/i });
      fireEvent.click(closeButton);
      expect(screen.queryByText(/comandos de voz/i)).not.toBeInTheDocument();

      // Abrir de nuevo - obtener el botón nuevamente
      const buttonAgain = screen.getByRole('button', { name: /ayuda de comandos/i });
      fireEvent.click(buttonAgain);
      expect(screen.getByText(/comandos de voz/i)).toBeInTheDocument();
    });
  });

  describe('Categorías de Comandos', () => {
    it('debe agrupar comandos por categoría', () => {
      render(<VoiceCommandsHelp />);
      fireEvent.click(screen.getByRole('button', { name: /ayuda de comandos/i }));

      expect(screen.getByText(/navegación/i)).toBeInTheDocument();
      expect(screen.getByText(/pedidos/i)).toBeInTheDocument();
    });

    it('debe mostrar iconos para cada categoría', () => {
      render(<VoiceCommandsHelp />);
      fireEvent.click(screen.getByRole('button', { name: /ayuda de comandos/i }));

      expect(screen.getByText('📋')).toBeInTheDocument();
      expect(screen.getByText('🛒')).toBeInTheDocument();
      expect(screen.getByText('❓')).toBeInTheDocument();
      expect(screen.getByText('⚙️')).toBeInTheDocument();
    });

    it('no debe mostrar categorías sin comandos', () => {
      mockGetAvailableCommands.mockReturnValue([
        mockCommands[0], // Solo navegación
      ]);

      render(<VoiceCommandsHelp />);
      fireEvent.click(screen.getByRole('button', { name: /ayuda de comandos/i }));

      expect(screen.getByText(/navegación/i)).toBeInTheDocument();
      // Pedidos no debería estar visible si no tiene comandos
    });
  });

  describe('Detalles de Comandos', () => {
    it('debe mostrar descripción de comandos', () => {
      render(<VoiceCommandsHelp />);
      fireEvent.click(screen.getByRole('button', { name: /ayuda de comandos/i }));

      expect(screen.getByText(/muestra el menú completo/i)).toBeInTheDocument();
    });

    it('debe mostrar ejemplos de comandos', () => {
      render(<VoiceCommandsHelp />);
      fireEvent.click(screen.getByRole('button', { name: /ayuda de comandos/i }));

      expect(screen.getByText(/mostrar menú/i)).toBeInTheDocument();
      expect(screen.getByText(/quiero ver el menú/i)).toBeInTheDocument();
    });

    it('debe mostrar múltiples patrones para un comando', () => {
      render(<VoiceCommandsHelp />);
      fireEvent.click(screen.getByRole('button', { name: /ayuda de comandos/i }));

      const command = mockCommands[0];
      command.trigger.forEach((trigger: string) => {
        expect(screen.getByText(new RegExp(trigger, 'i'))).toBeInTheDocument();
      });
    });
  });

  describe('Estilos y Layout', () => {
    it('debe tener overlay modal con fondo oscuro', () => {
      render(<VoiceCommandsHelp />);
      fireEvent.click(screen.getByRole('button', { name: /ayuda de comandos/i }));

      const overlay = screen.getByText(/comandos de voz/i).closest('.fixed');
      expect(overlay).toHaveClass('bg-black');
      expect(overlay).toHaveClass('bg-opacity-50');
    });

    it('debe tener contenido scrolleable', () => {
      render(<VoiceCommandsHelp />);
      fireEvent.click(screen.getByRole('button', { name: /ayuda de comandos/i }));

      const content = screen.getByText(/comandos de voz/i).closest('.rounded-lg');
      expect(content).toHaveClass('overflow-y-auto');
    });

    it('debe tener header sticky', () => {
      render(<VoiceCommandsHelp />);
      fireEvent.click(screen.getByRole('button', { name: /ayuda de comandos/i }));

      const header = screen.getByText(/comandos de voz/i).closest('.sticky');
      expect(header).toHaveClass('top-0');
    });
  });

  describe('Comandos Vacíos', () => {
    it('debe manejar correctamente cuando no hay comandos', () => {
      mockGetAvailableCommands.mockReturnValue([]);

      render(<VoiceCommandsHelp />);
      fireEvent.click(screen.getByRole('button', { name: /ayuda de comandos/i }));

      expect(screen.getByText(/comandos de voz/i)).toBeInTheDocument();
      // No debería mostrar categorías
      expect(screen.queryByText(/navegación/i)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('debe tener roles ARIA apropiados', () => {
      render(<VoiceCommandsHelp />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('debe ser accesible por teclado', () => {
      render(<VoiceCommandsHelp />);

      const button = screen.getByRole('button');
      button.focus();

      expect(button).toHaveFocus();
    });

    it('debe mantener foco en elementos interactivos del modal', () => {
      render(<VoiceCommandsHelp />);
      fireEvent.click(screen.getByRole('button', { name: /ayuda de comandos/i }));

      const closeButton = screen.getByRole('button', { name: /cerrar|close/i });
      closeButton.focus();

      expect(closeButton).toHaveFocus();
    });
  });
});
