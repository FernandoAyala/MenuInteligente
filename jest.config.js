module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/__tests__/**/*.tsx',
    '**/?(*.)+(spec|test).ts',
    '**/?(*.)+(spec|test).tsx'
  ],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    'src/**/*.tsx',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.test.tsx',
    '!src/**/*.spec.ts',
    '!src/**/*.spec.tsx',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  verbose: true,
  // Timeouts más largos para permitir delays entre tests (rate limiting)
  testTimeout: 30000, // 30 segundos por test
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Configuración específica por proyecto
  projects: [
    {
      displayName: 'server',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/src/**/__tests__/**/*.ts',
        '<rootDir>/src/**/?(*.)(spec|test).ts',
        '<rootDir>/tests/**/*.ts',
      ],
      transform: {
        '^.+\\.ts$': 'ts-jest',
      },
    },
    {
      displayName: 'components',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/src/components/__tests__/**/*.tsx',
        '<rootDir>/src/components/**/?(*.)(spec|test).tsx',
      ],
      transform: {
        '^.+\\.tsx?$': 'ts-jest',
      },
      moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
      },
    },
  ],
};
