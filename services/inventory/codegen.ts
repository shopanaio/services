import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  overwrite: true,
  schema: [
    "src/api/graphql-admin/schema/*.graphql",
    "src/api/graphql-admin/schema/__generated__/*.graphql",
  ],
  generates: {
    "src/api/graphql-admin/generated/types.ts": {
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        useIndexSignature: true,
        federation: true,
        contextType: "../../../context/types.js#ServiceContext",
        avoidOptionals: {
          field: true,
          inputValue: false,
          object: false,
          defaultValue: false,
        },
      },
    },
  },
};

export default config;
