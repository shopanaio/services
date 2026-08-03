import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  overwrite: true,
  generates: {
    "src/resolvers/admin/generated/types.ts": {
      schema: [
        "../../packages/shared-references/graphql/*.graphql",
        "src/api/graphql-admin/schema/*.graphql",
        "src/api/graphql-admin/schema/__generated__/*.graphql",
      ],
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
          Email: "string",
          JSON: "Record<string, unknown>",
          BigInt: "string",
        },
      },
    },
    "src/resolvers/admin/generated/schemas.ts": {
      schema: [
        "../../packages/shared-references/graphql/*.graphql",
        "src/api/graphql-admin/schema/*.graphql",
        "src/api/graphql-admin/schema/__generated__/*.graphql",
      ],
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
          Email: "z.string().email()",
          JSON: "z.record(z.unknown())",
          BigInt: "z.string()",
        },
      },
    },
    "src/resolvers/storefront/generated/types.ts": {
      schema: [
        "../../packages/storefront-graphql/graphql/foundation.graphql",
        "../../packages/shared-references/graphql/shared-currency.graphql",
        "../../packages/shared-references/graphql/shared-locale.graphql",
        "../../packages/shared-references/graphql/shared-units.graphql",
        "src/api/graphql-storefront/schema/**/*.graphql",
      ],
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
          Color: "string",
          Cursor: "string",
          DateTime: "string",
          Decimal: "string",
          Email: "string",
          HTML: "string",
          ISO8601DateTime: "string",
          JSON: "Record<string, unknown>",
          UnsignedInt64: "string",
          URL: "string",
        },
      },
    },
    "src/resolvers/storefront/generated/schemas.ts": {
      schema: [
        "../../packages/storefront-graphql/graphql/foundation.graphql",
        "../../packages/shared-references/graphql/shared-currency.graphql",
        "../../packages/shared-references/graphql/shared-locale.graphql",
        "../../packages/shared-references/graphql/shared-units.graphql",
        "src/api/graphql-storefront/schema/**/*.graphql",
      ],
      plugins: ["graphql-codegen-typescript-validation-schema"],
      config: {
        schema: "zod",
        importFrom: "./types.js",
        withObjectType: false,
        scalarSchemas: {
          Color: "z.string()",
          Cursor: "z.string()",
          DateTime: "z.string()",
          Decimal: "z.string()",
          Email: "z.string().email()",
          HTML: "z.string()",
          ISO8601DateTime: "z.string()",
          JSON: "z.record(z.unknown())",
          UnsignedInt64: "z.string()",
          URL: "z.string().url()",
        },
      },
    },
  },
};

export default config;
