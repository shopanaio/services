import { writeFileSync } from "node:fs";
import {
  generateBaseFilterTypes,
  generateOrderByInputType,
  generateWhereInputType,
  type GraphQLFieldType,
} from "@shopana/drizzle-query";
import { navigationMenuRelayQuery } from "../src/content/repositories/NavigationMenuRepository.js";
import { pageRelayQuery } from "../src/content/repositories/PageRepository.js";

const pageFieldTypes: Record<string, GraphQLFieldType> = {
  id: "ID",
  handle: "String",
  templateSuffix: "String",
  publishedAt: "DateTime",
  isPublished: "Boolean",
  createdAt: "DateTime",
  updatedAt: "DateTime",
  title: "String",
};

const navigationMenuFieldTypes: Record<string, GraphQLFieldType> = {
  id: "ID",
  handle: "String",
  name: "String",
  createdAt: "DateTime",
  updatedAt: "DateTime",
};

const pageOptions = {
  includeDescriptions: true,
  fieldTypes: pageFieldTypes,
  excludeFields: [
    "installationId",
    "storeId",
    "deletedAt",
    "revision",
    "locale",
  ],
};
const navigationMenuOptions = {
  includeDescriptions: true,
  fieldTypes: navigationMenuFieldTypes,
  excludeFields: ["installationId", "storeId", "deletedAt", "revision"],
};

const content = `# Auto-generated GraphQL filter types for Online Store App.
# Do not edit manually. Run: yarn generate:filters

${generateBaseFilterTypes()}

# ---- OnlineStorePage ----

${generateWhereInputType(pageRelayQuery, "OnlineStorePage", pageOptions)}

${generateOrderByInputType(pageRelayQuery, "OnlineStorePage", pageOptions)}

# ---- OnlineStoreNavigationMenu ----

${generateWhereInputType(
  navigationMenuRelayQuery,
  "OnlineStoreNavigationMenu",
  navigationMenuOptions,
)}

${generateOrderByInputType(
  navigationMenuRelayQuery,
  "OnlineStoreNavigationMenu",
  navigationMenuOptions,
)}
`;

writeFileSync(
  "src/api/graphql-admin/schema/__generated__/filters.graphql",
  content,
);
