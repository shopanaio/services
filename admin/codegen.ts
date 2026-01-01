/* eslint-disable import/no-default-export */
import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: 'schema.graphql',
  documents: [],
  // ['src/**/*.gql', 'src/**/*.graphql'],
  generates: {
    'src/graphql.ts': {
      plugins: ['typescript', 'typescript-operations'],
      config: {
        typesPrefix: 'Api',
        enumPrefix: false,
        scalars: {
          ID: { input: 'string', output: 'string' },
          String: { input: 'string', output: 'string' },
          Boolean: { input: 'boolean', output: 'boolean' },
          Int: { input: 'number', output: 'number' },
          Float: { input: 'number', output: 'number' },
          Any: { input: 'any', output: 'any' },
          Timestamp: { input: 'string', output: 'string' },
          Uint: { input: 'number', output: 'number' },
          Upload: { input: 'File', output: 'File' },
          Uuid: { input: 'string', output: 'string' },
        },
      },
    },
  },
};

export default config;
