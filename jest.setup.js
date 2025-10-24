// Jest setup file
// Configuración global para todos los tests

// Aumentar timeout para hooks (beforeEach, afterEach) cuando hay delays
jest.setTimeout(30000); // 30 segundos

// Mock global para import.meta.env
// Jest no soporta import.meta nativamente, necesitamos mockearlo
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        VITE_API_URL: 'http://localhost:3000',
        VITE_WS_URL: 'ws://localhost:3000',
        NODE_ENV: 'test'
      }
    }
  },
  writable: true
});

// Mock para casos donde se accede directamente
global.import = {
  meta: {
    env: {
      VITE_API_URL: 'http://localhost:3000',
      VITE_WS_URL: 'ws://localhost:3000',
      NODE_ENV: 'test'
    }
  }
};

// Mock específicos para archivos que usan import.meta
jest.mock('./src/services/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    defaults: {
      baseURL: 'http://localhost:3000',
      timeout: 20000
    }
  }
}));

jest.mock('./src/services/api/ordersService', () => ({
  ordersService: {
    createOrder: jest.fn(),
    getOrderById: jest.fn(),
    updateOrder: jest.fn(),
    deleteOrder: jest.fn(),
    getAllOrders: jest.fn()
  }
}));

// Importar jest-dom para matchers adicionales en tests de React
// Solo importar si estamos en un entorno jsdom
if (typeof window !== 'undefined') {
  require('@testing-library/jest-dom');
}
