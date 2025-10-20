import { useCallback } from 'react';

export interface VoiceCommand {
  trigger: string[];
  action: string;
  description: string;
  category: 'navigation' | 'ordering' | 'inquiry' | 'control';
}

interface VoiceCommandsHook {
  processVoiceCommand: (transcript: string) => {
    isCommand: boolean;
    action?: string;
    data?: any;
    response?: string;
  };
  getAvailableCommands: () => VoiceCommand[];
  getCommandHelp: () => string;
}

export const useVoiceCommands = (): VoiceCommandsHook => {
  
  // Definir comandos disponibles
  const voiceCommands: VoiceCommand[] = [
    // Comandos de navegación
    {
      trigger: ['mostrar menú', 'ver menú', 'enseñar menú', 'menú principal'],
      action: 'SHOW_MENU',
      description: 'Muestra el menú completo del restaurante',
      category: 'navigation'
    },
    {
      trigger: ['mostrar carrito', 'ver carrito', 'mi carrito', 'qué tengo en el carrito'],
      action: 'SHOW_CART',
      description: 'Muestra los items en tu carrito de compras',
      category: 'navigation'
    },
    
    // Comandos de pedidos
    {
      trigger: ['agregar al carrito', 'añadir al carrito', 'quiero esto', 'añadir esto'],
      action: 'ADD_TO_CART',
      description: 'Agrega el último plato mencionado al carrito',
      category: 'ordering'
    },
    {
      trigger: ['vaciar carrito', 'limpiar carrito', 'borrar todo', 'empezar de nuevo'],
      action: 'CLEAR_CART',
      description: 'Vacía completamente el carrito de compras',
      category: 'ordering'
    },
    {
      trigger: ['finalizar pedido', 'hacer pedido', 'confirmar pedido', 'proceder al pago'],
      action: 'CHECKOUT',
      description: 'Procede al checkout con los items del carrito',
      category: 'ordering'
    },
    
    // Comandos de consulta
    {
      trigger: ['opciones vegetarianas', 'comida vegetariana', 'platos sin carne'],
      action: 'SHOW_VEGETARIAN',
      description: 'Muestra solo opciones vegetarianas',
      category: 'inquiry'
    },
    {
      trigger: ['opciones veganas', 'comida vegana', 'sin productos animales'],
      action: 'SHOW_VEGAN',
      description: 'Muestra opciones veganas disponibles',
      category: 'inquiry'
    },
    {
      trigger: ['sin gluten', 'opciones sin gluten', 'celíaco'],
      action: 'SHOW_GLUTEN_FREE',
      description: 'Muestra opciones libres de gluten',
      category: 'inquiry'
    },
    {
      trigger: ['postres', 'dulces', 'desserts'],
      action: 'SHOW_DESSERTS',
      description: 'Muestra la selección de postres',
      category: 'inquiry'
    },
    {
      trigger: ['bebidas', 'drinks', 'qué hay para tomar'],
      action: 'SHOW_DRINKS',
      description: 'Muestra las bebidas disponibles',
      category: 'inquiry'
    },
    {
      trigger: ['promociones', 'ofertas', 'descuentos', 'especiales'],
      action: 'SHOW_PROMOTIONS',
      description: 'Muestra ofertas y promociones actuales',
      category: 'inquiry'
    },
    
    // Comandos de control
    {
      trigger: ['ayuda', 'help', 'qué puedo decir', 'comandos'],
      action: 'SHOW_HELP',
      description: 'Muestra lista de comandos disponibles',
      category: 'control'
    },
    {
      trigger: ['repetir', 'repite', 'no escuché'],
      action: 'REPEAT_LAST',
      description: 'Repite la última respuesta del asistente',
      category: 'control'
    },
    {
      trigger: ['empezar de nuevo', 'reiniciar', 'nueva conversación'],
      action: 'RESTART_CHAT',
      description: 'Reinicia la conversación desde el inicio',
      category: 'control'
    }
  ];

  const processVoiceCommand = useCallback((transcript: string): {
    isCommand: boolean;
    action?: string;
    data?: any;
    response?: string;
  } => {
    const normalizedTranscript = transcript.toLowerCase().trim();
    
    // Buscar coincidencias de comandos
    for (const command of voiceCommands) {
      for (const trigger of command.trigger) {
        if (normalizedTranscript.includes(trigger.toLowerCase())) {
          return {
            isCommand: true,
            action: command.action,
            response: getCommandResponse(command.action, normalizedTranscript)
          };
        }
      }
    }
    
    // Si no es un comando específico, verificar patrones de intención
    const intentResponse = detectIntent(normalizedTranscript);
    if (intentResponse.isCommand) {
      return intentResponse;
    }
    
    return { isCommand: false };
  }, []);

  const detectIntent = (transcript: string) => {
    const text = transcript.toLowerCase();
    
    // Patrones de pedido directo
    const orderPatterns = [
      /quiero (una?|un) (.+)/i,
      /me gustaría (una?|un) (.+)/i,
      /pido (una?|un) (.+)/i,
      /dame (una?|un) (.+)/i
    ];
    
    for (const pattern of orderPatterns) {
      const match = text.match(pattern);
      if (match && match[2]) {
        return {
          isCommand: true,
          action: 'DIRECT_ORDER',
          data: { item: match[2] },
          response: `Perfecto, buscando "${match[2]}" en nuestro menú. Te muestro las opciones disponibles:`
        };
      }
    }
    
    // Patrones de cantidad
    const quantityPatterns = [
      /(\d+) (de |x )?(.+)/i,
      /(dos|tres|cuatro|cinco) (.+)/i
    ];
    
    for (const pattern of quantityPatterns) {
      const match = text.match(pattern);
      if (match) {
        const quantity = match[1] === 'dos' ? '2' : 
                        match[1] === 'tres' ? '3' :
                        match[1] === 'cuatro' ? '4' :
                        match[1] === 'cinco' ? '5' : match[1];
        
        return {
          isCommand: true,
          action: 'QUANTITY_ORDER',
          data: { 
            quantity: parseInt(quantity), 
            item: match[3] || match[2] 
          },
          response: `Entendido, ${quantity} unidades de "${match[3] || match[2]}". Buscando en el menú...`
        };
      }
    }
    
    return { isCommand: false };
  };

  const getCommandResponse = (action: string, _transcript: string): string => {
    switch (action) {
      case 'SHOW_MENU':
        return '🍽️ Aquí tienes nuestro menú completo. ¡Elige lo que más te guste!';
      
      case 'SHOW_CART':
        return '🛒 Estos son los items en tu carrito actual:';
      
      case 'ADD_TO_CART':
        return '✅ ¡Perfecto! He agregado el plato al carrito. ¿Quieres algo más?';
      
      case 'CLEAR_CART':
        return '🗑️ Carrito vaciado completamente. ¿Empezamos de nuevo con tu pedido?';
      
      case 'CHECKOUT':
        return '💳 Procediendo al checkout. Revisemos tu pedido antes de confirmar:';
      
      case 'SHOW_VEGETARIAN':
        return '🥗 Aquí tienes nuestras deliciosas opciones vegetarianas:';
      
      case 'SHOW_VEGAN':
        return '🌱 Estas son nuestras opciones 100% veganas:';
      
      case 'SHOW_GLUTEN_FREE':
        return '🌾 Opciones libres de gluten disponibles:';
      
      case 'SHOW_DESSERTS':
        return '🍰 ¡Los postres más deliciosos te esperan!';
      
      case 'SHOW_DRINKS':
        return '🥤 Refréscate con nuestras bebidas:';
      
      case 'SHOW_PROMOTIONS':
        return '🎉 ¡Aprovecha estas ofertas especiales!';
      
      case 'SHOW_HELP':
        return '💡 Puedes usar estos comandos de voz:\n\n' + getCommandHelp();
      
      case 'REPEAT_LAST':
        return '🔄 Repitiendo la última información...';
      
      case 'RESTART_CHAT':
        return '🆕 ¡Perfecto! Empezamos una nueva conversación. ¿En qué puedo ayudarte hoy?';
      
      default:
        return 'Comando reconocido, procesando...';
    }
  };

  const getAvailableCommands = useCallback(() => voiceCommands, []);

  const getCommandHelp = useCallback((): string => {
    const categories = {
      navigation: '📋 Navegación',
      ordering: '🛒 Pedidos',
      inquiry: '❓ Consultas',
      control: '⚙️ Control'
    };

    let help = '';
    Object.entries(categories).forEach(([category, title]) => {
      help += `\n${title}:\n`;
      voiceCommands
        .filter(cmd => cmd.category === category)
        .forEach(cmd => {
          help += `• "${cmd.trigger[0]}" - ${cmd.description}\n`;
        });
    });
    
    return help;
  }, []);

  return {
    processVoiceCommand,
    getAvailableCommands,
    getCommandHelp
  };
};