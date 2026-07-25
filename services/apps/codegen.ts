import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  overwrite: true,
  schema: [
    "../../packages/shared-references/graphql/*.graphql",
    "src/api/graphql-admin/schema/*.graphql",
    "src/api/graphql-admin/schema/__generated__/*.graphql",
  ],
  generates: {
    "src/resolvers/admin/generated/types.ts": {
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
        scalars: {
          DateTime: "string",
          JSON: "Record<string, unknown>",
        },
      },
    },
    "src/resolvers/admin/generated/schemas.ts": {
      plugins: ["graphql-codegen-typescript-validation-schema"],
      config: {
        schema: "zod",
        importFrom: "./types.js",
        withObjectType: false,
        directives: {
          constraint: {
            minLength: "min",
            maxLength: "max",
            pattern: "regex",
          },
        },
        scalarSchemas: {
          DateTime: "z.string()",
          JSON: "z.record(z.unknown())",
        },
      },
    },
  },
};

export default config;
