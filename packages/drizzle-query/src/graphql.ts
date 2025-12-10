/**
 * GraphQL type definition generator for query builders.
 *
 * Generates GraphQL input types for filtering and ordering from FluentQueryBuilder.
 *
 * @example
 * ```ts
 * const warehouseQuery = createQuery(warehouses);
 *
 * // Generate GraphQL type definitions
 * const typeDefs = generateGraphQLTypes(warehouseQuery, "Warehouse");
 *
 * // Output:
 * // input WarehouseWhereInput { ... }
 * // input WarehouseOrderInput { ... }
 * // enum WarehouseOrderField { ... }
 * ```
 */

import type { Table } from "drizzle-orm";
import type { FluentQueryBuilder } from "./builder/fluent-query-builder.js";
import type { RelayQueryBuilder, CursorQueryBuilder } from "./builder/pagination-query-builder.js";
import type { FluentFieldsDef } from "./builder/fluent-types.js";
import type { FieldsDef } from "./types.js";

/**
 * Drizzle ORM symbol for accessing columns
 */
const DrizzleColumns = Symbol.for("drizzle:Columns");

/**
 * Column info from Drizzle table
 */
type DrizzleColumnInfo = {
  name: string;
  dataType: string;
  columnType: string;
};

// =============================================================================
// Types
// =============================================================================

export type GraphQLFieldType =
  | "ID"
  | "String"
  | "Int"
  | "Float"
  | "Boolean"
  | "DateTime"
  | "JSON";

export type GraphQLGeneratorOptions = {
  /**
   * Include base filter types (StringFilter, IntFilter, etc.)
   * Set to false if you already have them defined elsewhere.
   * @default true
   */
  includeBaseTypes?: boolean;

  /**
   * Field type overrides (e.g., { id: "ID", createdAt: "DateTime" })
   */
  fieldTypes?: Record<string, GraphQLFieldType>;

  /**
   * Fields to exclude from generated types
   */
  excludeFields?: string[];

  /**
   * Custom scalar name for JSON type
   * @default "JSON"
   */
  jsonScalar?: string;

  /**
   * Custom scalar name for DateTime type
   * @default "DateTime"
   */
  dateTimeScalar?: string;

  /**
   * Add descriptions to generated types
   * @default true
   */
  includeDescriptions?: boolean;
};

// =============================================================================
// Base GraphQL filter types
// =============================================================================

const BASE_FILTER_TYPES = `
"""Filter operators for String fields"""
input StringFilter {
  """Equals"""
  _eq: String
  """Not equals"""
  _neq: String
  """In array"""
  _in: [String!]
  """Not in array"""
  _notIn: [String!]
  """Is null"""
  _is: Boolean
  """Is not null"""
  _isNot: Boolean
  """Contains substring (case-sensitive)"""
  _contains: String
  """Contains substring (case-insensitive)"""
  _containsi: String
  """Does not contain substring (case-sensitive)"""
  _notContains: String
  """Does not contain substring (case-insensitive)"""
  _notContainsi: String
  """Starts with (case-sensitive)"""
  _startsWith: String
  """Starts with (case-insensitive)"""
  _startsWithi: String
  """Ends with (case-sensitive)"""
  _endsWith: String
  """Ends with (case-insensitive)"""
  _endsWithi: String
}

"""Filter operators for ID fields"""
input IDFilter {
  """Equals"""
  _eq: ID
  """Not equals"""
  _neq: ID
  """In array"""
  _in: [ID!]
  """Not in array"""
  _notIn: [ID!]
  """Is null"""
  _is: Boolean
  """Is not null"""
  _isNot: Boolean
}

"""Filter operators for Int fields"""
input IntFilter {
  """Equals"""
  _eq: Int
  """Not equals"""
  _neq: Int
  """Greater than"""
  _gt: Int
  """Greater than or equal"""
  _gte: Int
  """Less than"""
  _lt: Int
  """Less than or equal"""
  _lte: Int
  """In array"""
  _in: [Int!]
  """Not in array"""
  _notIn: [Int!]
  """Is null"""
  _is: Boolean
  """Is not null"""
  _isNot: Boolean
  """Between range (inclusive)"""
  _between: [Int!]
}

"""Filter operators for Float fields"""
input FloatFilter {
  """Equals"""
  _eq: Float
  """Not equals"""
  _neq: Float
  """Greater than"""
  _gt: Float
  """Greater than or equal"""
  _gte: Float
  """Less than"""
  _lt: Float
  """Less than or equal"""
  _lte: Float
  """In array"""
  _in: [Float!]
  """Not in array"""
  _notIn: [Float!]
  """Is null"""
  _is: Boolean
  """Is not null"""
  _isNot: Boolean
  """Between range (inclusive)"""
  _between: [Float!]
}

"""Filter operators for Boolean fields"""
input BooleanFilter {
  """Equals"""
  _eq: Boolean
  """Not equals"""
  _neq: Boolean
  """Is null"""
  _is: Boolean
  """Is not null"""
  _isNot: Boolean
}

"""Filter operators for DateTime fields"""
input DateTimeFilter {
  """Equals"""
  _eq: DateTime
  """Not equals"""
  _neq: DateTime
  """Greater than (after)"""
  _gt: DateTime
  """Greater than or equal (on or after)"""
  _gte: DateTime
  """Less than (before)"""
  _lt: DateTime
  """Less than or equal (on or before)"""
  _lte: DateTime
  """In array"""
  _in: [DateTime!]
  """Not in array"""
  _notIn: [DateTime!]
  """Is null"""
  _is: Boolean
  """Is not null"""
  _isNot: Boolean
  """Between range (inclusive)"""
  _between: [DateTime!]
}

"""Sort direction"""
enum SortDirection {
  ASC
  DESC
}
`;

// =============================================================================
// Type inference from Drizzle column types
// =============================================================================

/**
 * Map Drizzle columnType to GraphQL type
 */
const COLUMN_TYPE_MAP: Record<string, GraphQLFieldType> = {
  // UUID -> ID
  PgUUID: "ID",

  // Text types -> String
  PgText: "String",
  PgVarchar: "String",
  PgChar: "String",
  PgCitext: "String",

  // Integer types -> Int
  PgInteger: "Int",
  PgSmallInt: "Int",
  PgBigInt53: "Int",
  PgBigInt64: "String", // BigInt64 can overflow JS number
  PgSerial: "Int",
  PgSmallSerial: "Int",
  PgBigSerial53: "Int",
  PgBigSerial64: "String",

  // Float types -> Float
  PgReal: "Float",
  PgDoublePrecision: "Float",
  PgNumeric: "Float", // numeric is string in drizzle but Float in GraphQL makes sense

  // Boolean -> Boolean
  PgBoolean: "Boolean",

  // Date/Time types -> DateTime
  PgTimestamp: "DateTime",
  PgTimestampString: "DateTime",
  PgDate: "DateTime",
  PgDateString: "DateTime",
  PgTime: "String", // Time without date is just string
  PgInterval: "String",

  // JSON types -> JSON
  PgJson: "JSON",
  PgJsonb: "JSON",

  // Array types -> String (simplified)
  PgArray: "String",

  // Enum -> String (could be improved)
  PgEnumColumn: "String",
};

/**
 * Extract columns info from Drizzle table
 */
function extractColumnsFromTable(table: Table): Record<string, DrizzleColumnInfo> {
  const tableAny = table as unknown as Record<symbol, Record<string, DrizzleColumnInfo> | undefined>;
  return tableAny[DrizzleColumns] ?? {};
}

/**
 * Get GraphQL type from Drizzle column type
 */
function getGraphQLTypeFromColumn(columnType: string): GraphQLFieldType {
  return COLUMN_TYPE_MAP[columnType] ?? "String";
}

/**
 * Field info with name and type
 */
export type FieldInfo = {
  name: string;
  graphqlType: GraphQLFieldType;
  columnType: string;
};

/**
 * Convert camelCase to SCREAMING_SNAKE_CASE
 * e.g., "createdAt" -> "CREATED_AT", "isDefault" -> "IS_DEFAULT"
 */
function toScreamingSnakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .toUpperCase();
}

function getFilterType(fieldType: GraphQLFieldType): string {
  switch (fieldType) {
    case "ID":
      return "IDFilter";
    case "String":
      return "StringFilter";
    case "Int":
      return "IntFilter";
    case "Float":
      return "FloatFilter";
    case "Boolean":
      return "BooleanFilter";
    case "DateTime":
      return "DateTimeFilter";
    case "JSON":
      return "StringFilter"; // JSON fields use string filter for simple cases
    default:
      return "StringFilter";
  }
}

// =============================================================================
// Generator functions
// =============================================================================

/**
 * Resolve FluentQueryBuilder from any query type
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveFluentQuery(query: any): any {
  // Check if this is RelayQueryBuilder or CursorQueryBuilder
  // They have getQueryBuilder that returns FluentQueryBuilder
  if (typeof query.getQueryBuilder === "function") {
    const inner = query.getQueryBuilder();
    // If the inner has getTable, it's a FluentQueryBuilder
    if (typeof inner.getTable === "function") {
      return inner;
    }
  }
  return query;
}

/**
 * Extract field info (name + type) from a query builder
 */
function extractFieldsWithTypes<Q>(query: Q): FieldInfo[] {
  if (typeof query !== "object" || query === null) {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const queryAny = query as any;

  // Get field names from snapshot
  let fieldNames: string[] = [];
  if (typeof queryAny.getSnapshot === "function") {
    const snapshot = queryAny.getSnapshot();
    fieldNames = snapshot.fields ?? [];
  }

  // Get table to extract column types
  let table: Table | null = null;
  if (typeof queryAny.getTable === "function") {
    table = queryAny.getTable();
  }

  if (!table) {
    // Fallback: return fields without type info
    return fieldNames.map((name) => ({
      name,
      graphqlType: "String" as GraphQLFieldType,
      columnType: "unknown",
    }));
  }

  // Extract column types from table
  const columns = extractColumnsFromTable(table);

  return fieldNames.map((name) => {
    const column = columns[name];
    if (column) {
      return {
        name,
        graphqlType: getGraphQLTypeFromColumn(column.columnType),
        columnType: column.columnType,
      };
    }
    return {
      name,
      graphqlType: "String" as GraphQLFieldType,
      columnType: "unknown",
    };
  });
}

/**
 * Generate WhereInput type for a query builder
 */
function generateWhereInput(
  name: string,
  fields: FieldInfo[],
  options: GraphQLGeneratorOptions
): string {
  const { fieldTypes = {}, excludeFields = [], includeDescriptions = true } = options;

  const filteredFields = fields.filter((f) => !excludeFields.includes(f.name));

  const fieldDefs = filteredFields.map((field) => {
    // Override from options takes precedence, otherwise use inferred type
    const fieldType = fieldTypes[field.name] ?? field.graphqlType;
    const filterType = getFilterType(fieldType);
    const desc = includeDescriptions ? `  """Filter by ${field.name}"""\n` : "";
    return `${desc}  ${field.name}: ${filterType}`;
  });

  const desc = includeDescriptions
    ? `"""Filter conditions for ${name}"""\n`
    : "";

  const andDesc = includeDescriptions ? `  """Logical AND of multiple conditions"""\n` : "";
  const orDesc = includeDescriptions ? `  """Logical OR of multiple conditions"""\n` : "";
  const notDesc = includeDescriptions ? `  """Negate the condition"""\n` : "";

  return `${desc}input ${name}WhereInput {
${andDesc}  _and: [${name}WhereInput!]
${orDesc}  _or: [${name}WhereInput!]
${notDesc}  _not: ${name}WhereInput
${fieldDefs.join("\n")}
}`;
}

/**
 * Generate OrderByInput type for a query builder
 */
function generateOrderByInput(
  name: string,
  fields: FieldInfo[],
  options: GraphQLGeneratorOptions
): string {
  const { excludeFields = [], includeDescriptions = true } = options;

  const filteredFields = fields.filter((f) => !excludeFields.includes(f.name));

  const enumValues = filteredFields.map((field) => {
    const desc = includeDescriptions ? `  """Sort by ${field.name}"""\n` : "";
    return `${desc}  ${toScreamingSnakeCase(field.name)}`;
  });

  const desc = includeDescriptions
    ? `"""Fields available for sorting ${name}"""\n`
    : "";

  const enumDef = `${desc}enum ${name}OrderField {
${enumValues.join("\n")}
}`;

  const inputDesc = includeDescriptions
    ? `"""Ordering configuration for ${name}"""\n`
    : "";

  const inputDef = `${inputDesc}input ${name}OrderByInput {
  """Field to order by"""
  field: ${name}OrderField!
  """Sort direction"""
  direction: SortDirection!
}`;

  return `${enumDef}\n\n${inputDef}`;
}

/**
 * Generate a simple order enum (for string-based ordering like "field:asc")
 */
function generateOrderEnum(
  name: string,
  fields: FieldInfo[],
  options: GraphQLGeneratorOptions
): string {
  const { excludeFields = [], includeDescriptions = true } = options;

  const filteredFields = fields.filter((f) => !excludeFields.includes(f.name));

  const enumValues: string[] = [];
  for (const field of filteredFields) {
    const fieldUpper = toScreamingSnakeCase(field.name);
    if (includeDescriptions) {
      enumValues.push(`  """Sort by ${field.name} ascending"""`);
    }
    enumValues.push(`  ${fieldUpper}_ASC`);
    if (includeDescriptions) {
      enumValues.push(`  """Sort by ${field.name} descending"""`);
    }
    enumValues.push(`  ${fieldUpper}_DESC`);
  }

  const desc = includeDescriptions
    ? `"""Sort options for ${name}"""\n`
    : "";

  return `${desc}enum ${name}SortOrder {
${enumValues.join("\n")}
}`;
}

/**
 * Generate pagination input with filtering and ordering
 */
function generateQueryInput(
  name: string,
  options: GraphQLGeneratorOptions
): string {
  const { includeDescriptions = true } = options;

  const desc = includeDescriptions
    ? `"""Query input for ${name} with filtering, ordering, and pagination"""\n`
    : "";

  return `${desc}input ${name}QueryInput {
  """Filter conditions"""
  where: ${name}WhereInput
  """Sort order (can specify multiple)"""
  orderBy: [${name}OrderByInput!]
  """Number of items to return"""
  limit: Int
  """Number of items to skip"""
  offset: Int
}`;
}

/**
 * Generate Relay-style pagination input
 */
function generateRelayInput(
  name: string,
  options: GraphQLGeneratorOptions
): string {
  const { includeDescriptions = true } = options;

  const desc = includeDescriptions
    ? `"""Relay-style pagination input for ${name}"""\n`
    : "";

  return `${desc}input ${name}ConnectionInput {
  """Returns the first n items"""
  first: Int
  """Returns items after this cursor"""
  after: String
  """Returns the last n items"""
  last: Int
  """Returns items before this cursor"""
  before: String
  """Filter conditions"""
  where: ${name}WhereInput
  """Sort order"""
  orderBy: [${name}OrderByInput!]
}`;
}

// =============================================================================
// Main API
// =============================================================================

export type GeneratedGraphQLTypes = {
  /** All type definitions as a single string */
  typeDefs: string;
  /** Base filter types (StringFilter, IntFilter, etc.) */
  baseTypes: string;
  /** WhereInput type definition */
  whereInput: string;
  /** OrderByInput and enum definitions */
  orderByInput: string;
  /** Simple order enum (FIELD_ASC, FIELD_DESC) */
  orderEnum: string;
  /** Combined query input */
  queryInput: string;
  /** Relay-style connection input */
  relayInput: string;
  /** List of field names */
  fields: string[];
};

/**
 * Generate GraphQL type definitions from a query builder
 *
 * @param query - FluentQueryBuilder, RelayQueryBuilder, or CursorQueryBuilder
 * @param name - Base name for generated types (e.g., "Warehouse" -> WarehouseWhereInput)
 * @param options - Generator options
 * @returns Generated GraphQL type definitions
 *
 * @example
 * ```ts
 * const warehouseQuery = createQuery(warehouses);
 *
 * const types = generateGraphQLTypes(warehouseQuery, "Warehouse");
 * console.log(types.typeDefs);
 *
 * // Or include only specific parts:
 * console.log(types.whereInput);
 * console.log(types.orderByInput);
 * ```
 */
export function generateGraphQLTypes<
  T extends Table,
  Fields extends FluentFieldsDef,
  InferredFields extends FieldsDef,
  Types,
>(
  query:
    | FluentQueryBuilder<T, Fields, InferredFields, Types>
    | RelayQueryBuilder<T, Fields, InferredFields, Types>
    | CursorQueryBuilder<T, Fields, InferredFields, Types>,
  name: string,
  options: GraphQLGeneratorOptions = {}
): GeneratedGraphQLTypes {
  const { includeBaseTypes = true } = options;

  // Extract fields with types from query
  const fluentQuery = resolveFluentQuery(query);
  const fieldsWithTypes = extractFieldsWithTypes(fluentQuery);

  // Generate type definitions
  const baseTypes = BASE_FILTER_TYPES.trim();
  const whereInput = generateWhereInput(name, fieldsWithTypes, options);
  const orderByInput = generateOrderByInput(name, fieldsWithTypes, options);
  const orderEnum = generateOrderEnum(name, fieldsWithTypes, options);
  const queryInput = generateQueryInput(name, options);
  const relayInput = generateRelayInput(name, options);

  // Combine all types
  const parts: string[] = [];
  if (includeBaseTypes) {
    parts.push(baseTypes);
  }
  parts.push(whereInput);
  parts.push(orderByInput);
  parts.push(orderEnum);
  parts.push(queryInput);
  parts.push(relayInput);

  return {
    typeDefs: parts.join("\n\n"),
    baseTypes,
    whereInput,
    orderByInput,
    orderEnum,
    queryInput,
    relayInput,
    fields: fieldsWithTypes.map((f) => f.name),
  };
}

/**
 * Generate only the base filter types (StringFilter, IntFilter, etc.)
 *
 * Use this once in your schema if you have multiple entities using filters.
 *
 * @example
 * ```ts
 * const baseTypes = generateBaseFilterTypes();
 * // Add to your schema once
 * ```
 */
export function generateBaseFilterTypes(): string {
  return BASE_FILTER_TYPES.trim();
}

/**
 * Generate only WhereInput for a query builder
 *
 * @example
 * ```ts
 * const whereInput = generateWhereInputType(warehouseQuery, "Warehouse");
 * // input WarehouseWhereInput { ... }
 * ```
 */
export function generateWhereInputType<
  T extends Table,
  Fields extends FluentFieldsDef,
  InferredFields extends FieldsDef,
  Types,
>(
  query:
    | FluentQueryBuilder<T, Fields, InferredFields, Types>
    | RelayQueryBuilder<T, Fields, InferredFields, Types>
    | CursorQueryBuilder<T, Fields, InferredFields, Types>,
  name: string,
  options: GraphQLGeneratorOptions = {}
): string {
  const fluentQuery = resolveFluentQuery(query);
  const fields = extractFieldsWithTypes(fluentQuery);

  return generateWhereInput(name, fields, options);
}

/**
 * Generate only OrderByInput for a query builder
 *
 * @example
 * ```ts
 * const orderInput = generateOrderByInputType(warehouseQuery, "Warehouse");
 * // enum WarehouseOrderField { ... }
 * // input WarehouseOrderByInput { ... }
 * ```
 */
export function generateOrderByInputType<
  T extends Table,
  Fields extends FluentFieldsDef,
  InferredFields extends FieldsDef,
  Types,
>(
  query:
    | FluentQueryBuilder<T, Fields, InferredFields, Types>
    | RelayQueryBuilder<T, Fields, InferredFields, Types>
    | CursorQueryBuilder<T, Fields, InferredFields, Types>,
  name: string,
  options: GraphQLGeneratorOptions = {}
): string {
  const fluentQuery = resolveFluentQuery(query);
  const fields = extractFieldsWithTypes(fluentQuery);

  return generateOrderByInput(name, fields, options);
}
