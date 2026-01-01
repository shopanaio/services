import type { Config } from '@jest/types';

// jest.config.js
// In the following statement, replace `./tsconfig` with the path to your `tsconfig` file
// which contains the path mapping (ie the `compilerOptions.paths` option):

// Sync object
const config: Config.InitialOptions = {
  verbose: true,
  testEnvironment: 'jest-environment-jsdom',
  automock: false,
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
    // './src/api/very-important-module.js': {
    //   branches: 100,
    //   functions: 100,
    //   lines: 100,
    //   statements: 100,
    // },
  },

  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)?$': 'ts-jest',
    '^.+\\.js$': 'babel-jest',
  },
  testMatch: ['<rootDir>/**/*.test.(js|jsx|ts|tsx)'],
  transformIgnorePatterns: ['[/\\\\]node_modules[/\\\\].+\\.(js|jsx)$'],
  moduleNameMapper: {
    '\\.(jpg|ico|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/src/__mocks__/fileMock.js',
    '\\.css$': '<rootDir>/src/__mocks__/fileMock.js',
    '@components/(.*)': '<rootDir>src/components/$1',
    '@wip/(.*)': '<rootDir>src/ccc/components-wip/$1',
    '@utils/(.*)': '<rootDir>src/ccc/utils/$1',
    '@modules/(.*)': '<rootDir>src/modules/$1',
    '@src/(.*)': '<rootDir>src/$1',
    '@defs/(.*)': '<rootDir>src/defs/$1',
    '@hooks/(.*)': '<rootDir>src/hooks/$1',
    '@entity/(.*)': '<rootDir>src/entity/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};

export default config;
