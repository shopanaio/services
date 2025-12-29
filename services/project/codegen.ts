import type { CodegenConfig } from "@graphql-codegen/cli";

const sharedEnumValues = {
  CurrencyCode: "@shopana/shared-references#CurrencyCode",
  LocaleCode: "@shopana/shared-references#LocaleCode",
  WeightUnit: "@shopana/shared-references#WeightUnit",
  DimensionUnit: "@shopana/shared-references#DimensionUnit",
};

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
        avoidOptionals: {
          field: true,
          inputValue: false,
          object: false,
          defaultValue: false,
        },
        enumValues: sharedEnumValues,
      },
    },
    "src/api/graphql-admin/generated/schemas.ts": {
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
        enumValues: sharedEnumValues,
      },
    },
  },
};

export default config;
