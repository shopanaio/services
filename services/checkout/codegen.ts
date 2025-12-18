import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  generates: {
    "./src/interfaces/gql-storefront-api/types.ts": {
      schema: [
        "../../packages/shared-references/graphql/*.graphql",
        "src/interfaces/gql-storefront-api/schema/*.graphql",
      ],
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        typesPrefix: "Api",
        useIndexSignature: false,
        contextType: "./context.js#GraphQLContext",
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
};

export default config;
