import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true
    }]
  },
  moduleNameMapping: {
    '^@src/api/(.*)$': '<rootDir>/src/api/$1',
    '^@config$': '<rootDir>/src/config',
    '^@src/kernel/(.*)$': '<rootDir>/src/kernel/$1',
    '^@src/infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@src/scripts/(.*)$': '<rootDir>/src/scripts/$1'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts'
  ]
};

export default config;
