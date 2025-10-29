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
  moduleNameMapper: {
    '^@src/api/(.*)$': '<rootDir>/src/api/$1',
    '^@config$': '<rootDir>/src/config',
    '^@src/kernel/(.*)$': '<rootDir>/src/kernel/$1',
    '^@src/infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@src/scripts/(.*)$': '<rootDir>/src/scripts/$1',
    '^@shopana/shared-kernel$': '<rootDir>/../../packages/shared-kernel/src/index.ts',
    '^@shopana/shared-kernel/(.*)$': '<rootDir>/../../packages/shared-kernel/src/$1.ts',
    '^@shopana/shared-service-config$': '<rootDir>/../../packages/shared-service-config/src/index.ts',
    '^@shopana/shared-service-config/(.*)$': '<rootDir>/../../packages/shared-service-config/src/$1.ts',
    '^@shopana/import-plugin-sdk$': '<rootDir>/../../packages/import-plugin-sdk/src/index.ts',
    '^@shopana/import-plugin-sdk/(.*)$': '<rootDir>/../../packages/import-plugin-sdk/src/$1.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts'
  ]
};

export default config;
