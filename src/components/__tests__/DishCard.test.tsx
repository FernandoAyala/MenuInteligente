import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import DishCard from '../components/DishCard';
import { MenuItem } from '../types';

// Mock de datos para testing
const mockMenuItem: MenuItem = {
  id: 'test-item-1',
  categoryId: 'test-category',
  name: 'Empanadas de Carne',
  description: 'Deliciosas empanadas argentinas con relleno de carne, cebolla y especias.',
  price: 850,
  currency: 'ARS',
  spicyLevel: 1,
  isVegan: false,
  isVegetarian: false,
  isGlutenFree: false,
  allergens: ['gluten'],
  available: true,
  imageUrl: 'https://example.com/empanada.jpg'
};

const mockVeganItem: MenuItem = {
  ...mockMenuItem,
  id: 'test-vegan-item',
  name: 'Buddha Bowl Vegano',
  isVegan: true,
  isVegetarian: true,
  isGlutenFree: true,
  allergens: ['sesame'],
  spicyLevel: 2
};

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

describe('DishCard Component', () => {
  const mockOnClick = jest.fn();
  const mockOnAddToCart = jest.fn();
  const mockOnInterested = jest.fn();
  const mockOnViewAlternatives = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dish information correctly', () => {
    render(
      <DishCard
        menuItem={mockMenuItem}
        onClick={mockOnClick}
        onAddToCart={mockOnAddToCart}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Empanadas de Carne')).toBeInTheDocument();
    expect(screen.getByText(/Deliciosas empanadas argentinas/)).toBeInTheDocument();
    expect(screen.getByText(/\$850/)).toBeInTheDocument();
    expect(screen.getByText('Agregar al pedido')).toBeInTheDocument();
  });

  it('displays dietary indicators for vegan item', () => {
    render(
      <DishCard
        menuItem={mockVeganItem}
        onClick={mockOnClick}
        onAddToCart={mockOnAddToCart}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Vegano')).toBeInTheDocument();
    expect(screen.getByText('Sin gluten')).toBeInTheDocument();
  });

  it('shows spicy level indicators', () => {
    render(
      <DishCard
        menuItem={mockVeganItem}
        onClick={mockOnClick}
        onAddToCart={mockOnAddToCart}
      />,
      { wrapper: createWrapper() }
    );

    // Debería mostrar 2 iconos de fuego para nivel 2
    const flameIcons = screen.getAllByTestId('flame-icon');
    expect(flameIcons).toHaveLength(2);
  });

  it('displays allergen information', () => {
    render(
      <DishCard
        menuItem={mockMenuItem}
        onClick={mockOnClick}
        onAddToCart={mockOnAddToCart}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Contiene: gluten')).toBeInTheDocument();
  });

  it('calls onClick when card is clicked', () => {
    render(
      <DishCard
        menuItem={mockMenuItem}
        onClick={mockOnClick}
        onAddToCart={mockOnAddToCart}
      />,
      { wrapper: createWrapper() }
    );

    fireEvent.click(screen.getByRole('button', { name: /empanadas de carne/i }));
    expect(mockOnClick).toHaveBeenCalledWith(mockMenuItem);
  });

  it('calls onAddToCart when add button is clicked', () => {
    render(
      <DishCard
        menuItem={mockMenuItem}
        onClick={mockOnClick}
        onAddToCart={mockOnAddToCart}
      />,
      { wrapper: createWrapper() }
    );

    fireEvent.click(screen.getByRole('button', { name: /agregar al pedido/i }));
    expect(mockOnAddToCart).toHaveBeenCalledWith(mockMenuItem);
    expect(mockOnClick).not.toHaveBeenCalled(); // No debería llamar onClick
  });

  it('shows chat variant buttons when variant is chat', () => {
    render(
      <DishCard
        menuItem={mockMenuItem}
        onClick={mockOnClick}
        onAddToCart={mockOnAddToCart}
        onInterested={mockOnInterested}
        onViewAlternatives={mockOnViewAlternatives}
        variant="chat"
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Me interesa')).toBeInTheDocument();
    expect(screen.getByText('Ver alternativas')).toBeInTheDocument();
    expect(screen.getByText('Añadir al carrito')).toBeInTheDocument();
  });

  it('calls onInterested when interested button is clicked', () => {
    render(
      <DishCard
        menuItem={mockMenuItem}
        onClick={mockOnClick}
        onAddToCart={mockOnAddToCart}
        onInterested={mockOnInterested}
        onViewAlternatives={mockOnViewAlternatives}
        variant="chat"
      />,
      { wrapper: createWrapper() }
    );

    fireEvent.click(screen.getByRole('button', { name: /me interesa/i }));
    expect(mockOnInterested).toHaveBeenCalledWith(mockMenuItem);
  });

  it('calls onViewAlternatives when alternatives button is clicked', () => {
    render(
      <DishCard
        menuItem={mockMenuItem}
        onClick={mockOnClick}
        onAddToCart={mockOnAddToCart}
        onInterested={mockOnInterested}
        onViewAlternatives={mockOnViewAlternatives}
        variant="chat"
      />,
      { wrapper: createWrapper() }
    );

    fireEvent.click(screen.getByRole('button', { name: /ver alternativas/i }));
    expect(mockOnViewAlternatives).toHaveBeenCalledWith(mockMenuItem);
  });

  it('shows unavailable state when item is not available', () => {
    const unavailableItem = { ...mockMenuItem, available: false };
    
    render(
      <DishCard
        menuItem={unavailableItem}
        onClick={mockOnClick}
        onAddToCart={mockOnAddToCart}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('No disponible')).toBeInTheDocument();
    expect(screen.queryByText('Agregar al pedido')).not.toBeInTheDocument();
  });

  it('does not show add button when showAddButton is false', () => {
    render(
      <DishCard
        menuItem={mockMenuItem}
        onClick={mockOnClick}
        onAddToCart={mockOnAddToCart}
        showAddButton={false}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByText('Agregar al pedido')).not.toBeInTheDocument();
  });
});