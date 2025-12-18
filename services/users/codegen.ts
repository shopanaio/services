import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "./dist/schema/*.graphql",
  generates: {
    "./src/api/graphql-admin/generated/types.ts": {
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        useIndexSignature: true,
        contextType: "../../../context/index.js#ServiceContext",
        federation: true,
        mappers: {
          User: "@shopana/casdoor-node-sdk#User as CasdoorUser",
        },
        scalars: {
          DateTime: "string",
          Email: "string",
          JSON: "Record<string, unknown>",
        },
      },
    },
  },
};

export default config;
