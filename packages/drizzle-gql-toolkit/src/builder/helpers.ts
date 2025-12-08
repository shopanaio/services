import type {
  JoinType,
  FluentFieldsDef,
  FluentQueryBuilderLike,
} from "./fluent-types.js";

/**
 * Simple field definition (no join)
 */
export type SimpleFieldDefinition = {
  column: string;
  join?: undefined;
};

/**
 * Field definition with join
 */
export type JoinFieldDefinition<TFields extends FluentFieldsDef> = {
  column: string;
  join: JoinDefinition<TFields>;
};

/**
 * Field definition - either simple or with join
 */
export type FieldDefinition<TJoinFields extends FluentFieldsDef | undefined = undefined> =
  TJoinFields extends FluentFieldsDef
    ? JoinFieldDefinition<TJoinFields>
    : SimpleFieldDefinition;

/**
 * Join definition
 */
export type JoinDefinition<TFields extends FluentFieldsDef = FluentFieldsDef> = {
  type: JoinType;
  target: () => FluentQueryBuilderLike<TFields>;
  column: string;
};

/**
 * Join target - can be a direct schema or a function (for circular references)
 */
export type JoinTarget<TFields extends FluentFieldsDef> =
  | FluentQueryBuilderLike<TFields>
  | (() => FluentQueryBuilderLike<TFields>);

/**
 * Normalize join target to always be a function
 */
function normalizeJoinTarget<TFields extends FluentFieldsDef>(
  target: JoinTarget<TFields>
): () => FluentQueryBuilderLike<TFields> {
  return typeof target === "function" ? target : () => target;
}

/**
 * Field builder with fluent join methods
 */
export interface FieldBuilder extends SimpleFieldDefinition {
  /**
   * Add a left join to this field
   *
   * @example
   * ```ts
   * // Direct schema (simple case):
   * address: field("addressId").leftJoin(addressSchema, "userId")
   *
   * // Function (for circular references):
   * manager: field("managerId").leftJoin(() => usersSchema, "id")
   * ```
   */
  leftJoin<TFields extends FluentFieldsDef>(
    target: JoinTarget<TFields>,
    column: string
  ): JoinFieldDefinition<TFields>;

  /**
   * Add an inner join to this field
   *
   * @example
   * ```ts
   * orders: field("id").innerJoin(ordersSchema, "userId")
   * ```
   */
  innerJoin<TFields extends FluentFieldsDef>(
    target: JoinTarget<TFields>,
    column: string
  ): JoinFieldDefinition<TFields>;

  /**
   * Add a right join to this field
   *
   * @example
   * ```ts
   * user: field("userId").rightJoin(usersSchema, "id")
   * ```
   */
  rightJoin<TFields extends FluentFieldsDef>(
    target: JoinTarget<TFields>,
    column: string
  ): JoinFieldDefinition<TFields>;

  /**
   * Add a full join to this field
   *
   * @example
   * ```ts
   * related: field("relatedId").fullJoin(relatedSchema, "id")
   * ```
   */
  fullJoin<TFields extends FluentFieldsDef>(
    target: JoinTarget<TFields>,
    column: string
  ): JoinFieldDefinition<TFields>;
}

/**
 * Create a field definition for a column with optional fluent join methods
 *
 * @example
 * ```ts
 * // Simple field:
 * const usersQuery = createQuery(users, {
 *   id: field("id"),
 *   name: field("name"),
 * });
 *
 * // With join (direct schema):
 * const usersQuery = createQuery(users, {
 *   id: field("id"),
 *   address: field("addressId").leftJoin(addressSchema, "userId"),
 * });
 *
 * // With join (function for circular refs):
 * const usersQuery = createQuery(users, {
 *   id: field("id"),
 *   manager: field("managerId").leftJoin(() => usersQuery, "id"),
 * });
 * ```
 */
export function field(column: string): FieldBuilder {
  return {
    column,
    join: undefined,
    leftJoin<TFields extends FluentFieldsDef>(
      target: JoinTarget<TFields>,
      joinColumn: string
    ): JoinFieldDefinition<TFields> {
      return {
        column,
        join: { type: "left", target: normalizeJoinTarget(target), column: joinColumn },
      };
    },
    innerJoin<TFields extends FluentFieldsDef>(
      target: JoinTarget<TFields>,
      joinColumn: string
    ): JoinFieldDefinition<TFields> {
      return {
        column,
        join: { type: "inner", target: normalizeJoinTarget(target), column: joinColumn },
      };
    },
    rightJoin<TFields extends FluentFieldsDef>(
      target: JoinTarget<TFields>,
      joinColumn: string
    ): JoinFieldDefinition<TFields> {
      return {
        column,
        join: { type: "right", target: normalizeJoinTarget(target), column: joinColumn },
      };
    },
    fullJoin<TFields extends FluentFieldsDef>(
      target: JoinTarget<TFields>,
      joinColumn: string
    ): JoinFieldDefinition<TFields> {
      return {
        column,
        join: { type: "full", target: normalizeJoinTarget(target), column: joinColumn },
      };
    },
  };
}
