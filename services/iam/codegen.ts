import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "./dist/schema/*.graphql",
  generates: {
    "./src/resolvers/admin/generated/types.ts": {
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        useIndexSignature: true,
        contextType: "../../../context/index.js#ServiceContext",
        federation: true,
        scalars: {
          DateTime: "string",
          Email: "string",
          JSON: "Record<string, unknown>",
        },
      },
    },
    "./src/resolvers/admin/generated/schemas.ts": {
      plugins: ["typescript-validation-schema"],
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
          Email: "z.string().email()",
          JSON: "z.record(z.unknown())",
        },
      },
    },
  },
};

export default config;
