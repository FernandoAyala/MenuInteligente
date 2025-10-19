import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import MessageBubble from '../components/MessageBubble';
import { ChatMessage, MenuItem } from '../types';

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

const mockMenuItem: MenuItem = {
  id: 'test-item-1',
  categoryId: 'test-category',
  name: 'Risotto de Hongos',
  description: 'Cremoso risotto con hongos portobello y parmesano.',
  price: 2200,
  currency: 'ARS',
  spicyLevel: 0,
  isVegan: false,
  isVegetarian: true,
  isGlutenFree: true,
  allergens: ['dairy'],
  available: true
};

const mockUserMessage: ChatMessage = {
  id: 'msg-user-1',
  content: 'Estoy buscando algo vegetariano para almorzar',
  type: 'user',
  timestamp: new Date('2023-10-19T12:00:00Z'),
  status: 'read'
};

const mockBotMessage: ChatMessage = {
  id: 'msg-bot-1',
  content: 'Tengo excelentes opciones vegetarianas para ti:',
  type: 'bot',
  timestamp: new Date('2023-10-19T12:01:00Z'),
  status: 'sent',
  menuItems: [mockMenuItem]
};

const mockBotMessageNoItems: ChatMessage = {
  id: 'msg-bot-2',
  content: '¡Hola! ¿En qué puedo ayudarte hoy?',
  type: 'bot',
  timestamp: new Date('2023-10-19T12:00:30Z'),
  status: 'sent'
};

describe('MessageBubble Component', () => {
  const mockOnMenuItemClick = jest.fn();
  const mockOnAddToCart = jest.fn();
  const mockOnItemInterested = jest.fn();
  const mockOnViewAlternatives = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders user message correctly', () => {
    render(
      <MessageBubble
        message={mockUserMessage}
        isOwn={true}
        onMenuItemClick={mockOnMenuItemClick}
        onAddToCart={mockOnAddToCart}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Estoy buscando algo vegetariano para almorzar')).toBeInTheDocument();
    expect(screen.getByText('12:00')).toBeInTheDocument();
  });

  it('renders bot message with avatar', () => {
    render(
      <MessageBubble
        message={mockBotMessageNoItems}
        isOwn={false}
        onMenuItemClick={mockOnMenuItemClick}
        onAddToCart={mockOnAddToCart}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('¡Hola! ¿En qué puedo ayudarte hoy?')).toBeInTheDocument();
    expect(screen.getByText('AI')).toBeInTheDocument(); // Avatar del bot
  });

  it('displays message status icons for user messages', () => {
    const sentMessage = { ...mockUserMessage, status: 'sent' as const };
    
    render(
      <MessageBubble
        message={sentMessage}
        isOwn={true}
        onMenuItemClick={mockOnMenuItemClick}
        onAddToCart={mockOnAddToCart}
      />,
      { wrapper: createWrapper() }
    );

    // Verificar que aparece el icono de estado
    expect(screen.getByTestId('message-status')).toBeInTheDocument();
  });

  it('renders menu items when present', () => {
    render(
      <MessageBubble
        message={mockBotMessage}
        isOwn={false}
        onMenuItemClick={mockOnMenuItemClick}
        onAddToCart={mockOnAddToCart}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Tengo excelentes opciones vegetarianas para ti:')).toBeInTheDocument();
    expect(screen.getByText('Risotto de Hongos')).toBeInTheDocument();
    expect(screen.getByText('Recomendaciones')).toBeInTheDocument(); // Título del carrusel
  });

  it('passes correct props to FoodCarousel', () => {
    render(
      <MessageBubble
        message={mockBotMessage}
        isOwn={false}
        onMenuItemClick={mockOnMenuItemClick}
        onAddToCart={mockOnAddToCart}
        onItemInterested={mockOnItemInterested}
        onViewAlternatives={mockOnViewAlternatives}
      />,
      { wrapper: createWrapper() }
    );

    // Verificar que los botones del chat variant están presentes
    expect(screen.getByText('Me interesa')).toBeInTheDocument();
    expect(screen.getByText('Ver alternativas')).toBeInTheDocument();
  });

  it('formats timestamp correctly', () => {
    render(
      <MessageBubble
        message={mockUserMessage}
        isOwn={true}
        onMenuItemClick={mockOnMenuItemClick}
        onAddToCart={mockOnAddToCart}
      />,
      { wrapper: createWrapper() }
    );

    // El timestamp debería mostrarse en formato HH:MM
    expect(screen.getByText('12:00')).toBeInTheDocument();
  });

  it('applies correct styling for user vs bot messages', () => {
    const { rerender } = render(
      <MessageBubble
        message={mockUserMessage}
        isOwn={true}
        onMenuItemClick={mockOnMenuItemClick}
        onAddToCart={mockOnAddToCart}
      />,
      { wrapper: createWrapper() }
    );

    // Mensaje del usuario debe tener clase de mensaje saliente
    expect(screen.getByText('Estoy buscando algo vegetariano para almorzar').closest('div'))
      .toHaveClass('bg-message-outgoing');

    rerender(
      <MessageBubble
        message={mockBotMessageNoItems}
        isOwn={false}
        onMenuItemClick={mockOnMenuItemClick}
        onAddToCart={mockOnAddToCart}
      />
    );

    // Mensaje del bot debe tener clase de mensaje entrante
    expect(screen.getByText('¡Hola! ¿En qué puedo ayudarte hoy?').closest('div'))
      .toHaveClass('bg-message-incoming');
  });

  it('does not show avatar for user messages', () => {
    render(
      <MessageBubble
        message={mockUserMessage}
        isOwn={true}
        onMenuItemClick={mockOnMenuItemClick}
        onAddToCart={mockOnAddToCart}
      />,
      { wrapper: createWrapper() }
    );

    // No debería mostrar el avatar del bot
    expect(screen.queryByText('AI')).not.toBeInTheDocument();
  });

  it('handles long message content correctly', () => {
    const longMessage = {
      ...mockBotMessageNoItems,
      content: 'Este es un mensaje muy largo que debería ser manejado correctamente por el componente. '.repeat(10)
    };

    render(
      <MessageBubble
        message={longMessage}
        isOwn={false}
        onMenuItemClick={mockOnMenuItemClick}
        onAddToCart={mockOnAddToCart}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(/Este es un mensaje muy largo/)).toBeInTheDocument();
  });
});