import { mkdirSync, writeFileSync } from "fs";
import {
  generateBaseFilterTypes,
  generateOrderByInputType,
  generateWhereInputType,
  type GraphQLFieldType,
} from "@shopana/drizzle-query";
import { searchProductBoostRelayQuery } from "../src/repositories/search/SearchProductBoostRepository.js";
import { searchSynonymGroupRelayQuery } from "../src/repositories/search/SearchSynonymRepository.js";

const outputDirectory = "src/api/graphql-admin/schema/__generated__";

const synonymFieldTypes: Record<string, GraphQLFieldType> = {
  id: "ID",
  locale: "String",
  name: "String",
  enabled: "Boolean",
  version: "Int",
  terms: "String",
  valuesCount: "Int",
  createdAt: "DateTime",
  updatedAt: "DateTime",
};

const synonymWhere = generateWhereInputType(
  searchSynonymGroupRelayQuery,
  "SearchSynonymGroup",
  {
    includeDescriptions: true,
    fieldTypes: synonymFieldTypes,
    excludeFields: ["storeId", "valueItems"],
  },
);

const synonymOrderBy = generateOrderByInputType(
  searchSynonymGroupRelayQuery,
  "SearchSynonymGroup",
  {
    includeDescriptions: true,
    fieldTypes: synonymFieldTypes,
    excludeFields: ["storeId", "terms", "valueItems"],
  },
);

const productBoostFieldTypes: Record<string, GraphQLFieldType> = {
  id: "ID",
  locale: "String",
  name: "String",
  enabled: "Boolean",
  version: "Int",
  phrases: "String",
  phrasesCount: "Int",
  productsCount: "Int",
  createdAt: "DateTime",
  updatedAt: "DateTime",
};

const productBoostWhere = generateWhereInputType(
  searchProductBoostRelayQuery,
  "SearchProductBoost",
  {
    includeDescriptions: true,
    fieldTypes: productBoostFieldTypes,
    excludeFields: ["storeId", "phraseItems", "productIds"],
  },
);

const productBoostOrderBy = generateOrderByInputType(
  searchProductBoostRelayQuery,
  "SearchProductBoost",
  {
    includeDescriptions: true,
    fieldTypes: productBoostFieldTypes,
    excludeFields: ["storeId", "phrases", "phraseItems", "productIds"],
  },
);

const baseFilters = `# Auto-generated GraphQL base filter types for Listing service.
# Do not edit manually. Run: yarn shopana codegen --service listing

${generateBaseFilterTypes()}
`;

const filters = `# Auto-generated GraphQL search configuration filters for Listing service.
# Do not edit manually. Run: yarn shopana codegen --service listing

# ---- SearchSynonymGroup ----

${synonymWhere}

${synonymOrderBy}

# ---- SearchProductBoost ----

${productBoostWhere}

${productBoostOrderBy}
`;

mkdirSync(outputDirectory, { recursive: true });
writeFileSync(`${outputDirectory}/base-filters.graphql`, baseFilters);
writeFileSync(`${outputDirectory}/filters.graphql`, filters);

console.log("Generated Listing GraphQL filters");
