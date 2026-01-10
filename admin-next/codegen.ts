import { CodegenConfig } from '@graphql-codegen/cli';

const scalars = {
  ID: { input: 'string', output: 'string' },
  String: { input: 'string', output: 'string' },
  Boolean: { input: 'boolean', output: 'boolean' },
  Int: { input: 'number', output: 'number' },
  Float: { input: 'number', output: 'number' },
  JSON: { input: 'Record<string, unknown>', output: 'Record<string, unknown>' },
  DateTime: { input: 'string', output: 'string' },
  Timestamp: { input: 'string', output: 'string' },
  Email: { input: 'string', output: 'string' },
  BigInt: { input: 'string', output: 'string' },
  Upload: { input: 'File', output: 'File' },
  TransportOptions: { input: 'unknown', output: 'unknown' },
};

const config: CodegenConfig = {
  overwrite: true,
  schema: 'schema.graphql',
  // documents: ['src/**/*.graphql', 'src/**/*.gql'],
  generates: {
    'src/graphql/types.ts': {
      plugins: ['typescript'],
      config: {
        typesPrefix: 'Api',
        enumPrefix: false,
        scalars,
        skipTypename: false,
        avoidOptionals: false,
        maybeValue: 'T | null',
      },
    },
  },
};

export default config;
