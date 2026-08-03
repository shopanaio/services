import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  generates: {
    'src/api/graphql-admin/generated/types.ts': {
      schema: [
        'src/api/graphql-admin/*.graphql',
        'src/api/graphql-admin/__generated__/*.graphql',
      ],
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        useIndexSignature: true,
        federation: true,
        contextType: '../server.js#GraphQLContext'
      }
    },
    'src/resolvers/storefront/generated/types.ts': {
      schema: [
        '../../packages/storefront-graphql/graphql/foundation.graphql',
        '../../packages/shared-references/graphql/shared-currency.graphql',
        '../../packages/shared-references/graphql/shared-locale.graphql',
        '../../packages/shared-references/graphql/shared-units.graphql',
        'src/api/graphql-storefront/schema/**/*.graphql',
      ],
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        useIndexSignature: true,
        federation: true,
        contextType: '../../../context/types.js#ServiceContext',
        avoidOptionals: {
          field: true,
          inputValue: false,
          object: false,
          defaultValue: false,
        },
        scalars: {
          Color: 'string',
          Cursor: 'string',
          DateTime: 'string',
          Decimal: 'string',
          Email: 'string',
          HTML: 'string',
          ISO8601DateTime: 'string',
          JSON: 'Record<string, unknown>',
          UnsignedInt64: 'string',
          URL: 'string',
        },
      },
    }
  }
};

export default config;
