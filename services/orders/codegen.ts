import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  generates: {
    "./src/interfaces/gql-admin-api/types.ts": {
      schema: [
        "../../packages/admin-graphql/graphql/foundation.graphql",
        "../../packages/shared-references/graphql/shared-currency.graphql",
        "../../packages/shared-references/graphql/shared-locale.graphql",
        "../../packages/shared-references/graphql/shared-units.graphql",
        "src/interfaces/gql-admin-api/schema/*.graphql",
      ],
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        typesPrefix: "Api",
        useIndexSignature: false,
        enumPrefix: "Api",
        contextType: "./context.js#GraphQLContext",
        scalars: {
          Email: "string",
          DateTime: "string",
          Decimal: "string",
          BigInt: "string",
          URL: "string",
          JSON: "unknown",
          CurrencyCode: "string",
          LocaleCode: "string",
        },
        enumsAsTypes: false,
        avoidOptionals: {
          field: true,
          inputValue: false,
          object: false,
          defaultValue: false,
        },
      },
    },
    "./src/interfaces/gql-admin-api/schemas.ts": {
      schema: [
        "../../packages/admin-graphql/graphql/foundation.graphql",
        "../../packages/shared-references/graphql/shared-currency.graphql",
        "../../packages/shared-references/graphql/shared-locale.graphql",
        "../../packages/shared-references/graphql/shared-units.graphql",
        "src/interfaces/gql-admin-api/schema/*.graphql",
      ],
      plugins: ["graphql-codegen-typescript-validation-schema"],
      config: {
        schema: "zod",
        importFrom: "./types.js",
        typesPrefix: "Api",
        withObjectType: false,
        scalarSchemas: {
          BigInt: "z.string()",
          CurrencyCode: "z.string().length(3)",
          DateTime: "z.string().datetime({ offset: true })",
          Decimal: "z.string()",
          Email: "z.string().email()",
          JSON: "z.unknown()",
          LocaleCode: "z.string()",
          URL: "z.string().url()",
        },
      },
    },
    "./src/interfaces/gql-storefront-api/types.ts": {
      schema: [
        "../../packages/storefront-graphql/graphql/foundation.graphql",
        "../../packages/shared-references/graphql/*.graphql",
        "src/interfaces/gql-storefront-api/schema/*.graphql",
      ],
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        typesPrefix: "Api",
        useIndexSignature: false,
        enumPrefix: "Api",
        contextType: "./context.js#GraphQLContext",
        scalars: {
          Email: "string",
          DateTime: "string",
          Decimal: "string",
          BigInt: "number",
          Cursor: "string",
          URL: "string",
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
