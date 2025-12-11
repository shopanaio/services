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
import type { FluentQueryBuilder } from "./builder/fluent-query-builder.js";
import type { RelayQueryBuilder, CursorQueryBuilder } from "./builder/pagination-query-builder.js";
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

export type QueryDefinition = {
  /** The query builder instance */
  query: AnyQueryBuilder;
  /** Output file path for this query's types */
  output: string;
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

  /**
   * Generate relay connection inputs
   * @default true
   */
  includeRelayInputs?: boolean;

  /**
   * Generate query inputs (with limit/offset)
   * @default true
   */
  includeQueryInputs?: boolean;

  /**
   * Generate simple sort order enums (FIELD_ASC, FIELD_DESC)
   * @default false
   */
  includeSortOrderEnums?: boolean;
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
    queries,
    options: globalOptions = {},
    header = "Auto-generated GraphQL types. Do not edit manually.",
    includeDateTimeScalar = true,
    includeRelayInputs = true,
    includeQueryInputs = true,
    includeSortOrderEnums = false,
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

  // Generate types for each query
  for (const [name, definition] of Object.entries(queries)) {
    const { query, output, options: queryOptions } = definition;

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


    // Optional: QueryInput
    if (includeQueryInputs) {
      parts.push(types.queryInput);
      parts.push("");
    }

    // Optional: RelayInput
    if (includeRelayInputs) {
      parts.push(types.relayInput);
      parts.push("");
    }

    const content = parts.join("\n").trim() + "\n";
    writeFileSync(output, content, "utf-8");
    generatedFiles.push(output);
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
    includeSortOrderEnums?: boolean;
    generatorOptions?: Omit<GraphQLGeneratorOptions, "includeBaseTypes">;
  } = {}
): string {
  const {
    header = "Auto-generated GraphQL types. Do not edit manually.",
    includeRelayInputs = true,
    includeQueryInputs = true,
    includeSortOrderEnums = false,
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
  includeSortOrderEnums?: boolean;
}): string {
  const {
    queries,
    options: globalOptions = {},
    header = "Auto-generated GraphQL filter types. Do not edit manually.",
    includeDateTimeScalar = true,
    includeRelayInputs = true,
    includeQueryInputs = true,
    includeSortOrderEnums = false,
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
