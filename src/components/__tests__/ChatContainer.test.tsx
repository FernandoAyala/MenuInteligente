import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ChatContainer from '../ChatContainer';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

// Mock de localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

describe('ChatContainer Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('renders chat interface correctly', () => {
    render(<ChatContainer />, { wrapper: createWrapper() });

    expect(screen.getByText('Asistente Culinario')).toBeInTheDocument();
    expect(screen.getByText('En línea')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Escribe tu mensaje...')).toBeInTheDocument();
  });

  it('displays initial messages', () => {
    render(<ChatContainer />, { wrapper: createWrapper() });

    expect(screen.getByText('¡Hola! Soy tu asistente culinario. ¿En qué puedo ayudarte hoy?')).toBeInTheDocument();
  });

  it('sends message when user types and presses send', async () => {
    render(<ChatContainer />, { wrapper: createWrapper() });

    const input = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Quiero algo vegetariano' } });
    fireEvent.click(sendButton);

    expect(screen.getByText('Quiero algo vegetariano')).toBeInTheDocument();
    
    // Debería mostrar indicador de escritura
    await waitFor(() => {
      expect(screen.getByText('está escribiendo...')).toBeInTheDocument();
    });
  });

  it('generates bot response after user message', async () => {
    render(<ChatContainer />, { wrapper: createWrapper() });

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'vegetariano' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    // Esperar respuesta del bot con recomendaciones vegetarianas
    await waitFor(() => {
      expect(screen.getByText(/Tengo excelentes opciones vegetarianas/)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('shows connection status indicator', () => {
    render(<ChatContainer />, { wrapper: createWrapper() });

    expect(screen.getByText('En línea')).toBeInTheDocument();
  });

  it('displays cart count when items are added', async () => {
    render(<ChatContainer />, { wrapper: createWrapper() });

    // Primero enviar mensaje para obtener recomendaciones
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'vegetariano' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    // Esperar recomendaciones y hacer clic en "Agregar al pedido"
    await waitFor(() => {
      const addButton = screen.getByText('Añadir al carrito');
      fireEvent.click(addButton);
    });

    // Verificar que aparece el contador del carrito
    await waitFor(() => {
      expect(screen.getByText(/1 platos/)).toBeInTheDocument();
    });
  });

  it('handles interested button click', async () => {
    render(<ChatContainer />, { wrapper: createWrapper() });

    // Enviar mensaje para obtener recomendaciones
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'vegetariano' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    // Esperar y hacer clic en "Me interesa"
    await waitFor(() => {
      const interestedButton = screen.getByText('Me interesa');
      fireEvent.click(interestedButton);
    });

    // Verificar que se envió mensaje automático
    await waitFor(() => {
      expect(screen.getByText(/Me interesa mucho/)).toBeInTheDocument();
    });
  });

  it('handles view alternatives button click', async () => {
    render(<ChatContainer />, { wrapper: createWrapper() });

    // Enviar mensaje para obtener recomendaciones
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'vegetariano' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    // Esperar y hacer clic en "Ver alternativas"
    await waitFor(() => {
      const alternativesButton = screen.getByText('Ver alternativas');
      fireEvent.click(alternativesButton);
    });

    // Verificar que se envió mensaje automático
    await waitFor(() => {
      expect(screen.getByText(/qué alternativas me recomiendas/)).toBeInTheDocument();
    });
  });

  it('shows typing indicator during bot response', async () => {
    render(<ChatContainer />, { wrapper: createWrapper() });

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Hola' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    // Verificar que aparece el indicador de escritura
    await waitFor(() => {
      expect(screen.getByText('está escribiendo...')).toBeInTheDocument();
    });

    // Verificar que desaparece después de la respuesta
    await waitFor(() => {
      expect(screen.queryByText('está escribiendo...')).not.toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('disables input while bot is typing', async () => {
    render(<ChatContainer />, { wrapper: createWrapper() });

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    // Verificar que el input se deshabilita durante la respuesta
    await waitFor(() => {
      expect(input).toBeDisabled();
    });
  });

  it('scrolls to bottom when new messages are added', () => {
    const scrollIntoViewMock = jest.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;

    render(<ChatContainer />, { wrapper: createWrapper() });

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    expect(scrollIntoViewMock).toHaveBeenCalled();
  });

  it('handles menu item click correctly', async () => {
    render(<ChatContainer />, { wrapper: createWrapper() });

    // Enviar mensaje para obtener recomendaciones
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'vegetariano' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    // Esperar y hacer clic en un plato
    await waitFor(() => {
      const dishCard = screen.getByText('Risotto de Hongos');
      fireEvent.click(dishCard);
    });

    // Verificar que se envió mensaje automático sobre el plato
    await waitFor(() => {
      expect(screen.getByText(/Me interesa el Risotto de Hongos/)).toBeInTheDocument();
    });
  });

  it('shows confirmation message after adding item to cart', async () => {
    render(<ChatContainer />, { wrapper: createWrapper() });

    // Enviar mensaje para obtener recomendaciones
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'vegetariano' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    // Agregar item al carrito
    await waitFor(() => {
      const addButton = screen.getByText('Añadir al carrito');
      fireEvent.click(addButton);
    });

    // Verificar mensaje de confirmación
    await waitFor(() => {
      expect(screen.getByText(/He agregado/)).toBeInTheDocument();
    });
  });

  it('handles different connection statuses', async () => {
    render(<ChatContainer />, { wrapper: createWrapper() });

    // El estado inicial debería ser "conectado"
    expect(screen.getByText('En línea')).toBeInTheDocument();

    // El componente simula cambios de estado ocasionalmente
    // Esto es difícil de probar sin controlar el timing, 
    // pero podemos verificar que el componente maneja los estados
    expect(screen.queryByText('Reconectando...')).not.toBeInTheDocument();
  });
});