import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import InputArea from '../InputArea';

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

describe('InputArea Component', () => {
  const mockOnSendMessage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders input area correctly', () => {
    render(
      <InputArea
        onSendMessage={mockOnSendMessage}
        isTyping={false}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByPlaceholderText('Escribe tu mensaje...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('shows custom placeholder when provided', () => {
    render(
      <InputArea
        onSendMessage={mockOnSendMessage}
        isTyping={false}
        placeholder="Escribe aquí tu consulta"
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByPlaceholderText('Escribe aquí tu consulta')).toBeInTheDocument();
  });

  it('updates input value when typing', () => {
    render(
      <InputArea
        onSendMessage={mockOnSendMessage}
        isTyping={false}
      />,
      { wrapper: createWrapper() }
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Hola mundo' } });

    expect(textarea).toHaveValue('Hola mundo');
  });

  it('calls onSendMessage when send button is clicked', () => {
    render(
      <InputArea
        onSendMessage={mockOnSendMessage}
        isTyping={false}
      />,
      { wrapper: createWrapper() }
    );

    const textarea = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
  });

  it('calls onSendMessage when Enter is pressed', () => {
    render(
      <InputArea
        onSendMessage={mockOnSendMessage}
        isTyping={false}
      />,
      { wrapper: createWrapper() }
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });

    expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
  });

  it('does not send message when Shift+Enter is pressed', () => {
    render(
      <InputArea
        onSendMessage={mockOnSendMessage}
        isTyping={false}
      />,
      { wrapper: createWrapper() }
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter', shiftKey: true });

    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it('clears input after sending message', async () => {
    render(
      <InputArea
        onSendMessage={mockOnSendMessage}
        isTyping={false}
      />,
      { wrapper: createWrapper() }
    );

    const textarea = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(textarea).toHaveValue('');
    });
  });

  it('disables input when isTyping is true', () => {
    render(
      <InputArea
        onSendMessage={mockOnSendMessage}
        isTyping={true}
      />,
      { wrapper: createWrapper() }
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeDisabled();
    expect(textarea).toHaveAttribute('placeholder', 'El asistente está escribiendo...');
  });

  it('disables input when disabled prop is true', () => {
    render(
      <InputArea
        onSendMessage={mockOnSendMessage}
        isTyping={false}
        disabled={true}
      />,
      { wrapper: createWrapper() }
    );

    const textarea = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send/i });

    expect(textarea).toBeDisabled();
    expect(sendButton).toBeDisabled();
  });

  it('does not send empty messages', () => {
    render(
      <InputArea
        onSendMessage={mockOnSendMessage}
        isTyping={false}
      />,
      { wrapper: createWrapper() }
    );

    const sendButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendButton);

    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it('does not send whitespace-only messages', () => {
    render(
      <InputArea
        onSendMessage={mockOnSendMessage}
        isTyping={false}
      />,
      { wrapper: createWrapper() }
    );

    const textarea = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(textarea, { target: { value: '   ' } });
    fireEvent.click(sendButton);

    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it('shows character count for long messages', () => {
    render(
      <InputArea
        onSendMessage={mockOnSendMessage}
        isTyping={false}
      />,
      { wrapper: createWrapper() }
    );

    const textarea = screen.getByRole('textbox');
    const longMessage = 'a'.repeat(150);

    fireEvent.change(textarea, { target: { value: longMessage } });

    expect(screen.getByText('150/500')).toBeInTheDocument();
  });

  it('renders suggestion buttons', () => {
    render(
      <InputArea
        onSendMessage={mockOnSendMessage}
        isTyping={false}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('🌱 Opciones vegetarianas')).toBeInTheDocument();
    expect(screen.getByText('🌶️ Comida picante')).toBeInTheDocument();
    expect(screen.getByText('💰 Menú económico')).toBeInTheDocument();
    expect(screen.getByText('🍰 Postres')).toBeInTheDocument();
  });

  it('fills input when suggestion is clicked', () => {
    render(
      <InputArea
        onSendMessage={mockOnSendMessage}
        isTyping={false}
      />,
      { wrapper: createWrapper() }
    );

    const textarea = screen.getByRole('textbox');
    const suggestionButton = screen.getByText('🌱 Opciones vegetarianas');

    fireEvent.click(suggestionButton);

    expect(textarea).toHaveValue('Opciones vegetarianas');
  });

  it('disables suggestion buttons when disabled', () => {
    render(
      <InputArea
        onSendMessage={mockOnSendMessage}
        isTyping={false}
        disabled={true}
      />,
      { wrapper: createWrapper() }
    );

    const suggestionButton = screen.getByText('🌱 Opciones vegetarianas');
    expect(suggestionButton).toBeDisabled();
  });

  it('disables suggestion buttons when typing', () => {
    render(
      <InputArea
        onSendMessage={mockOnSendMessage}
        isTyping={true}
      />,
      { wrapper: createWrapper() }
    );

    const suggestionButton = screen.getByText('🌱 Opciones vegetarianas');
    expect(suggestionButton).toBeDisabled();
  });
});