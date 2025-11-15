import { render, screen } from '@testing-library/react';
import ConnectionStatusIndicator from '../ConnectionStatusIndicator';
import TypingIndicator from '../TypingIndicator';

describe('TypingIndicator Component', () => {
  it('renders typing indicator with correct text', () => {
    render(<TypingIndicator />);
    
    expect(screen.getByText('está escribiendo...')).toBeInTheDocument();
  });

  it('displays animated dots', () => {
    render(<TypingIndicator />);
    
    const dots = screen.getAllByRole('generic');
    // Debería haber al menos 3 dots para la animación
    expect(dots.length).toBeGreaterThanOrEqual(3);
  });

  it('has correct styling classes for chat bubble', () => {
    render(<TypingIndicator />);
    
    const indicator = screen.getByText('está escribiendo...');
    expect(indicator).toHaveClass('text-gray-400');
  });

  it('renders consistently', () => {
    const { container } = render(<TypingIndicator />);
    
    // Renderizar múltiples veces para verificar consistencia
    const { container: container2 } = render(<TypingIndicator />);
    
    expect(container.innerHTML).toBe(container2.innerHTML);
  });
});

describe('ConnectionStatusIndicator Component', () => {
  it('renders connected status by default', () => {
    render(<ConnectionStatusIndicator />);
    
    expect(screen.getByText('En línea')).toBeInTheDocument();
  });

  it('shows connecting status', () => {
    render(<ConnectionStatusIndicator status="connecting" />);
    
    expect(screen.getByText('Conectando...')).toBeInTheDocument();
  });

  it('shows disconnected status', () => {
    render(<ConnectionStatusIndicator status="disconnected" />);
    
    expect(screen.getByText('Desconectado')).toBeInTheDocument();
  });

  it('shows reconnecting status', () => {
    render(<ConnectionStatusIndicator status="reconnecting" />);
    
    expect(screen.getByText('Reconectando...')).toBeInTheDocument();
  });

  it('displays correct color for connected status', () => {
    render(<ConnectionStatusIndicator status="connected" />);
    
    const statusDot = screen.getByRole('status');
    expect(statusDot).toHaveClass('bg-green-500');
  });

  it('displays correct color for connecting status', () => {
    render(<ConnectionStatusIndicator status="connecting" />);
    
    const statusDot = screen.getByRole('status');
    expect(statusDot).toHaveClass('bg-yellow-500');
  });

  it('displays correct color for disconnected status', () => {
    render(<ConnectionStatusIndicator status="disconnected" />);
    
    const statusDot = screen.getByRole('status');
    expect(statusDot).toHaveClass('bg-red-500');
  });

  it('displays correct color for reconnecting status', () => {
    render(<ConnectionStatusIndicator status="reconnecting" />);
    
    const statusDot = screen.getByRole('status');
    expect(statusDot).toHaveClass('bg-orange-500');
  });

  it('handles undefined status gracefully', () => {
    render(<ConnectionStatusIndicator />);
    
    // Debería usar el default (connected)
    expect(screen.getByText('En línea')).toBeInTheDocument();
    const statusDot = screen.getByRole('status');
    expect(statusDot).toHaveClass('bg-green-500');
  });

  it('updates status dynamically', () => {
    const { rerender } = render(<ConnectionStatusIndicator status="connected" />);
    
    expect(screen.getByText('En línea')).toBeInTheDocument();
    
    rerender(<ConnectionStatusIndicator status="disconnected" />);
    
    expect(screen.getByText('Desconectado')).toBeInTheDocument();
    expect(screen.queryByText('En línea')).not.toBeInTheDocument();
  });

  it('renders status dot with proper accessibility', () => {
    render(<ConnectionStatusIndicator status="connected" />);
    
    const statusDot = screen.getByRole('status');
    expect(statusDot).toHaveAttribute('aria-label', expect.stringContaining('estado'));
  });

  it('has proper container styling', () => {
    const { container } = render(<ConnectionStatusIndicator />);
    
    const statusContainer = container.firstChild;
    expect(statusContainer).toHaveClass('flex', 'items-center');
  });

  it('shows pulsing animation for connecting states', () => {
    render(<ConnectionStatusIndicator status="connecting" />);
    
    const statusDot = screen.getByRole('status');
    expect(statusDot).toHaveClass('animate-pulse');
  });

  it('shows pulsing animation for reconnecting states', () => {
    render(<ConnectionStatusIndicator status="reconnecting" />);
    
    const statusDot = screen.getByRole('status');
    expect(statusDot).toHaveClass('animate-pulse');
  });

  it('does not show animation for stable states', () => {
    render(<ConnectionStatusIndicator status="connected" />);
    
    const statusDot = screen.getByRole('status');
    expect(statusDot).not.toHaveClass('animate-pulse');
  });
});