import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  generates: {
    "./src/interfaces/gql-storefront-api/types.ts": {
      schema: "./schema-checkout.graphql",
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        typesPrefix: "Api",
        useIndexSignature: false,
        contextType: "@src/interfaces/gql-storefront-api/context.js#GraphQLContext",
        scalars: {
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
