import type { SQL, Table } from "drizzle-orm";

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
 * Scalar value types supported in filters
 */
export type ScalarValue = string | number | boolean | null | Date;

/**
 * Filter operators with proper typing
 * All comparison operators accept ScalarValue for flexibility
 */
export type FilterOperators<T = ScalarValue> = {
  _eq?: T | null;
  _neq?: T | null;
  _gt?: T | null;
  _gte?: T | null;
  _lt?: T | null;
  _lte?: T | null;
  _in?: T[] | null;
  _notIn?: T[] | null;
  _is?: boolean | null;
  _isNot?: boolean | null;
  // String operators (auto-wrap with wildcards)
  _contains?: string | null;
  _notContains?: string | null;
  _containsi?: string | null;
  _notContainsi?: string | null;
  _startsWith?: string | null;
  _startsWithi?: string | null;
  _endsWith?: string | null;
  _endsWithi?: string | null;
  // Range operator
  _between?: T[] | null;
};

/**
 * Filter value can be scalar or operator object
 */
export type FilterValue = ScalarValue | FilterOperators | null;

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
 * Query builder configuration
 */
export type QueryBuilderConfig = {
  /** Maximum allowed limit */
  maxLimit?: number;
  /** Default limit when none specified */
  defaultLimit?: number;
  /** Maximum depth for auto-generated joins */
  maxJoinDepth?: number;
  /** Enable verbose logging */
  debug?: boolean;
  /** Custom logger for debug output */
  logger?: (message: string, data?: unknown) => void;
};

/**
 * Minimal executor interface compatible with drizzle databases.
 * Returns unknown because different drivers return different types.
 */
export interface DrizzleExecutor {
  execute(query: SQL): Promise<unknown>;
}

/**
 * Helper type to get column from table by name
 */
export type GetColumn<
  T extends Table,
  K extends ColumnNames<T>,
> = T["_"]["columns"][K];

// =============================================================================
// FIELD TYPE INFERENCE - Extract column types from Drizzle tables
// =============================================================================

/**
 * Infer field types from schema configuration.
 * Result keys match the field keys in the schema (like Drizzle).
 * Types are inferred from the Drizzle table using the field key.
 *
 * @example
 * ```ts
 * const schema = createSchema({
 *   table: orders,
 *   fields: {
 *     id: { column: "id" },
 *     parentId: { column: "parent_id" },
 *     status: { column: "status" },
 *   }
 * });
 * // SQL: SELECT "id" AS "id", "parent_id" AS "parentId", "status" AS "status"
 * // InferFieldTypes → { id: string; parentId: string; status: string }
 * ```
 */
export type InferFieldTypes<
  T extends Table,
  Config extends Record<string, { column: string; join?: { schema: () => SchemaWithTypes<Table, unknown> } }>
> = {
  [K in keyof Config & string]: Config[K] extends { join: { schema: () => infer S } }
    ? S extends SchemaWithTypes<infer _JoinTable, infer JoinTypes>
      ? JoinTypes
      : unknown
    : K extends keyof T["$inferSelect"]
      ? T["$inferSelect"][K]
      : unknown;
};

/**
 * Marker type for ObjectSchema to enable type inference.
 */
export type SchemaWithTypes<T extends Table = Table, Types = unknown> = {
  readonly __table: T;
  readonly __types: Types;
};

/**
 * Resolve type for a nested path like "items.product.name"
 */
export type ResolvePathType<Types, Path extends string> =
  Path extends `${infer Head}.${infer Tail}`
    ? Head extends keyof Types
      ? Types[Head] extends object
        ? ResolvePathType<Types[Head], Tail>
        : unknown
      : unknown
    : Path extends keyof Types
      ? Types[Path]
      : unknown;

/**
 * Build result type from select paths
 *
 * @example
 * ```ts
 * type Result = InferSelectResult<Types, ["id", "items.product.name"]>;
 * // → { id: string; "items.product.name": string }
 * ```
 */
export type InferSelectResult<
  Types,
  Select extends readonly string[]
> = {
  [K in Select[number]]: ResolvePathType<Types, K>;
};

/**
 * Get the last segment of a path for use as default alias
 */
export type LastSegment<Path extends string> =
  Path extends `${string}.${infer Rest}`
    ? LastSegment<Rest>
    : Path;

/**
 * Build result type with last segment as key (cleaner output)
 */
export type InferSelectResultFlat<
  Types,
  Select extends readonly string[]
> = {
  [K in Select[number] as LastSegment<K>]: ResolvePathType<Types, K>;
};

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
 * Marker type for ObjectSchema to enable recursive field inference.
 * Used internally by InferFieldsDef.
 */
export type SchemaWithFields<Fields extends FieldsDef = FieldsDef> = {
  readonly __fields: Fields;
};

/**
 * Infer FieldsDef from a schema fields configuration.
 * Recursively extracts nested field structures from join schemas.
 *
 * @example
 * ```ts
 * const productSchema = createSchema({
 *   fields: {
 *     id: { column: "id" },
 *     title: { column: "title" },
 *   }
 * });
 * // InferFieldsDef => { id: true, title: true }
 *
 * const orderItemSchema = createSchema({
 *   fields: {
 *     quantity: { column: "quantity" },
 *     product: {
 *       column: "product_id",
 *       join: { schema: () => productSchema, column: "id" }
 *     }
 *   }
 * });
 * // InferFieldsDef => { quantity: true, product: { id: true, title: true } }
 * ```
 */
export type InferFieldsDef<Config> = {
  [K in keyof Config & string]: Config[K] extends {
    join: { schema: () => infer S };
  }
    ? S extends SchemaWithFields<infer Nested>
      ? Nested
      : true
    : true;
};

/**
 * Extract FieldsDef from an ObjectSchema type
 */
export type ExtractFields<S> = S extends SchemaWithFields<infer Fields>
  ? Fields
  : FieldsDef;

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
 * Order input item - object-based sort specification
 * field может содержать путь с точками для вложенных полей: "items.product.price"
 */
export type OrderByItem<F extends string = string> = {
  field: F;
  order: OrderDirection;
  nulls?: NullsOrder;
};

/**
 * Nested WhereInput with proper type inference for nested paths.
 * Supports dot notation paths with proper operator support.
 */
export type NestedWhereInput<T extends FieldsDef> = {
  [K in keyof T & string]?: T[K] extends true
    ? FilterValue
    : T[K] extends FieldsDef
      ? NestedWhereInput<T[K]> | null
      : never;
} & {
  _and?: NestedWhereInput<T>[] | null;
  _or?: NestedWhereInput<T>[] | null;
  _not?: NestedWhereInput<T> | null;
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
  /** Order fields with nested path support */
  order?: OrderByItem<NestedPaths<Fields>>[];
  /** Fields to select with nested path support */
  select?: NestedPaths<Fields>[];
  /** Where filters with nested structure */
  where?: NestedWhereInput<Fields>;
};

/**
 * Typed schema input that extracts FieldsDef from ObjectSchema.
 * Provides full autocomplete for nested paths in select/order/where.
 *
 * @example
 * ```ts
 * const orderSchema = createSchema({
 *   table: orders,
 *   tableName: "orders",
 *   fields: {
 *     id: { column: "id" },
 *     items: {
 *       column: "id",
 *       join: { schema: () => orderItemsSchema, column: "orderId" }
 *     }
 *   }
 * });
 *
 * // Full autocomplete for nested paths:
 * const input: TypedSchemaInput<typeof orderSchema> = {
 *   select: ["id", "items.product.title"],  // ✓ autocomplete
 *   order: ["items.product.price:desc"],     // ✓ autocomplete
 *   where: { items: { product: { title: { $iLike: "%phone%" } } } }
 * };
 * ```
 */
export type TypedSchemaInput<S extends SchemaWithFields> =
  S extends SchemaWithFields<infer Fields>
    ? {
        /** Offset for pagination */
        offset?: number;
        /** Limit for pagination */
        limit?: number;
        /** Order fields with nested path support */
        order?: OrderByItem<NestedPaths<Fields>>[];
        /** Fields to select with nested path support */
        select?: NestedPaths<Fields>[];
        /** Where filters with nested structure */
        where?: NestedWhereInput<Fields>;
      }
    : never;

/**
 * Extract result type from a schema.
 *
 * @example
 * ```ts
 * const schema = createSchema({ table: products, ... });
 * type Product = TypedSchemaResult<typeof schema>;
 * // { id: string; name: string; price: number; ... }
 * ```
 */
export type TypedSchemaResult<S extends SchemaWithTypes> =
  S extends SchemaWithTypes<infer _T, infer Types> ? Types : never;
