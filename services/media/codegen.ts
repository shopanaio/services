import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: ['src/api/graphql-admin/*.graphql'],
  generates: {
    'src/api/graphql-admin/generated/types.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        useIndexSignature: true,
        federation: true,
        contextType: '../server.js#GraphQLContext'
      }
    }
  }
};

export default config;
