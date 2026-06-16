/**
 * Generate GraphQL filter types for media service.
 *
 * Run: npx tsx scripts/generate-filters.ts
 */

import { createGraphQLSchema } from "@shopana/drizzle-query";
import { fileRelayQuery } from "../src/repositories/FileRepository.js";

const OUTPUT_DIR = "src/api/graphql-admin/__generated__";

// Generate .graphql files
createGraphQLSchema({
  // Base types (StringFilter, IntFilter, etc.) - separate file
  baseTypesOutput: `${OUTPUT_DIR}/base-filters.graphql`,

  // All query types in a single file
  output: `${OUTPUT_DIR}/filters.graphql`,

  // Query definitions
  queries: {
    File: {
      query: fileRelayQuery,
      options: {
        excludeFields: ["projectId", "deletedAt"],
      },
    },
  },

  options: {
    includeDescriptions: true,
  },
  includeDateTimeScalar: false,
});
