import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  generates: {
    "./src/interfaces/gql-admin-api/types.ts": {
      schema: ["src/interfaces/gql-admin-api/schema/*.graphql"],
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        typesPrefix: "Api",
        useIndexSignature: false,
        enumPrefix: "Api",
        contextType: "./context.js#GraphQLContext",
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
      schema: ["src/interfaces/gql-storefront-api/schema/*.graphql"],
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        typesPrefix: "Api",
        useIndexSignature: false,
        enumPrefix: "Api",
        contextType: "./context.js#GraphQLContext",
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
};

export default config;
