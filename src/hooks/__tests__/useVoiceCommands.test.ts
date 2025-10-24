/**
 * Tests para useVoiceCommands hook
 * @jest-environment jsdom
 */

import { renderHook } from '@testing-library/react';
import { useVoiceCommands, VoiceCommand } from '../useVoiceCommands';

describe('useVoiceCommands', () => {
  let result: ReturnType<typeof useVoiceCommands>;

  beforeEach(() => {
    const { result: hookResult } = renderHook(() => useVoiceCommands());
    result = hookResult.current;
  });

  describe('getAvailableCommands', () => {
    it('debe retornar todos los comandos disponibles', () => {
      const commands = result.getAvailableCommands();

      expect(Array.isArray(commands)).toBe(true);
      expect(commands.length).toBeGreaterThan(0);
      
      // Verificar estructura de comandos
      commands.forEach(command => {
        expect(command).toHaveProperty('trigger');
        expect(command).toHaveProperty('action');
        expect(command).toHaveProperty('description');
        expect(command).toHaveProperty('category');
        expect(Array.isArray(command.trigger)).toBe(true);
      });
    });

    it('debe incluir comandos de todas las categorías', () => {
      const commands = result.getAvailableCommands();
      const categories = commands.map(cmd => cmd.category);

      expect(categories).toContain('navigation');
      expect(categories).toContain('ordering');
      expect(categories).toContain('inquiry');
      expect(categories).toContain('control');
    });
  });

  describe('getCommandHelp', () => {
    it('debe retornar ayuda estructurada por categorías', () => {
      const help = result.getCommandHelp();

      expect(typeof help).toBe('string');
      expect(help).toContain('📋 Navegación');
      expect(help).toContain('🛒 Pedidos');
      expect(help).toContain('❓ Consultas');
      expect(help).toContain('⚙️ Control');
    });

    it('debe incluir descripciones de comandos', () => {
      const help = result.getCommandHelp();

      expect(help).toContain('Muestra el menú completo');
      expect(help).toContain('Agrega el último plato');
      expect(help).toContain('opciones vegetarianas');
    });
  });

  describe('processVoiceCommand - Comandos específicos', () => {
    describe('Comandos de navegación', () => {
      it('debe reconocer comando para mostrar menú', () => {
        const testCases = [
          'mostrar menú',
          'ver menú',
          'enseñar menú',
          'menú principal'
        ];

        testCases.forEach(transcript => {
          const response = result.processVoiceCommand(transcript);
          expect(response.isCommand).toBe(true);
          expect(response.action).toBe('SHOW_MENU');
          expect(response.response).toContain('🍽️');
        });
      });

      it('debe reconocer comando para mostrar carrito', () => {
        const testCases = [
          'mostrar carrito',
          'ver carrito',
          'mi carrito',
          'qué tengo en el carrito'
        ];

        testCases.forEach(transcript => {
          const response = result.processVoiceCommand(transcript);
          expect(response.isCommand).toBe(true);
          expect(response.action).toBe('SHOW_CART');
          expect(response.response).toContain('🛒');
        });
      });
    });

    describe('Comandos de pedidos', () => {
      it('debe reconocer comando para agregar al carrito', () => {
        const testCases = [
          'agregar al carrito',
          'añadir al carrito',
          'quiero esto',
          'añadir esto'
        ];

        testCases.forEach(transcript => {
          const response = result.processVoiceCommand(transcript);
          expect(response.isCommand).toBe(true);
          expect(response.action).toBe('ADD_TO_CART');
          expect(response.response).toContain('✅');
        });
      });

      it('debe reconocer comando para vaciar carrito', () => {
        const testCases = [
          'vaciar carrito',
          'limpiar carrito',
          'borrar todo',
          'empezar de nuevo'
        ];

        testCases.forEach(transcript => {
          const response = result.processVoiceCommand(transcript);
          expect(response.isCommand).toBe(true);
          expect(response.action).toBe('CLEAR_CART');
          expect(response.response).toContain('🗑️');
        });
      });

      it('debe reconocer comando para finalizar pedido', () => {
        const testCases = [
          'finalizar pedido',
          'hacer pedido',
          'confirmar pedido',
          'proceder al pago'
        ];

        testCases.forEach(transcript => {
          const response = result.processVoiceCommand(transcript);
          expect(response.isCommand).toBe(true);
          expect(response.action).toBe('CHECKOUT');
          expect(response.response).toContain('💳');
        });
      });
    });

    describe('Comandos de consulta', () => {
      it('debe reconocer comando para opciones vegetarianas', () => {
        const testCases = [
          'opciones vegetarianas',
          'comida vegetariana',
          'platos sin carne'
        ];

        testCases.forEach(transcript => {
          const response = result.processVoiceCommand(transcript);
          expect(response.isCommand).toBe(true);
          expect(response.action).toBe('SHOW_VEGETARIAN');
          expect(response.response).toContain('🥗');
        });
      });

      it('debe reconocer comando para opciones veganas', () => {
        const testCases = [
          'opciones veganas',
          'comida vegana',
          'sin productos animales'
        ];

        testCases.forEach(transcript => {
          const response = result.processVoiceCommand(transcript);
          expect(response.isCommand).toBe(true);
          expect(response.action).toBe('SHOW_VEGAN');
          expect(response.response).toContain('🌱');
        });
      });

      it('debe reconocer comando para opciones sin gluten', () => {
        const testCases = [
          'sin gluten',
          'opciones sin gluten',
          'celíaco'
        ];

        testCases.forEach(transcript => {
          const response = result.processVoiceCommand(transcript);
          expect(response.isCommand).toBe(true);
          expect(response.action).toBe('SHOW_GLUTEN_FREE');
          expect(response.response).toContain('🌾');
        });
      });

      it('debe reconocer comando para postres', () => {
        const testCases = [
          'postres',
          'dulces',
          'desserts'
        ];

        testCases.forEach(transcript => {
          const response = result.processVoiceCommand(transcript);
          expect(response.isCommand).toBe(true);
          expect(response.action).toBe('SHOW_DESSERTS');
          expect(response.response).toContain('🍰');
        });
      });

      it('debe reconocer comando para bebidas', () => {
        const testCases = [
          'bebidas',
          'drinks',
          'qué hay para tomar'
        ];

        testCases.forEach(transcript => {
          const response = result.processVoiceCommand(transcript);
          expect(response.isCommand).toBe(true);
          expect(response.action).toBe('SHOW_DRINKS');
          expect(response.response).toContain('🥤');
        });
      });

      it('debe reconocer comando para promociones', () => {
        const testCases = [
          'promociones',
          'ofertas',
          'descuentos',
          'especiales'
        ];

        testCases.forEach(transcript => {
          const response = result.processVoiceCommand(transcript);
          expect(response.isCommand).toBe(true);
          expect(response.action).toBe('SHOW_PROMOTIONS');
          expect(response.response).toContain('🎉');
        });
      });
    });

    describe('Comandos de control', () => {
      it('debe reconocer comando para ayuda', () => {
        const testCases = [
          'ayuda',
          'help',
          'qué puedo decir',
          'comandos'
        ];

        testCases.forEach(transcript => {
          const response = result.processVoiceCommand(transcript);
          expect(response.isCommand).toBe(true);
          expect(response.action).toBe('SHOW_HELP');
          expect(response.response).toContain('💡');
          expect(response.response).toContain('📋 Navegación');
        });
      });

      it('debe reconocer comando para repetir', () => {
        const testCases = [
          'repetir',
          'repite',
          'no escuché'
        ];

        testCases.forEach(transcript => {
          const response = result.processVoiceCommand(transcript);
          expect(response.isCommand).toBe(true);
          expect(response.action).toBe('REPEAT_LAST');
          expect(response.response).toContain('🔄');
        });
      });

      it('debe reconocer comando para reiniciar', () => {
        const testCases = [
          'empezar de nuevo',
          'reiniciar',
          'nueva conversación'
        ];

        testCases.forEach(transcript => {
          const response = result.processVoiceCommand(transcript);
          expect(response.isCommand).toBe(true);
          expect(response.action).toBe('RESTART_CHAT');
          expect(response.response).toContain('🆕');
        });
      });
    });
  });

  describe('processVoiceCommand - Detección de intenciones', () => {
    describe('Patrones de pedido directo', () => {
      it('debe detectar "quiero una/un"', () => {
        const testCases = [
          { input: 'quiero una pizza', expected: 'pizza' },
          { input: 'quiero un café', expected: 'café' },
          { input: 'quiero una hamburguesa con papas', expected: 'hamburguesa con papas' }
        ];

        testCases.forEach(({ input, expected }) => {
          const response = result.processVoiceCommand(input);
          expect(response.isCommand).toBe(true);
          expect(response.action).toBe('DIRECT_ORDER');
          expect(response.data?.item).toBe(expected);
          expect(response.response).toContain(`buscando "${expected}"`);
        });
      });

      it('debe detectar "me gustaría una/un"', () => {
        const testCases = [
          { input: 'me gustaría una ensalada', expected: 'ensalada' },
          { input: 'me gustaría un jugo', expected: 'jugo' }
        ];

        testCases.forEach(({ input, expected }) => {
          const response = result.processVoiceCommand(input);
          expect(response.isCommand).toBe(true);
          expect(response.action).toBe('DIRECT_ORDER');
          expect(response.data?.item).toBe(expected);
        });
      });

      it('debe detectar "pido una/un"', () => {
        const response = result.processVoiceCommand('pido una pasta carbonara');
        expect(response.isCommand).toBe(true);
        expect(response.action).toBe('DIRECT_ORDER');
        expect(response.data?.item).toBe('pasta carbonara');
      });

      it('debe detectar "dame una/un"', () => {
        const response = result.processVoiceCommand('dame un sándwich');
        expect(response.isCommand).toBe(true);
        expect(response.action).toBe('DIRECT_ORDER');
        expect(response.data?.item).toBe('sándwich');
      });
    });

    describe('Patrones de cantidad', () => {
      it('debe detectar cantidades numéricas', () => {
        const testCases = [
          { input: '2 pizzas', expectedQty: 2, expectedItem: 'pizzas' },
          { input: '3 de hamburguesas', expectedQty: 3, expectedItem: 'hamburguesas' },
          { input: '5 x tacos', expectedQty: 5, expectedItem: 'tacos' }
        ];

        testCases.forEach(({ input, expectedQty, expectedItem }) => {
          const response = result.processVoiceCommand(input);
          expect(response.isCommand).toBe(true);
          expect(response.action).toBe('QUANTITY_ORDER');
          expect(response.data?.quantity).toBe(expectedQty);
          expect(response.data?.item).toBe(expectedItem);
        });
      });

      it('debe detectar cantidades en palabras', () => {
        const testCases = [
          { input: 'dos empanadas', expectedQty: 2, expectedItem: 'empanadas' },
          { input: 'tres cervezas', expectedQty: 3, expectedItem: 'cervezas' },
          { input: 'cuatro tacos', expectedQty: 4, expectedItem: 'tacos' },
          { input: 'cinco pizzas', expectedQty: 5, expectedItem: 'pizzas' }
        ];

        testCases.forEach(({ input, expectedQty, expectedItem }) => {
          const response = result.processVoiceCommand(input);
          expect(response.isCommand).toBe(true);
          expect(response.action).toBe('QUANTITY_ORDER');
          expect(response.data?.quantity).toBe(expectedQty);
          expect(response.data?.item).toBe(expectedItem);
          expect(response.response).toContain(`${expectedQty} unidades`);
        });
      });
    });
  });

  describe('processVoiceCommand - Casos no reconocidos', () => {
    it('debe retornar isCommand: false para texto no reconocido', () => {
      const testCases = [
        'esto es solo texto normal',
        'no hay comandos aquí',
        'palabras aleatorias sin sentido',
        'hola cómo estás'
      ];

      testCases.forEach(transcript => {
        const response = result.processVoiceCommand(transcript);
        expect(response.isCommand).toBe(false);
        expect(response.action).toBeUndefined();
        expect(response.response).toBeUndefined();
      });
    });

    it('debe manejar texto vacío', () => {
      const response = result.processVoiceCommand('');
      expect(response.isCommand).toBe(false);
    });

    it('debe manejar texto con solo espacios', () => {
      const response = result.processVoiceCommand('   ');
      expect(response.isCommand).toBe(false);
    });
  });

  describe('processVoiceCommand - Normalización de texto', () => {
    it('debe ser insensible a mayúsculas', () => {
      const testCases = [
        'MOSTRAR MENÚ',
        'Mostrar Menú',
        'mOsTrAr MeNú',
        'mostrar menú'
      ];

      testCases.forEach(transcript => {
        const response = result.processVoiceCommand(transcript);
        expect(response.isCommand).toBe(true);
        expect(response.action).toBe('SHOW_MENU');
      });
    });

    it('debe manejar espacios extra', () => {
      const testCases = [
        '  mostrar menú  ',
        'mostrar   menú',
        ' mostrar  menú '
      ];

      testCases.forEach(transcript => {
        const response = result.processVoiceCommand(transcript);
        expect(response.isCommand).toBe(true);
        expect(response.action).toBe('SHOW_MENU');
      });
    });

    it('debe reconocer comandos parciales dentro de frases', () => {
      const testCases = [
        'por favor mostrar menú ahora',
        'necesito ver el carrito please',
        'quiero que me muestres las bebidas'
      ];

      const expected = ['SHOW_MENU', 'SHOW_CART', 'SHOW_DRINKS'];

      testCases.forEach((transcript, index) => {
        const response = result.processVoiceCommand(transcript);
        expect(response.isCommand).toBe(true);
        expect(response.action).toBe(expected[index]);
      });
    });
  });

  describe('Casos de uso realistas', () => {
    it('debe manejar flujo de pedido completo', () => {
      const steps = [
        { input: 'mostrar menú', expectedAction: 'SHOW_MENU' },
        { input: 'quiero una pizza margherita', expectedAction: 'DIRECT_ORDER' },
        { input: 'agregar al carrito', expectedAction: 'ADD_TO_CART' },
        { input: 'dos cervezas', expectedAction: 'QUANTITY_ORDER' },
        { input: 'ver carrito', expectedAction: 'SHOW_CART' },
        { input: 'finalizar pedido', expectedAction: 'CHECKOUT' }
      ];

      steps.forEach(({ input, expectedAction }) => {
        const response = result.processVoiceCommand(input);
        expect(response.isCommand).toBe(true);
        expect(response.action).toBe(expectedAction);
        expect(response.response).toBeDefined();
      });
    });

    it('debe manejar consultas dietéticas', () => {
      const queries = [
        { input: 'opciones vegetarianas', expectedAction: 'SHOW_VEGETARIAN' },
        { input: 'comida vegana', expectedAction: 'SHOW_VEGAN' },
        { input: 'sin gluten', expectedAction: 'SHOW_GLUTEN_FREE' }
      ];

      queries.forEach(({ input, expectedAction }) => {
        const response = result.processVoiceCommand(input);
        expect(response.isCommand).toBe(true);
        expect(response.action).toBe(expectedAction);
      });
    });

    it('debe manejar comandos de ayuda y control', () => {
      const controls = [
        { input: 'ayuda', expectedAction: 'SHOW_HELP' },
        { input: 'repetir', expectedAction: 'REPEAT_LAST' },
        { input: 'empezar de nuevo', expectedAction: 'RESTART_CHAT' }
      ];

      controls.forEach(({ input, expectedAction }) => {
        const response = result.processVoiceCommand(input);
        expect(response.isCommand).toBe(true);
        expect(response.action).toBe(expectedAction);
      });
    });
  });

  describe('Consistencia de interfaz', () => {
    it('debe mantener interfaz consistente en todas las respuestas', () => {
      const commands = result.getAvailableCommands();
      
      commands.forEach(command => {
        const response = result.processVoiceCommand(command.trigger[0]);
        expect(response).toHaveProperty('isCommand');
        expect(response).toHaveProperty('action');
        expect(response).toHaveProperty('response');
        expect(response.isCommand).toBe(true);
      });
    });

    it('debe retornar respuestas con emojis para mejor UX', () => {
      const testCommands = [
        'mostrar menú',
        'ver carrito',
        'opciones vegetarianas',
        'ayuda'
      ];

      testCommands.forEach(command => {
        const response = result.processVoiceCommand(command);
        expect(response.response).toMatch(/[\u{1F000}-\u{1F9FF}]/u); // Contiene emoji
      });
    });
  });
});