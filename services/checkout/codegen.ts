import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  generates: {
    "./src/interfaces/gql-storefront-api/types.ts": {
      schema: [
        "../../packages/storefront-graphql/graphql/*.graphql",
        "../../packages/shared-references/graphql/*.graphql",
        "src/interfaces/gql-storefront-api/schema/*.graphql",
      ],
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        typesPrefix: "Api",
        useIndexSignature: false,
        contextType: "./context.js#GraphQLContext",
        scalars: {
          BigInt: "string",
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
