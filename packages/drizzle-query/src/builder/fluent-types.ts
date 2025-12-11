import type {
  FieldsDef,
  NestedPaths,
  NestedWhereInput,
  OrderByItem,
  FilterValue,
} from "../types.js";
import type {
  SimpleFieldDefinition,
  JoinFieldDefinition,
  FieldBuilder,
} from "./helpers.js";

/**
 * Join type
 */
export type JoinType = "left" | "right" | "inner" | "full";

/**
 * Fluent Query Builder interface for type inference
 */
export interface FluentQueryBuilderLike<
  Fields extends FluentFieldsDef = FluentFieldsDef
> {
  getFieldsDef(): Fields;
}

/**
 * Any field definition type (simple, with join, or field builder)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyFieldDefinition =
  | SimpleFieldDefinition
  | JoinFieldDefinition<any>
  | FieldBuilder;

/**
 * Fields definition for FluentQueryBuilder
 */
export type FluentFieldsDef = {
  [key: string]: AnyFieldDefinition;
};

/**
 * Extract join fields from a JoinFieldDefinition.
 * Returns the nested FluentFieldsDef if the field has a join, otherwise never.
 */
type ExtractJoinFields<T> = T extends JoinFieldDefinition<infer Fields>
  ? Fields
  : never;

/**
 * Check if a field definition has a join (is a JoinFieldDefinition)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IsJoinField<T> = T extends JoinFieldDefinition<any> ? true : false;

/**
 * Convert FluentFieldsDef to FieldsDef for type inference.
 * This maps field definitions with joins to nested FieldsDef structures.
 *
 * @example
 * ```ts
 * // Given:
 * const addressQuery = createQuery(addresses, {
 *   id: field("id"),
 *   city: field("city"),
 * });
 *
 * const userQuery = createQuery(users, {
 *   id: field("id"),
 *   address: field("id", leftJoin(() => addressQuery, "userId")),
 * });
 *
 * // ToFieldsDef resolves to:
 * // { id: true; address: { id: true; city: true } }
 * ```
 */
export type ToFieldsDef<T extends FluentFieldsDef> = {
  [K in keyof T & string]: IsJoinField<T[K]> extends true
    ? ExtractJoinFields<T[K]> extends FluentFieldsDef
      ? ToFieldsDef<ExtractJoinFields<T[K]>>
      : true
    : true;
};

/**
 * Fluent Query Builder configuration (immutable)
 */
export type FluentQueryConfig<Fields extends FieldsDef = FieldsDef> = {
  /** Default order */
  defaultOrder?: OrderByItem<NestedPaths<Fields>>;
  /** Default fields to select */
  defaultSelect?: NestedPaths<Fields>[];
  /** Fields always included in select */
  include?: NestedPaths<Fields>[];
  /** Fields always excluded from select */
  exclude?: NestedPaths<Fields>[];
  /** Maximum allowed limit (throws if exceeded) */
  maxLimit?: number;
  /** Default limit when none specified */
  defaultLimit?: number;
  /** Default where conditions */
  defaultWhere?: NestedWhereInput<Fields>;
};

/**
 * Runtime execution options with full type inference
 */
export type ExecuteOptions<Fields extends FieldsDef> = {
  /** Filter conditions */
  where?: NestedWhereInput<Fields>;
  /** Order fields */
  order?: OrderByItem<NestedPaths<Fields>>[];
  /** Fields to select */
  select?: NestedPaths<Fields>[];
  /** Maximum number of records to return */
  limit?: number;
  /** Number of records to skip */
  offset?: number;
};

/**
 * Query snapshot - current configuration state
 */
export type QuerySnapshot<Fields extends FieldsDef = FieldsDef> = {
  tableName: string;
  fields: (keyof Fields & string)[];
  config: FluentQueryConfig<Fields>;
};

// Re-export types from main types.ts for convenience
export type {
  FieldsDef,
  NestedPaths,
  NestedWhereInput,
  OrderByItem,
  FilterValue,
};
