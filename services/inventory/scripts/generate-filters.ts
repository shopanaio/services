/**
 * Generate GraphQL filter types for inventory service.
 *
 * Run: npx tsx scripts/generate-filters.ts
 */

import { createGraphQLSchema, createQuery } from "@shopana/drizzle-query";
import { warehouses } from "../src/repositories/models/stock.js";

const OUTPUT_DIR = "src/api/graphql-admin/schema/__generated__";

// Query builders
const warehouseQuery = createQuery(warehouses);

// Generate .graphql files
createGraphQLSchema({
  // Base types (StringFilter, IntFilter, etc.)
  baseTypesOutput: `${OUTPUT_DIR}/base-filters.graphql`,

  // Query-specific types
  queries: {
    Warehouse: {
      query: warehouseQuery,
      output: `${OUTPUT_DIR}/warehouse-filters.graphql`,
      options: {
        excludeFields: ["projectId"],
      },
    },
  },

  options: {
    includeDescriptions: true,
  },
  includeDateTimeScalar: false, // DateTime is defined in base.graphql
  includeRelayInputs: true,
  includeQueryInputs: false,
  includeSortOrderEnums: false,
});
