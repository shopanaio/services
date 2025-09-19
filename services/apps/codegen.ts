import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: ['src/api/schema/*.graphql'],
  generates: {
    'src/generated/types.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        useIndexSignature: true,
        federation: true,
        contextType: '@src/kernel/types#GraphQLContext'
      }
    }
  }
};

export default config;
