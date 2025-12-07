import type { Table } from "drizzle-orm";

/**
 * Extract column names from a Drizzle table
 */
export type ColumnNames<T extends Table> = keyof T["_"]["columns"] & string;

/**
 * Extract the data type of a specific column
 */
export type ColumnDataType<
  T extends Table,
  K extends ColumnNames<T>,
> = T["_"]["columns"][K]["_"]["data"];

/**
 * Check if column is nullable
 */
export type IsColumnNullable<
  T extends Table,
  K extends ColumnNames<T>,
> = T["_"]["columns"][K]["_"]["notNull"] extends true ? false : true;

/**
 * WhereInputV3 - Dynamic filter format matching goqutil.WhereInputV3
 *
 * Format:
 * ```json
 * {
 *   "$and": [ {...}, {...} ],
 *   "$or":  [ {...}, {...} ],
 *   "field": { "$eq": 1, "$gt": 2 },
 *   "field2": "value",  // shorthand for { "$eq": "value" }
 *   "relation": {
 *     "nestedField": { "$eq": "value" }
 *   }
 * }
 * ```
 *
 * Supported operators:
 * - $eq, $neq - equality
 * - $gt, $gte, $lt, $lte - comparison
 * - $in, $notIn - array membership
 * - $like, $iLike, $notLike, $notILike - pattern matching
 * - $is, $isNot - null checks
 * - $and, $or - logical operators
 */
export type WhereInputV3 = {
  [key: string]: unknown;
};

/**
 * Typed WhereInput for a table (based on table columns)
 * @deprecated Use SchemaWhereInput for schema-based filtering
 */
export type WhereInput<T extends Table> = {
  [K in ColumnNames<T>]?: FilterValue;
} & {
  $and?: WhereInput<T>[];
  $or?: WhereInput<T>[];
};

/**
 * Schema-based WhereInput
 * Provides autocomplete for schema field names (including virtual join fields)
 */
export type SchemaWhereInput<F extends string> = {
  [K in F]?: FilterValue;
} & {
  $and?: SchemaWhereInput<F>[];
  $or?: SchemaWhereInput<F>[];
};

/**
 * Filter value can be:
 * - A direct value (shorthand for $eq)
 * - An object with operators { $eq: value, $gt: value, ... }
 * - A nested object for relations
 */
export type FilterValue =
  | unknown
  | FilterOperators
  | { [key: string]: FilterValue };

/**
 * Filter operators
 */
export type FilterOperators = {
  $eq?: unknown;
  $neq?: unknown;
  $gt?: unknown;
  $gte?: unknown;
  $lt?: unknown;
  $lte?: unknown;
  $in?: unknown[];
  $notIn?: unknown[];
  $like?: string;
  $iLike?: string;
  $notLike?: string;
  $notILike?: string;
  $is?: null;
  $isNot?: null;
};

/**
 * Order direction
 */
export type OrderDirection = "asc" | "desc";

/**
 * Nulls positioning in order
 */
export type NullsOrder = "first" | "last";

/**
 * Extended order options
 */
export type OrderOptions = {
  direction: OrderDirection;
  nulls?: NullsOrder;
};

/**
 * Order input - simple version (just direction)
 */
export type OrderInput<T extends Table> = {
  [K in ColumnNames<T>]?: OrderDirection | OrderOptions;
};

/**
 * Array-based order input for explicit ordering
 */
export type OrderByInput<T extends Table> = Array<{
  field: ColumnNames<T>;
  direction?: OrderDirection;
  nulls?: NullsOrder;
}>;

/**
 * Pagination input using limit/offset
 */
export type PaginationInput = {
  limit?: number;
  offset?: number;
};

/**
 * Resolved pagination values
 */
export type ResolvedPagination = {
  limit: number;
  offset: number;
};

/**
 * Selection input - which columns to select
 */
export type SelectionInput<T extends Table> = ColumnNames<T>[];

/**
 * Full query input combining all options
 * Analogous to goqutil.QueryInput
 */
export type QueryInput<T extends Table> = {
  where?: WhereInput<T>;
  orderBy?: OrderByInput<T> | OrderInput<T>;
  pagination?: PaginationInput;
  select?: SelectionInput<T>;
};

/**
 * Input type matching goqutil.Input structure (table-based)
 * @deprecated Use SchemaInput for schema-based input
 */
export type Input<T extends Table> = {
  /** Offset for pagination */
  offset?: number;
  /** Limit for pagination */
  limit?: number;
  /** Single order field (e.g., "createdAt:desc") */
  order?: string;
  /** Multiple order fields */
  multiOrder?: string[];
  /** Fields to select */
  select?: ColumnNames<T>[];
  /** Where filters */
  where?: WhereInput<T>;
};

/**
 * Schema-based Input type
 * Used for API/GraphQL input parsing with full schema field support
 *
 * @template T - Drizzle table type
 * @template F - Schema field names (union of string literals)
 *
 * @example
 * ```ts
 * // GraphQL resolver with typed schema fields
 * async products(input: SchemaInput<typeof product, "id" | "handle" | "title">) {
 *   const qb = createQueryBuilder(productSchema);
 *   const { where, orderBy, limit, offset } = qb.fromInput(input);
 *   return qb.query(db, input);
 * }
 * ```
 */
export type SchemaInput<T extends Table, F extends string> = {
  /** Offset for pagination */
  offset?: number;
  /** Limit for pagination */
  limit?: number;
  /** Single order field (e.g., "createdAt:desc") */
  order?: `${F}:${"asc" | "desc"}` | F;
  /** Multiple order fields */
  multiOrder?: (`${F}:${"asc" | "desc"}` | F)[];
  /** Fields to select */
  select?: F[];
  /** Where filters */
  where?: SchemaWhereInput<F>;
};

/**
 * Generic Input type for custom where types
 * Analogous to goqutil.InputG[T]
 */
export type InputG<T extends Table, W = WhereInput<T>> = {
  offset?: number;
  limit?: number;
  order?: string;
  multiOrder?: string[];
  select?: ColumnNames<T>[];
  where?: W;
};

/**
 * Query builder configuration
 */
export type QueryBuilderConfig = {
  /** Maximum allowed limit */
  maxLimit?: number;
  /** Default limit when none specified */
  defaultLimit?: number;
};

/**
 * Helper type to get column from table by name
 */
export type GetColumn<
  T extends Table,
  K extends ColumnNames<T>,
> = T["_"]["columns"][K];
