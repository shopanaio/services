import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  generates: {
    "./src/interfaces/graphql/types.ts": {
      schema: "./src/interfaces/gql-admin-api/schema/**/*.graphql",
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        typesPrefix: "Api",
        useIndexSignature: false,
        contextType: "@src/interfaces/gql-admin-api/context.js#GraphQLContext",
        scalars: {
          BigInt: "number",
          JSON: "unknown",
          CurrencyCode: "string",
        },
        enumsAsTypes: true,
        avoidOptionals: true,
      },
    },
  },
  hooks: {},
};

export default config;
