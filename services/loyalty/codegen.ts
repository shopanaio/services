import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  overwrite: true,
  generates: {
    "src/resolvers/admin/generated/types.ts": {
      schema: [
        "../../packages/shared-references/graphql/*.graphql",
        "src/api/graphql-admin/schema/*.graphql",
      ],
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        useIndexSignature: true,
        federation: true,
        contextType: "../../../context/types.js#ServiceContext",
        scalars: {
          BigInt: "string",
          DateTime: "string",
          JSON: "Record<string, unknown>",
        },
      },
    },
    "src/resolvers/storefront/generated/types.ts": {
      schema: [
        "../../packages/storefront-graphql/graphql/foundation.graphql",
        "../../packages/shared-references/graphql/shared-currency.graphql",
        "../../packages/shared-references/graphql/shared-locale.graphql",
        "../../packages/shared-references/graphql/shared-units.graphql",
        "src/api/graphql-storefront/schema/*.graphql",
      ],
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        useIndexSignature: true,
        federation: true,
        contextType: "../../../context/types.js#ServiceContext",
        scalars: {
          Cursor: "string",
          DateTime: "string",
          Decimal: "string",
          JSON: "Record<string, unknown>",
          UnsignedInt64: "string",
        },
      },
    },
  },
};

export default config;
