/**
 * Tests para OrderConfirmation
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OrderConfirmation } from '../OrderConfirmation';
import * as useConfirmOrderHook from '../../hooks/useConfirmOrder';

// Mock servicios que usan import.meta
jest.mock('../../services/api/ordersService', () => ({
  ordersService: {
    createOrder: jest.fn(),
    getOrder: jest.fn(),
    updateOrderStatus: jest.fn()
  }
}));

// Mock del hook useConfirmOrder
jest.mock('../../hooks/useConfirmOrder');

const mockUseConfirmOrder = useConfirmOrderHook as jest.Mocked<
  typeof useConfirmOrderHook
>;

describe('OrderConfirmation', () => {
  const mockConfirmOrder = jest.fn();
  const mockClearConfirmedOrder = jest.fn();
  const mockOnOrderConfirmed = jest.fn();
  const mockOnCancel = jest.fn();

  const defaultMockReturn = {
    confirmOrder: mockConfirmOrder,
    confirming: false,
    error: null,
    confirmedOrder: null,
    clearConfirmedOrder: mockClearConfirmedOrder,
  };

  const mockConfirmedOrderData = {
    id: 'order-12345678',
    tableNumber: 7,
    totalAmount: 2500,
    estimatedTime: 25,
    sessionId: 'test-session',
    items: [],
    status: 'confirmed' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseConfirmOrder.useConfirmOrder.mockReturnValue(defaultMockReturn);
    
    // Mock window.alert
    global.alert = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Rendering - Estado de Confirmación', () => {
    it('debe renderizar el formulario de confirmación por defecto', () => {
      render(<OrderConfirmation sessionId="test-session" />);

      expect(screen.getByText('📋 Confirmar Pedido')).toBeInTheDocument();
      expect(screen.getByLabelText(/número de mesa/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/notas adicionales/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confirmar pedido/i })).toBeInTheDocument();
    });

    it('debe mostrar campos requeridos correctamente', () => {
      render(<OrderConfirmation sessionId="test-session" />);

      const tableInput = screen.getByLabelText(/número de mesa/i);
      const notesTextarea = screen.getByLabelText(/notas adicionales/i);

      expect(tableInput).toHaveAttribute('type', 'number');
      expect(tableInput).toHaveAttribute('min', '1');
      expect(tableInput).toBeRequired();
      expect(notesTextarea).not.toBeRequired();
    });

    it('debe mostrar botón de cancelar si se proporciona onCancel', () => {
      render(
        <OrderConfirmation 
          sessionId="test-session" 
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
    });

    it('no debe mostrar botón de cancelar si no se proporciona onCancel', () => {
      render(<OrderConfirmation sessionId="test-session" />);

      expect(screen.queryByRole('button', { name: /cancelar/i })).not.toBeInTheDocument();
    });

    it('debe mostrar mensaje informativo al final', () => {
      render(<OrderConfirmation sessionId="test-session" />);

      expect(screen.getByText(/al confirmar, tu pedido será enviado directamente a la cocina/i)).toBeInTheDocument();
    });
  });

  describe('Manejo de Estados', () => {
    it('debe deshabilitar campos cuando está confirmando', () => {
      mockUseConfirmOrder.useConfirmOrder.mockReturnValue({
        ...defaultMockReturn,
        confirming: true,
      });

      render(<OrderConfirmation sessionId="test-session" onCancel={mockOnCancel} />);

      const tableInput = screen.getByLabelText(/número de mesa/i);
      const notesTextarea = screen.getByLabelText(/notas adicionales/i);
      const confirmButton = screen.getByRole('button', { name: /confirmando/i });
      const cancelButton = screen.getByRole('button', { name: /cancelar/i });

      expect(tableInput).toBeDisabled();
      expect(notesTextarea).toBeDisabled();
      expect(confirmButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
      expect(confirmButton).toHaveTextContent('Confirmando...');
    });

    it('debe mostrar mensaje de error cuando existe', () => {
      mockUseConfirmOrder.useConfirmOrder.mockReturnValue({
        ...defaultMockReturn,
        error: 'Error de conexión con el servidor',
      });

      render(<OrderConfirmation sessionId="test-session" />);

      expect(screen.getByText(/error de conexión con el servidor/i)).toBeInTheDocument();
      expect(screen.getByText(/error:/i)).toBeInTheDocument();
    });

    it('debe deshabilitar botón de confirmar si no hay número de mesa', () => {
      render(<OrderConfirmation sessionId="test-session" />);

      const confirmButton = screen.getByRole('button', { name: /confirmar pedido/i });
      expect(confirmButton).toBeDisabled();
    });
  });

  describe('Interacciones del Formulario', () => {
    it('debe permitir escribir en el campo de número de mesa', () => {
      render(<OrderConfirmation sessionId="test-session" />);

      const tableInput = screen.getByLabelText(/número de mesa/i) as HTMLInputElement;
      fireEvent.change(tableInput, { target: { value: '7' } });

      expect(tableInput.value).toBe('7');
    });

    it('debe permitir escribir en el campo de notas', () => {
      render(<OrderConfirmation sessionId="test-session" />);

      const notesTextarea = screen.getByLabelText(/notas adicionales/i) as HTMLTextAreaElement;
      fireEvent.change(notesTextarea, { target: { value: 'Mesa cerca de la ventana' } });

      expect(notesTextarea.value).toBe('Mesa cerca de la ventana');
    });

    it('debe habilitar el botón de confirmar cuando hay número de mesa', () => {
      render(<OrderConfirmation sessionId="test-session" />);

      const tableInput = screen.getByLabelText(/número de mesa/i);
      const confirmButton = screen.getByRole('button', { name: /confirmar pedido/i });

      fireEvent.change(tableInput, { target: { value: '5' } });

      expect(confirmButton).not.toBeDisabled();
    });

    it('debe llamar a confirmOrder con los datos correctos', async () => {
      mockConfirmOrder.mockResolvedValue(mockConfirmedOrderData);

      render(
        <OrderConfirmation 
          sessionId="test-session"
          onOrderConfirmed={mockOnOrderConfirmed}
        />
      );

      const tableInput = screen.getByLabelText(/número de mesa/i);
      const notesTextarea = screen.getByLabelText(/notas adicionales/i);
      const confirmButton = screen.getByRole('button', { name: /confirmar pedido/i });

      fireEvent.change(tableInput, { target: { value: '7' } });
      fireEvent.change(notesTextarea, { target: { value: 'Celebrando cumpleaños' } });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockConfirmOrder).toHaveBeenCalledWith({
          sessionId: 'test-session',
          tableNumber: 7,
          customerNotes: 'Celebrando cumpleaños',
        });
      });
    });

    it('debe llamar a onOrderConfirmed cuando el pedido se confirma exitosamente', async () => {
      mockConfirmOrder.mockResolvedValue(mockConfirmedOrderData);

      render(
        <OrderConfirmation 
          sessionId="test-session"
          onOrderConfirmed={mockOnOrderConfirmed}
        />
      );

      const tableInput = screen.getByLabelText(/número de mesa/i);
      const confirmButton = screen.getByRole('button', { name: /confirmar pedido/i });

      fireEvent.change(tableInput, { target: { value: '7' } });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockOnOrderConfirmed).toHaveBeenCalledWith('order-12345678');
      });
    });

    it('debe omitir customerNotes si está vacío', async () => {
      mockConfirmOrder.mockResolvedValue(mockConfirmedOrderData);

      render(<OrderConfirmation sessionId="test-session" />);

      const tableInput = screen.getByLabelText(/número de mesa/i);
      const confirmButton = screen.getByRole('button', { name: /confirmar pedido/i });

      fireEvent.change(tableInput, { target: { value: '3' } });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockConfirmOrder).toHaveBeenCalledWith({
          sessionId: 'test-session',
          tableNumber: 3,
          customerNotes: undefined,
        });
      });
    });
  });

  describe('Validaciones', () => {
    it('debe mostrar alerta si el número de mesa está vacío', async () => {
      render(<OrderConfirmation sessionId="test-session" />);

      const confirmButton = screen.getByRole('button', { name: /confirmar pedido/i });
      fireEvent.click(confirmButton);

      expect(global.alert).toHaveBeenCalledWith('Por favor ingresa un número de mesa válido');
      expect(mockConfirmOrder).not.toHaveBeenCalled();
    });

    it('debe mostrar alerta si el número de mesa es menor a 1', async () => {
      render(<OrderConfirmation sessionId="test-session" />);

      const tableInput = screen.getByLabelText(/número de mesa/i);
      const confirmButton = screen.getByRole('button', { name: /confirmar pedido/i });

      fireEvent.change(tableInput, { target: { value: '0' } });
      fireEvent.click(confirmButton);

      expect(global.alert).toHaveBeenCalledWith('Por favor ingresa un número de mesa válido');
      expect(mockConfirmOrder).not.toHaveBeenCalled();
    });

    it('debe aceptar números de mesa válidos', async () => {
      mockConfirmOrder.mockResolvedValue(mockConfirmedOrderData);

      render(<OrderConfirmation sessionId="test-session" />);

      const tableInput = screen.getByLabelText(/número de mesa/i);
      const confirmButton = screen.getByRole('button', { name: /confirmar pedido/i });

      fireEvent.change(tableInput, { target: { value: '15' } });
      fireEvent.click(confirmButton);

      expect(global.alert).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(mockConfirmOrder).toHaveBeenCalled();
      });
    });
  });

  describe('Estado de Pedido Confirmado', () => {
    beforeEach(() => {
      mockUseConfirmOrder.useConfirmOrder.mockReturnValue({
        ...defaultMockReturn,
        confirmedOrder: mockConfirmedOrderData,
      });
    });

    it('debe mostrar el mensaje de confirmación exitosa', () => {
      render(<OrderConfirmation sessionId="test-session" />);

      expect(screen.getByText('✅ ¡Pedido Confirmado!')).toBeInTheDocument();
      expect(screen.getByText(/tu pedido ha sido enviado a la cocina/i)).toBeInTheDocument();
    });

    it('debe mostrar los detalles del pedido confirmado', () => {
      render(<OrderConfirmation sessionId="test-session" />);

      expect(screen.getByText(/número de orden:/i)).toBeInTheDocument();
      expect(screen.getByText('#order-12')).toBeInTheDocument(); // Primeros 8 caracteres
      expect(screen.getByText(/mesa: 7/i)).toBeInTheDocument();
      expect(screen.getByText(/total: \$2500/i)).toBeInTheDocument();
      expect(screen.getByText(/tiempo estimado: 25 minutos/i)).toBeInTheDocument();
    });

    it('no debe mostrar tiempo estimado si no está disponible', () => {
      const orderWithoutTime = { ...mockConfirmedOrderData, estimatedTime: undefined };
      
      mockUseConfirmOrder.useConfirmOrder.mockReturnValue({
        ...defaultMockReturn,
        confirmedOrder: orderWithoutTime,
      });

      render(<OrderConfirmation sessionId="test-session" />);

      expect(screen.queryByText(/tiempo estimado/i)).not.toBeInTheDocument();
    });

    it('debe mostrar botón de cerrar en estado confirmado', () => {
      render(<OrderConfirmation sessionId="test-session" />);

      const closeButton = screen.getByRole('button');
      expect(closeButton).toBeInTheDocument();
    });

    it('debe llamar a clearConfirmedOrder y resetear campos al cerrar', () => {
      render(<OrderConfirmation sessionId="test-session" onCancel={mockOnCancel} />);

      const closeButton = screen.getByRole('button');
      fireEvent.click(closeButton);

      expect(mockClearConfirmedOrder).toHaveBeenCalled();
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Botón de Cancelar', () => {
    it('debe llamar a onCancel cuando se hace clic en cancelar', () => {
      render(
        <OrderConfirmation 
          sessionId="test-session" 
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancelar/i });
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
      expect(mockClearConfirmedOrder).toHaveBeenCalled();
    });

    it('debe resetear los campos al cancelar', () => {
      render(
        <OrderConfirmation 
          sessionId="test-session" 
          onCancel={mockOnCancel}
        />
      );

      const tableInput = screen.getByLabelText(/número de mesa/i) as HTMLInputElement;
      const notesTextarea = screen.getByLabelText(/notas adicionales/i) as HTMLTextAreaElement;
      const cancelButton = screen.getByRole('button', { name: /cancelar/i });

      // Llenar campos
      fireEvent.change(tableInput, { target: { value: '5' } });
      fireEvent.change(notesTextarea, { target: { value: 'Notas de prueba' } });

      expect(tableInput.value).toBe('5');
      expect(notesTextarea.value).toBe('Notas de prueba');

      // Cancelar
      fireEvent.click(cancelButton);

      expect(mockClearConfirmedOrder).toHaveBeenCalled();
    });
  });

  describe('Props', () => {
    it('debe funcionar sin callbacks opcionales', () => {
      expect(() => {
        render(<OrderConfirmation sessionId="test-session" />);
      }).not.toThrow();
    });

    it('debe usar el sessionId proporcionado', async () => {
      mockConfirmOrder.mockResolvedValue(mockConfirmedOrderData);

      render(<OrderConfirmation sessionId="custom-session-123" />);

      const tableInput = screen.getByLabelText(/número de mesa/i);
      const confirmButton = screen.getByRole('button', { name: /confirmar pedido/i });

      fireEvent.change(tableInput, { target: { value: '2' } });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockConfirmOrder).toHaveBeenCalledWith(
          expect.objectContaining({
            sessionId: 'custom-session-123',
          })
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('debe tener labels apropiados para todos los campos', () => {
      render(<OrderConfirmation sessionId="test-session" />);

      expect(screen.getByLabelText(/número de mesa/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/notas adicionales/i)).toBeInTheDocument();
    });

    it('debe tener roles de botón apropiados', () => {
      render(<OrderConfirmation sessionId="test-session" onCancel={mockOnCancel} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2); // Confirmar y Cancelar
    });

    it('debe ser navigable por teclado', () => {
      render(<OrderConfirmation sessionId="test-session" />);

      const tableInput = screen.getByLabelText(/número de mesa/i);
      const notesTextarea = screen.getByLabelText(/notas adicionales/i);

      tableInput.focus();
      expect(tableInput).toHaveFocus();

      notesTextarea.focus();
      expect(notesTextarea).toHaveFocus();
    });
  });
});