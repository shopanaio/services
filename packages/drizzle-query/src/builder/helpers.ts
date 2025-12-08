import type { Column } from "drizzle-orm";
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
 * Field builder with fluent join methods
 */
export interface FieldBuilder extends SimpleFieldDefinition {
  /**
   * Add a left join to this field
   *
   * @example
   * ```ts
   * address: field(users.addressId).leftJoin(addressSchema, addresses.userId)
   * ```
   */
  leftJoin<TFields extends FluentFieldsDef>(
    target: FluentQueryBuilderLike<TFields>,
    column: Column
  ): JoinFieldDefinition<TFields>;

  /**
   * Add an inner join to this field
   *
   * @example
   * ```ts
   * orders: field(users.id).innerJoin(ordersSchema, orders.userId)
   * ```
   */
  innerJoin<TFields extends FluentFieldsDef>(
    target: FluentQueryBuilderLike<TFields>,
    column: Column
  ): JoinFieldDefinition<TFields>;

  /**
   * Add a right join to this field
   *
   * @example
   * ```ts
   * user: field(orders.userId).rightJoin(usersSchema, users.id)
   * ```
   */
  rightJoin<TFields extends FluentFieldsDef>(
    target: FluentQueryBuilderLike<TFields>,
    column: Column
  ): JoinFieldDefinition<TFields>;

  /**
   * Add a full join to this field
   *
   * @example
   * ```ts
   * related: field(items.relatedId).fullJoin(relatedSchema, related.id)
   * ```
   */
  fullJoin<TFields extends FluentFieldsDef>(
    target: FluentQueryBuilderLike<TFields>,
    column: Column
  ): JoinFieldDefinition<TFields>;
}

/**
 * Create a field definition from a Drizzle column
 *
 * @example
 * ```ts
 * // Simple field:
 * const usersQuery = createQuery(users, {
 *   id: field(users.id),
 *   name: field(users.name),
 * });
 *
 * // With join:
 * const usersQuery = createQuery(users, {
 *   id: field(users.id),
 *   address: field(users.addressId).leftJoin(addressSchema, addresses.userId),
 * });
 * ```
 */
export function field(column: Column): FieldBuilder {
  const columnName = column.name;

  return {
    column: columnName,
    join: undefined,
    leftJoin<TFields extends FluentFieldsDef>(
      target: FluentQueryBuilderLike<TFields>,
      joinColumn: Column
    ): JoinFieldDefinition<TFields> {
      return {
        column: columnName,
        join: { type: "left", target: () => target, column: joinColumn.name },
      };
    },
    innerJoin<TFields extends FluentFieldsDef>(
      target: FluentQueryBuilderLike<TFields>,
      joinColumn: Column
    ): JoinFieldDefinition<TFields> {
      return {
        column: columnName,
        join: { type: "inner", target: () => target, column: joinColumn.name },
      };
    },
    rightJoin<TFields extends FluentFieldsDef>(
      target: FluentQueryBuilderLike<TFields>,
      joinColumn: Column
    ): JoinFieldDefinition<TFields> {
      return {
        column: columnName,
        join: { type: "right", target: () => target, column: joinColumn.name },
      };
    },
    fullJoin<TFields extends FluentFieldsDef>(
      target: FluentQueryBuilderLike<TFields>,
      joinColumn: Column
    ): JoinFieldDefinition<TFields> {
      return {
        column: columnName,
        join: { type: "full", target: () => target, column: joinColumn.name },
      };
    },
  };
}
