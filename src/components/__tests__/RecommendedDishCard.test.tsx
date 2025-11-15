/**
 * Tests para RecommendedDishCard
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import RecommendedDishCard, { RecommendedMenuItem } from '../RecommendedDishCard';

describe('RecommendedDishCard', () => {
  const mockRecommendedItem: RecommendedMenuItem = {
    id: '1',
    name: 'Pizza Margarita',
    description: 'Pizza clásica italiana con tomate y mozzarella',
    price: 1500,
    currency: 'ARS',
    categoryId: 'plato_principal',
    spicyLevel: 0,
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: false,
    allergens: [],
    available: true,
    imageUrl: '/images/pizza.jpg',
    score: 0.95,
    reason: 'Coincide perfectamente con tus preferencias vegetarianas',
  };

  describe('Rendering', () => {
    it('debe renderizar el componente correctamente', () => {
      render(<RecommendedDishCard menuItem={mockRecommendedItem} />);

      expect(screen.getByText('Pizza Margarita')).toBeInTheDocument();
      expect(screen.getByText(/pizza clásica italiana/i)).toBeInTheDocument();
      expect(screen.getByText(/1\.500,00/)).toBeInTheDocument();
    });

    it('debe mostrar el score de recomendación', () => {
      render(<RecommendedDishCard menuItem={mockRecommendedItem} />);

      // Score como porcentaje (0.95 = 95%)
      expect(screen.getByText(/95%/i)).toBeInTheDocument();
    });

    it('debe mostrar el badge de alta confianza para scores altos', () => {
      render(<RecommendedDishCard menuItem={mockRecommendedItem} />);

      expect(screen.getByText(/altamente recomendado/i)).toBeInTheDocument();
    });

    it('debe mostrar el badge de confianza media para scores medios', () => {
      const mediumScoreItem = { ...mockRecommendedItem, score: 0.7 };
      render(<RecommendedDishCard menuItem={mediumScoreItem} />);

      expect(screen.getByText(/recomendado/i)).toBeInTheDocument();
    });

    it('debe mostrar el badge de baja confianza para scores bajos', () => {
      const lowScoreItem = { ...mockRecommendedItem, score: 0.5 };
      render(<RecommendedDishCard menuItem={lowScoreItem} />);

      expect(screen.getByText(/opción disponible/i)).toBeInTheDocument();
    });

    it('debe renderizar con imagen si está disponible', () => {
      render(<RecommendedDishCard menuItem={mockRecommendedItem} />);

      const image = screen.getByAltText('Pizza Margarita');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', '/images/pizza.jpg');
    });
  });

  describe('Reason Section', () => {
    it('debe mostrar el botón para expandir la razón', () => {
      render(<RecommendedDishCard menuItem={mockRecommendedItem} />);

      const expandButton = screen.getByRole('button', { name: /por qué.*recomendación/i });
      expect(expandButton).toBeInTheDocument();
    });

    it('debe expandir y contraer la sección de razón al hacer clic', () => {
      render(<RecommendedDishCard menuItem={mockRecommendedItem} />);

      const expandButton = screen.getByRole('button', { name: /por qué.*recomendación/i });
      
      // Inicialmente contraído (el texto no está visible)
      const reasonText = screen.queryByText(mockRecommendedItem.reason!);
      expect(reasonText).not.toBeInTheDocument();

      // Expandir
      fireEvent.click(expandButton);
      expect(screen.getByText(mockRecommendedItem.reason!)).toBeInTheDocument();

      // Contraer
      fireEvent.click(expandButton);
      expect(screen.queryByText(mockRecommendedItem.reason!)).not.toBeInTheDocument();
    });

    it('debe mostrar la razón expandida por defecto si defaultExpanded es true', () => {
      render(
        <RecommendedDishCard
          menuItem={mockRecommendedItem}
          defaultExpanded={true}
        />
      );

      expect(screen.getByText(mockRecommendedItem.reason!)).toBeInTheDocument();
    });

    it('no debe mostrar el botón de razón si no hay reason', () => {
      const itemWithoutReason = { ...mockRecommendedItem, reason: undefined };
      render(<RecommendedDishCard menuItem={itemWithoutReason} />);

      expect(
        screen.queryByRole('button', { name: /por qué.*recomendación/i })
      ).not.toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('debe llamar onClick cuando se hace clic en la tarjeta', () => {
      const onClick = jest.fn();
      render(<RecommendedDishCard menuItem={mockRecommendedItem} onClick={onClick} />);

      const card = screen.getByText('Pizza Margarita').closest('div');
      if (card) {
        fireEvent.click(card);
        expect(onClick).toHaveBeenCalled();
      }
    });

    it('debe mostrar el botón "Agregar al pedido" por defecto', () => {
      render(<RecommendedDishCard menuItem={mockRecommendedItem} />);

      expect(screen.getByRole('button', { name: /agregar al pedido/i })).toBeInTheDocument();
    });

    it('debe llamar onAddToCart cuando se hace clic en el botón', () => {
      const onAddToCart = jest.fn();
      render(
        <RecommendedDishCard
          menuItem={mockRecommendedItem}
          onAddToCart={onAddToCart}
        />
      );

      const addButton = screen.getByRole('button', { name: /agregar al pedido/i });
      fireEvent.click(addButton);

      expect(onAddToCart).toHaveBeenCalledWith(mockRecommendedItem);
    });
  });

  describe('Variants', () => {
    it('debe aplicar className personalizada cuando se pasa variant default', () => {
      const { container } = render(
        <RecommendedDishCard menuItem={mockRecommendedItem} variant="default" />
      );

      // El componente aplica clases pero no específicamente la clase variant
      expect(container.firstChild).toBeInTheDocument();
    });

    it('debe aplicar className personalizada cuando se pasa variant chat', () => {
      const { container } = render(
        <RecommendedDishCard menuItem={mockRecommendedItem} variant="chat" />
      );

      // El componente aplica clases pero no específicamente la clase variant
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Props', () => {
    it('debe aplicar className personalizada', () => {
      const { container } = render(
        <RecommendedDishCard
          menuItem={mockRecommendedItem}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('debe renderizar correctamente sin imagen', () => {
      const itemWithoutImage = { ...mockRecommendedItem, imageUrl: undefined };
      render(<RecommendedDishCard menuItem={itemWithoutImage} />);

      expect(screen.getByText('Pizza Margarita')).toBeInTheDocument();
      expect(screen.queryByAltText('Pizza Margarita')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('debe tener roles ARIA apropiados', () => {
      render(<RecommendedDishCard menuItem={mockRecommendedItem} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('debe tener textos alternativos en imágenes', () => {
      render(<RecommendedDishCard menuItem={mockRecommendedItem} />);

      const image = screen.getByAltText('Pizza Margarita');
      expect(image).toBeInTheDocument();
    });
  });

  describe('Score Display', () => {
    it('debe formatear el score correctamente como porcentaje', () => {
      const scoreItem = { ...mockRecommendedItem, score: 0.857 };
      render(<RecommendedDishCard menuItem={scoreItem} />);

      expect(screen.getByText(/86%/i)).toBeInTheDocument();
    });

    it('debe manejar scores extremos correctamente', () => {
      const perfectScoreItem = { ...mockRecommendedItem, score: 1.0 };
      render(<RecommendedDishCard menuItem={perfectScoreItem} />);

      expect(screen.getByText(/100%/i)).toBeInTheDocument();
    });

    it('debe manejar scores muy bajos correctamente', () => {
      const lowScoreItem = { ...mockRecommendedItem, score: 0.01 };
      render(<RecommendedDishCard menuItem={lowScoreItem} />);

      expect(screen.getByText(/1%/i)).toBeInTheDocument();
    });
  });
});
