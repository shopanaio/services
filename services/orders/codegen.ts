import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  generates: {
    "./src/interfaces/gql-admin-api/types.ts": {
      schema: "./admin-api.graphql",
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        typesPrefix: "Api",
        useIndexSignature: false,
        enumPrefix: "Api",
        contextType: "@src/interfaces/gql-admin-api/context.js#GraphQLContext",
        scalars: {
          Email: "string",
          BigInt: "number",
          JSON: "unknown",
          CurrencyCode: "string",
        },
        enumsAsTypes: false,
        avoidOptionals: true,
      },
    },
    "./src/interfaces/gql-storefront-api/types.ts": {
      schema: "./storefront-api.graphql",
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        typesPrefix: "Api",
        useIndexSignature: false,
        enumPrefix: "Api",
        contextType:
          "@src/interfaces/gql-storefront-api/context.js#GraphQLContext",
        scalars: {
          Email: "string",
          DateTime: "string",
          Decimal: "string",
          BigInt: "number",
          JSON: "unknown",
          CurrencyCode: "string",
        },
        enumsAsTypes: false,
        avoidOptionals: true,
      },
    },
  },
  hooks: {},
};

export default config;
