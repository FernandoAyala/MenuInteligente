// Jest setup file
// Configuración global para todos los tests

// Aumentar timeout para hooks (beforeEach, afterEach) cuando hay delays
jest.setTimeout(30000); // 30 segundos

// Importar jest-dom para matchers adicionales en tests de React
// Solo importar si estamos en un entorno jsdom
if (typeof window !== 'undefined') {
  require('@testing-library/jest-dom');
}
