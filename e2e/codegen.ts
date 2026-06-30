import type { CodegenConfig } from '@graphql-codegen/cli';

const scalars = {
  ID: { input: 'string', output: 'string' },
  String: { input: 'string', output: 'string' },
  Boolean: { input: 'boolean', output: 'boolean' },
  Int: { input: 'number', output: 'number' },
  Float: { input: 'number', output: 'number' },
  Any: { input: 'unknown', output: 'unknown' },
  Timestamp: { input: 'string', output: 'string' },
  DateTime: { input: 'string', output: 'string' },
  Decimal: { input: 'number', output: 'number' },
  Cursor: { input: 'string', output: 'string' },
  Phone: { input: 'string', output: 'string' },
  Email: { input: 'string', output: 'string' },
  Uint: { input: 'number', output: 'number' },
  Upload: { input: 'File', output: 'File' },
  Uuid: { input: 'string', output: 'string' },
  JSON: { input: 'object', output: 'object' },
};

const config: CodegenConfig = {
  overwrite: true,
  documents: [],
  // ['src/**/*.gql', 'src/**/*.graphql'],
  generates: {
    'codegen/admin-gql.ts': {
      schema: '../infra/federation/supergraph-admin.graphql',
      plugins: ['typescript', 'typescript-operations'],
      config: {
        typesPrefix: 'Api',
        enumPrefix: false,
        enumsAsTypes: true,
        scalars,
      },
    },
    'codegen/client-gql.ts': {
      schema: 'schema-client.graphql',
      plugins: ['typescript', 'typescript-operations'],
      config: {
        typesPrefix: 'Api',
        enumPrefix: false,
        enumsAsTypes: true,
        scalars,
      },
    },
  },
};

export default config;
