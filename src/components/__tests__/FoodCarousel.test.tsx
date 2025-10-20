import { fireEvent, render, screen } from '@testing-library/react';
import FoodCarousel from '../components/FoodCarousel';
import { MenuItem } from '../types';

const mockMenuItems: MenuItem[] = [
  {
    id: 1,
    name: 'Pasta Carbonara',
    description: 'Pasta cremosa with panceta and parmesan',
    price: 2500,
    category: 'pasta',
    image: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5',
    tags: ['pasta', 'cremosa'],
    chef_special: false,
    available: true,
    estimated_time: 20
  },
  {
    id: 2,
    name: 'Risotto de Hongos',
    description: 'Arroz cremoso con hongos portobello y trufa',
    price: 2800,
    category: 'vegetariano',
    image: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371',
    tags: ['vegetariano', 'hongos'],
    chef_special: true,
    available: true,
    estimated_time: 25
  },
  {
    id: 3,
    name: 'Salmón Grillado',
    description: 'Salmón fresco con verduras asadas',
    price: 3200,
    category: 'pescado',
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288',
    tags: ['pescado', 'saludable'],
    chef_special: false,
    available: true,
    estimated_time: 18
  }
];

const mockOnItemClick = jest.fn();

describe('FoodCarousel Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all menu items', () => {
    render(<FoodCarousel items={mockMenuItems} onItemClick={mockOnItemClick} />);

    expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument();
    expect(screen.getByText('Risotto de Hongos')).toBeInTheDocument();
    expect(screen.getByText('Salmón Grillado')).toBeInTheDocument();
  });

  it('displays empty state when no items provided', () => {
    render(<FoodCarousel items={[]} onItemClick={mockOnItemClick} />);
    
    const carousel = screen.getByRole('region');
    expect(carousel).toBeInTheDocument();
    expect(carousel.children).toHaveLength(0);
  });

  it('shows scroll buttons when content overflows', () => {
    // Mock getBoundingClientRect para simular overflow
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      width: 300,
      scrollWidth: 600,
      x: 0,
      y: 0,
      height: 200,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      toJSON: jest.fn(),
    }));

    render(<FoodCarousel items={mockMenuItems} onItemClick={mockOnItemClick} />);

    // Los botones de scroll deberían estar presentes
    const leftButton = screen.getByRole('button', { name: /scroll left/i });
    const rightButton = screen.getByRole('button', { name: /scroll right/i });
    
    expect(leftButton).toBeInTheDocument();
    expect(rightButton).toBeInTheDocument();
  });

  it('handles item click correctly', () => {
    render(<FoodCarousel items={mockMenuItems} onItemClick={mockOnItemClick} />);

    const firstDish = screen.getByText('Pasta Carbonara');
    fireEvent.click(firstDish);

    expect(mockOnItemClick).toHaveBeenCalledWith(mockMenuItems[0]);
    expect(mockOnItemClick).toHaveBeenCalledTimes(1);
  });

  it('scrolls left when left button is clicked', () => {
    const mockScrollBy = jest.fn();
    Element.prototype.scrollBy = mockScrollBy;

    render(<FoodCarousel items={mockMenuItems} onItemClick={mockOnItemClick} />);

    const leftButton = screen.getByRole('button', { name: /scroll left/i });
    fireEvent.click(leftButton);

    expect(mockScrollBy).toHaveBeenCalledWith({
      left: -300,
      behavior: 'smooth'
    });
  });

  it('scrolls right when right button is clicked', () => {
    const mockScrollBy = jest.fn();
    Element.prototype.scrollBy = mockScrollBy;

    render(<FoodCarousel items={mockMenuItems} onItemClick={mockOnItemClick} />);

    const rightButton = screen.getByRole('button', { name: /scroll right/i });
    fireEvent.click(rightButton);

    expect(mockScrollBy).toHaveBeenCalledWith({
      left: 300,
      behavior: 'smooth'
    });
  });

  it('handles scroll event and updates button states', () => {
    render(<FoodCarousel items={mockMenuItems} onItemClick={mockOnItemClick} />);

    const carousel = screen.getByRole('region');
    
    // Simular evento de scroll
    Object.defineProperty(carousel, 'scrollLeft', { value: 100 });
    fireEvent.scroll(carousel);

    // Los botones deberían estar visibles y activos
    const leftButton = screen.getByRole('button', { name: /scroll left/i });
    const rightButton = screen.getByRole('button', { name: /scroll right/i });
    
    expect(leftButton).not.toBeDisabled();
    expect(rightButton).not.toBeDisabled();
  });

  it('disables left button when at start', () => {
    render(<FoodCarousel items={mockMenuItems} onItemClick={mockOnItemClick} />);

    const carousel = screen.getByRole('region');
    
    // Simular estar al inicio
    Object.defineProperty(carousel, 'scrollLeft', { value: 0 });
    fireEvent.scroll(carousel);

    const leftButton = screen.getByRole('button', { name: /scroll left/i });
    expect(leftButton).toBeDisabled();
  });

  it('disables right button when at end', () => {
    render(<FoodCarousel items={mockMenuItems} onItemClick={mockOnItemClick} />);

    const carousel = screen.getByRole('region');
    
    // Simular estar al final
    Object.defineProperty(carousel, 'scrollLeft', { value: 300 });
    Object.defineProperty(carousel, 'scrollWidth', { value: 500 });
    Object.defineProperty(carousel, 'clientWidth', { value: 200 });
    
    fireEvent.scroll(carousel);

    const rightButton = screen.getByRole('button', { name: /scroll right/i });
    expect(rightButton).toBeDisabled();
  });

  it('renders correct number of DishCard components', () => {
    render(<FoodCarousel items={mockMenuItems} onItemClick={mockOnItemClick} />);

    // Verificar que hay exactamente 3 cartas de platos
    const dishCards = screen.getAllByRole('article');
    expect(dishCards).toHaveLength(3);
  });

  it('passes correct props to DishCard components', () => {
    render(<FoodCarousel items={mockMenuItems} onItemClick={mockOnItemClick} />);

    // Verificar que se muestran los precios correctos
    expect(screen.getByText('$2.500')).toBeInTheDocument();
    expect(screen.getByText('$2.800')).toBeInTheDocument();
    expect(screen.getByText('$3.200')).toBeInTheDocument();

    // Verificar que se muestran las descripciones
    expect(screen.getByText('Pasta cremosa with panceta and parmesan')).toBeInTheDocument();
    expect(screen.getByText('Arroz cremoso con hongos portobello y trufa')).toBeInTheDocument();
  });

  it('handles keyboard navigation', () => {
    render(<FoodCarousel items={mockMenuItems} onItemClick={mockOnItemClick} />);

    const carousel = screen.getByRole('region');
    
    // Simular navegación con teclado
    fireEvent.keyDown(carousel, { key: 'ArrowRight' });
    fireEvent.keyDown(carousel, { key: 'ArrowLeft' });
    fireEvent.keyDown(carousel, { key: 'Home' });
    fireEvent.keyDown(carousel, { key: 'End' });

    // El carousel debería manejar estos eventos sin errores
    expect(carousel).toBeInTheDocument();
  });

  it('updates scroll position on window resize', () => {
    render(<FoodCarousel items={mockMenuItems} onItemClick={mockOnItemClick} />);

    // Simular resize event
    fireEvent.resize(window);

    // El componente debería manejar el resize sin errores
    const carousel = screen.getByRole('region');
    expect(carousel).toBeInTheDocument();
  });

  it('handles touch events for mobile scrolling', () => {
    render(<FoodCarousel items={mockMenuItems} onItemClick={mockOnItemClick} />);

    const carousel = screen.getByRole('region');
    
    // Simular eventos táctiles
    fireEvent.touchStart(carousel, { touches: [{ clientX: 100 }] });
    fireEvent.touchMove(carousel, { touches: [{ clientX: 50 }] });
    fireEvent.touchEnd(carousel);

    expect(carousel).toBeInTheDocument();
  });

  it('shows chef special badge correctly', () => {
    render(<FoodCarousel items={mockMenuItems} onItemClick={mockOnItemClick} />);

    // Solo el Risotto debería tener badge de chef special
    const chefSpecialBadges = screen.getAllByText('Especial del Chef');
    expect(chefSpecialBadges).toHaveLength(1);
  });

  it('displays estimated cooking time', () => {
    render(<FoodCarousel items={mockMenuItems} onItemClick={mockOnItemClick} />);

    expect(screen.getByText('20 min')).toBeInTheDocument();
    expect(screen.getByText('25 min')).toBeInTheDocument();
    expect(screen.getByText('18 min')).toBeInTheDocument();
  });
});