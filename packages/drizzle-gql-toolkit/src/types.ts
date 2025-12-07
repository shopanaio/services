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
  /** Order fields (e.g., ["createdAt:desc", "name:asc"]) */
  order?: string[];
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
  /** Order fields (e.g., ["createdAt:desc", "name:asc"]) */
  order?: (`${F}:${"asc" | "desc"}` | F)[];
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
  order?: string[];
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

// =============================================================================
// NESTED PATH TYPES - For type-safe nested field access
// =============================================================================

/**
 * Field structure definition for nested paths type generation.
 * Use `true` for leaf fields, nested object for join relations.
 *
 * @example
 * ```ts
 * type OrderFieldsDef = {
 *   id: true;
 *   status: true;
 *   items: {
 *     quantity: true;
 *     product: {
 *       sku: true;
 *       price: true;
 *       category: {
 *         slug: true;
 *       }
 *     }
 *   }
 * };
 * ```
 */
export type FieldsDef = {
  [key: string]: true | FieldsDef;
};

/**
 * Recursively generate all nested paths from a FieldsDef structure.
 * Produces union of all possible paths like "items.product.category.slug"
 *
 * @example
 * ```ts
 * type Paths = NestedPaths<{
 *   id: true;
 *   items: { quantity: true; product: { sku: true } }
 * }>;
 * // Result: "id" | "items" | "items.quantity" | "items.product" | "items.product.sku"
 * ```
 */
export type NestedPaths<T extends FieldsDef, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends true
    ? Prefix extends ""
      ? K
      : `${Prefix}.${K}`
    : T[K] extends FieldsDef
      ?
          | (Prefix extends "" ? K : `${Prefix}.${K}`)
          | NestedPaths<T[K], Prefix extends "" ? K : `${Prefix}.${K}`>
      : never;
}[keyof T & string];

/**
 * Generate ORDER BY paths with direction suffix.
 *
 * @example
 * ```ts
 * type OrderPaths = OrderPath<"id" | "items.product.price">;
 * // Result: "id" | "id:asc" | "id:desc" | "items.product.price" | "items.product.price:asc" | "items.product.price:desc"
 * ```
 */
export type OrderPath<F extends string> = F | `${F}:${"asc" | "desc"}`;

/**
 * Nested WhereInput with proper type inference for nested paths.
 * Supports dot notation paths with proper operator support.
 */
export type NestedWhereInput<T extends FieldsDef> = {
  [K in keyof T & string]?: T[K] extends true
    ? FilterValue
    : T[K] extends FieldsDef
      ? NestedWhereInput<T[K]>
      : never;
} & {
  $and?: NestedWhereInput<T>[];
  $or?: NestedWhereInput<T>[];
};

/**
 * Schema-based Input type with full nested path support.
 * Provides autocomplete for nested order/select paths.
 *
 * @template T - Drizzle table type
 * @template Fields - FieldsDef structure defining nested schema
 *
 * @example
 * ```ts
 * // Define field structure
 * type OrderFields = {
 *   id: true;
 *   status: true;
 *   createdAt: true;
 *   items: {
 *     quantity: true;
 *     product: {
 *       sku: true;
 *       price: true;
 *       category: { slug: true }
 *     }
 *   }
 * };
 *
 * // Use in resolver
 * async orders(input: NestedSchemaInput<typeof orders, OrderFields>) {
 *   // input.order will autocomplete to:
 *   // ["id:asc", "items.product.price:desc", "items.product.category.slug:asc", ...]
 * }
 * ```
 */
export type NestedSchemaInput<T extends Table, Fields extends FieldsDef> = {
  /** Offset for pagination */
  offset?: number;
  /** Limit for pagination */
  limit?: number;
  /** Order fields with nested path support (e.g., ["createdAt:desc", "items.product.price:asc"]) */
  order?: OrderPath<NestedPaths<Fields>>[];
  /** Fields to select with nested path support */
  select?: NestedPaths<Fields>[];
  /** Where filters with nested structure */
  where?: NestedWhereInput<Fields>;
};
