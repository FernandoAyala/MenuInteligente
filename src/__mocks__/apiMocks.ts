/**
 * Mock para servicios que usan import.meta.env
 * Este archivo se usa en Jest para reemplazar import.meta.env con valores de test
 */

// Mock para client.ts
jest.mock('../services/api/client', () => {
  const mockApiClient = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    defaults: {
      baseURL: 'http://localhost:3000',
      timeout: 20000
    }
  };

  return {
    apiClient: mockApiClient
  };
});

// Mock para ordersService.ts que usa import.meta.env
jest.mock('../services/api/ordersService', () => ({
  ordersService: {
    createOrder: jest.fn(),
    getOrderById: jest.fn(),
    updateOrder: jest.fn(),
    deleteOrder: jest.fn(),
    getAllOrders: jest.fn()
  }
}));

export {};