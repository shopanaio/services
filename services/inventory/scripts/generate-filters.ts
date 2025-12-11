/**
 * Generate GraphQL filter types for inventory service.
 *
 * Run: npx tsx scripts/generate-filters.ts
 */

import { createGraphQLSchema } from "@shopana/drizzle-query";
import { stockRelayQuery } from "../src/repositories/stock/StockRepository.js";
import { warehouseRelayQuery } from "../src/repositories/warehouse/WarehouseRepository.js";

const OUTPUT_DIR = "src/api/graphql-admin/schema/__generated__";

// Generate .graphql files
createGraphQLSchema({
  // Base types (StringFilter, IntFilter, etc.) - separate file
  baseTypesOutput: `${OUTPUT_DIR}/base-filters.graphql`,

  // All query types in a single file
  output: `${OUTPUT_DIR}/filters.graphql`,

  // Query definitions
  queries: {
    Warehouse: {
      query: warehouseRelayQuery,
      options: {
        excludeFields: ["projectId"],
      },
    },
    WarehouseStock: {
      query: stockRelayQuery,
      options: {
        excludeFields: ["projectId"],
      },
    },
  },

  options: {
    includeDescriptions: true,
  },
  includeDateTimeScalar: false,
});
