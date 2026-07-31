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
  BigInt: { input: 'number', output: 'number' },
  Upload: { input: 'File', output: 'File' },
  TransportOptions: { input: 'unknown', output: 'unknown' },
};

const config: CodegenConfig = {
  overwrite: true,
  // documents: ['src/**/*.graphql', 'src/**/*.gql'],
  generates: {
    'src/graphql/types.ts': {
      schema: '../infra/federation/supergraph-admin.graphql',
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
    'src/graphql/bundle-types.ts': {
      schema: 'schema.graphql',
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
