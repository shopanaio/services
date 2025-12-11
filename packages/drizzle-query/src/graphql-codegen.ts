/**
 * GraphQL schema file generator.
 *
 * Generates .graphql files with filter and order input types from query builders.
 * Supports separate base types file and individual query files.
 *
 * @example
 * ```ts
 * import { createGraphQLSchema } from "@shopana/drizzle-query";
 *
 * createGraphQLSchema({
 *   // Base types file (optional)
 *   baseTypesOutput: "src/api/graphql/schema/__generated__/base-filters.graphql",
 *
 *   // Query-specific files
 *   queries: {
 *     Warehouse: {
 *       query: warehouseQuery,
 *       output: "src/api/graphql/schema/__generated__/warehouse.graphql",
 *     },
 *     Product: {
 *       query: productQuery,
 *       output: "src/api/graphql/schema/__generated__/product.graphql",
 *     },
 *   },
 * });
 * ```
 */

import { writeFileSync } from "fs";
import type { Table } from "drizzle-orm";
import { FluentQueryBuilder } from "./builder/fluent-query-builder.js";
import { RelayQueryBuilder, CursorQueryBuilder } from "./builder/pagination-query-builder.js";
import type { FluentFieldsDef } from "./builder/fluent-types.js";
import type { FieldsDef } from "./types.js";
import {
  generateGraphQLTypes,
  generateBaseFilterTypes,
  type GraphQLGeneratorOptions,
} from "./graphql.js";

// =============================================================================
// Types
// =============================================================================

type AnyQueryBuilder = FluentQueryBuilder<Table, FluentFieldsDef, FieldsDef, unknown>
  | RelayQueryBuilder<Table, FluentFieldsDef, FieldsDef, unknown>
  | CursorQueryBuilder<Table, FluentFieldsDef, FieldsDef, unknown>;

type QueryBuilderType = "fluent" | "relay" | "cursor";

/**
 * Detect the type of query builder
 */
function getQueryBuilderType(query: AnyQueryBuilder): QueryBuilderType {
  if (query instanceof RelayQueryBuilder) return "relay";
  if (query instanceof CursorQueryBuilder) return "cursor";
  return "fluent";
}

export type QueryDefinition = {
  /** The query builder instance */
  query: AnyQueryBuilder;
  /** Output file path for this query's types (only used when output is not specified at top level) */
  output?: string;
  /** Override options for this specific query */
  options?: Omit<GraphQLGeneratorOptions, "includeBaseTypes">;
};

export type GraphQLSchemaConfig = {
  /**
   * Output file path for base filter types (StringFilter, IntFilter, etc.)
   * If not specified, base types won't be generated as a separate file.
   */
  baseTypesOutput?: string;

  /**
   * Output file path for all query types (when using single file mode).
   * When specified, all queries will be generated into this single file.
   * Individual query `output` fields will be ignored.
   */
  output?: string;

  /**
   * Queries to generate types for.
   * Key is the type name prefix (e.g., "Warehouse" -> WarehouseWhereInput)
   */
  queries: Record<string, QueryDefinition>;

  /**
   * Global options applied to all queries (can be overridden per query)
   */
  options?: Omit<GraphQLGeneratorOptions, "includeBaseTypes">;

  /**
   * Header comment for generated files
   * @default "Auto-generated GraphQL types. Do not edit manually."
   */
  header?: string;

  /**
   * Include DateTime scalar definition in base types
   * @default true
   */
  includeDateTimeScalar?: boolean;
};

// =============================================================================
// Generator
// =============================================================================

/**
 * Generate and write GraphQL schema files
 *
 * @param config - Schema generation configuration
 *
 * @example
 * ```ts
 * // scripts/generate-filters.ts
 * import { createGraphQLSchema, createQuery } from "@shopana/drizzle-query";
 * import { warehouses, products } from "../src/models/index.js";
 *
 * const warehouseQuery = createQuery(warehouses);
 * const productQuery = createQuery(products);
 *
 * createGraphQLSchema({
 *   baseTypesOutput: "src/api/graphql/schema/__generated__/base-filters.graphql",
 *   queries: {
 *     Warehouse: {
 *       query: warehouseQuery,
 *       output: "src/api/graphql/schema/__generated__/warehouse.graphql",
 *       options: { excludeFields: ["projectId"] },
 *     },
 *     Product: {
 *       query: productQuery,
 *       output: "src/api/graphql/schema/__generated__/product.graphql",
 *       options: { excludeFields: ["projectId", "deletedAt"] },
 *     },
 *   },
 * });
 *
 * // Run: npx tsx scripts/generate-filters.ts
 * ```
 */
export function createGraphQLSchema(config: GraphQLSchemaConfig): void {
  const {
    baseTypesOutput,
    output: singleOutput,
    queries,
    options: globalOptions = {},
    header = "Auto-generated GraphQL types. Do not edit manually.",
    includeDateTimeScalar = true,
  } = config;

  const generatedFiles: string[] = [];

  // Generate base types file if output is specified
  if (baseTypesOutput) {
    const parts: string[] = [];

    parts.push(`# ${header}`);
    parts.push(`# Generated at: ${new Date().toISOString()}`);
    parts.push("");

    if (includeDateTimeScalar) {
      parts.push("scalar DateTime");
      parts.push("");
    }

    parts.push(generateBaseFilterTypes());

    const content = parts.join("\n").trim() + "\n";
    writeFileSync(baseTypesOutput, content, "utf-8");
    generatedFiles.push(baseTypesOutput);
  }

  // Single file mode: all queries go into one file
  if (singleOutput) {
    const parts: string[] = [];

    parts.push(`# ${header}`);
    parts.push(`# Generated at: ${new Date().toISOString()}`);
    parts.push("");

    for (const [name, definition] of Object.entries(queries)) {
      const { query, options: queryOptions } = definition;
      const builderType = getQueryBuilderType(query);

      const mergedOptions: GraphQLGeneratorOptions = {
        ...globalOptions,
        ...queryOptions,
        includeBaseTypes: false,
      };

      const types = generateGraphQLTypes(query, name, mergedOptions);

      parts.push(`# ---- ${name} ----`);
      parts.push("");
      parts.push(types.whereInput);
      parts.push("");
      parts.push(types.orderByInput);
      parts.push("");

      // Auto-detect input type based on query builder type
      if (builderType === "relay" || builderType === "cursor") {
        parts.push(types.relayInput);
        parts.push("");
      } else {
        parts.push(types.queryInput);
        parts.push("");
      }
    }

    const content = parts.join("\n").trim() + "\n";
    writeFileSync(singleOutput, content, "utf-8");
    generatedFiles.push(singleOutput);
  } else {
    // Multi-file mode: each query gets its own file
    for (const [name, definition] of Object.entries(queries)) {
      const { query, output, options: queryOptions } = definition;
      const builderType = getQueryBuilderType(query);

      if (!output) {
        console.warn(`⚠ Skipping ${name}: no output path specified (use 'output' at top level for single file mode)`);
        continue;
      }

      // Merge options: global < query-specific
      const mergedOptions: GraphQLGeneratorOptions = {
        ...globalOptions,
        ...queryOptions,
        includeBaseTypes: false,
      };

      const types = generateGraphQLTypes(query, name, mergedOptions);

      const parts: string[] = [];

      parts.push(`# ${header}`);
      parts.push(`# Generated at: ${new Date().toISOString()}`);
      parts.push(`# Entity: ${name}`);
      parts.push("");

      // WhereInput
      parts.push(types.whereInput);
      parts.push("");

      // OrderByInput (enum + input)
      parts.push(types.orderByInput);
      parts.push("");

      // Auto-detect input type based on query builder type
      if (builderType === "relay" || builderType === "cursor") {
        parts.push(types.relayInput);
        parts.push("");
      } else {
        parts.push(types.queryInput);
        parts.push("");
      }

      const content = parts.join("\n").trim() + "\n";
      writeFileSync(output, content, "utf-8");
      generatedFiles.push(output);
    }
  }

  // Log results
  console.log(`✓ Generated ${generatedFiles.length} file(s):`);
  for (const file of generatedFiles) {
    console.log(`  - ${file}`);
  }
}

/**
 * Generate base filter types as string
 *
 * @param options - Generation options
 * @returns Generated GraphQL base types string
 */
export function generateBaseTypesSchema(options: {
  header?: string;
  includeDateTimeScalar?: boolean;
} = {}): string {
  const {
    header = "Auto-generated GraphQL base filter types. Do not edit manually.",
    includeDateTimeScalar = true,
  } = options;

  const parts: string[] = [];

  parts.push(`# ${header}`);
  parts.push(`# Generated at: ${new Date().toISOString()}`);
  parts.push("");

  if (includeDateTimeScalar) {
    parts.push("scalar DateTime");
    parts.push("");
  }

  parts.push(generateBaseFilterTypes());

  return parts.join("\n").trim() + "\n";
}

/**
 * Generate query types as string (without base types)
 *
 * @param query - Query builder
 * @param name - Type name prefix
 * @param options - Generation options
 * @returns Generated GraphQL types string
 */
export function generateQuerySchema(
  query: AnyQueryBuilder,
  name: string,
  options: {
    header?: string;
    includeRelayInputs?: boolean;
    includeQueryInputs?: boolean;
    generatorOptions?: Omit<GraphQLGeneratorOptions, "includeBaseTypes">;
  } = {}
): string {
  const {
    header = "Auto-generated GraphQL types. Do not edit manually.",
    includeRelayInputs = true,
    includeQueryInputs = true,
    generatorOptions = {},
  } = options;

  const types = generateGraphQLTypes(query, name, {
    ...generatorOptions,
    includeBaseTypes: false,
  });

  const parts: string[] = [];

  parts.push(`# ${header}`);
  parts.push(`# Generated at: ${new Date().toISOString()}`);
  parts.push(`# Entity: ${name}`);
  parts.push("");

  parts.push(types.whereInput);
  parts.push("");

  parts.push(types.orderByInput);
  parts.push("");

  if (includeQueryInputs) {
    parts.push(types.queryInput);
    parts.push("");
  }

  if (includeRelayInputs) {
    parts.push(types.relayInput);
    parts.push("");
  }

  return parts.join("\n").trim() + "\n";
}

/**
 * @deprecated Use createGraphQLSchema with separate outputs instead
 */
export function generateGraphQLSchema(config: {
  queries: Record<string, AnyQueryBuilder | { query: AnyQueryBuilder; options?: Omit<GraphQLGeneratorOptions, "includeBaseTypes"> }>;
  options?: Omit<GraphQLGeneratorOptions, "includeBaseTypes">;
  header?: string;
  includeDateTimeScalar?: boolean;
  includeRelayInputs?: boolean;
  includeQueryInputs?: boolean;
}): string {
  const {
    queries,
    options: globalOptions = {},
    header = "Auto-generated GraphQL filter types. Do not edit manually.",
    includeDateTimeScalar = true,
    includeRelayInputs = true,
    includeQueryInputs = true,
  } = config;

  const parts: string[] = [];

  parts.push(`# ${header}`);
  parts.push(`# Generated at: ${new Date().toISOString()}`);
  parts.push("");

  if (includeDateTimeScalar) {
    parts.push("scalar DateTime");
    parts.push("");
  }

  parts.push(generateBaseFilterTypes());
  parts.push("");

  for (const [name, value] of Object.entries(queries)) {
    const query = typeof value === "object" && "query" in value ? value.query : value;
    const queryOptions = typeof value === "object" && "query" in value ? value.options : undefined;

    const mergedOptions: GraphQLGeneratorOptions = {
      ...globalOptions,
      ...queryOptions,
      includeBaseTypes: false,
    };

    const types = generateGraphQLTypes(query, name, mergedOptions);

    parts.push(`# ---- ${name} ----`);
    parts.push("");
    parts.push(types.whereInput);
    parts.push("");
    parts.push(types.orderByInput);
    parts.push("");

    if (includeQueryInputs) {
      parts.push(types.queryInput);
      parts.push("");
    }

    if (includeRelayInputs) {
      parts.push(types.relayInput);
      parts.push("");
    }
  }

  return parts.join("\n").trim() + "\n";
}
