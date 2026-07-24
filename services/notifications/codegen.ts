import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  overwrite: true,
  schema: [
    "../../packages/shared-references/graphql/*.graphql",
    "src/api/graphql-admin/schema/*.graphql",
  ],
  generates: {
    "src/api/graphql-admin/generated/types.ts": {
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        useIndexSignature: true,
        federation: true,
        contextType: "../../../context/types.js#ServiceContext",
        scalars: {
          DateTime: "string",
          Email: "string",
          JSON: "Record<string, unknown>",
          BigInt: "string",
        },
      },
    },
    "src/api/graphql-admin/generated/schemas.ts": {
      plugins: ["graphql-codegen-typescript-validation-schema"],
      config: {
        schema: "zod",
        importFrom: "./types.js",
        withObjectType: false,
        scalarSchemas: {
          DateTime: "z.string()",
          Email: "z.string().email()",
          JSON: "z.record(z.unknown())",
          BigInt: "z.string()",
        },
      },
    },
  },
};

export default config;
