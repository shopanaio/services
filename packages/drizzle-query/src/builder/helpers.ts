import type { Column, SQL } from "drizzle-orm";
import type {
  JoinType,
  FluentFieldsDef,
  FluentQueryBuilderLike,
} from "./fluent-types.js";

/**
 * SQL.Aliased type from drizzle-orm
 */
interface SQLAliased {
  fieldAlias: string;
  sql?: SQL;
}

/**
 * Check if value is SQL.Aliased (has fieldAlias)
 */
function isSQLAliased(value: unknown): value is SQLAliased {
  return (
    typeof value === "object" &&
    value !== null &&
    "fieldAlias" in value &&
    typeof (value as SQLAliased).fieldAlias === "string"
  );
}

/**
 * Column or SQL.Aliased - represents a field from a view
 */
type ColumnOrAliased = Column | SQLAliased;

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
    column: ColumnOrAliased
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
    column: ColumnOrAliased
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
    column: ColumnOrAliased
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
    column: ColumnOrAliased
  ): JoinFieldDefinition<TFields>;
}

/**
 * Get the column name from a Column or SQL.Aliased
 */
function getColumnName(columnOrAliased: ColumnOrAliased): string {
  if (isSQLAliased(columnOrAliased)) {
    return columnOrAliased.fieldAlias;
  }
  return columnOrAliased.name;
}

/**
 * Create a field definition from a Drizzle column or SQL.Aliased
 *
 * @example
 * ```ts
 * // Simple field from table column:
 * const usersQuery = createQuery(users, {
 *   id: field(users.id),
 *   name: field(users.name),
 * });
 *
 * // Field from view with SQL.Aliased:
 * const statsQuery = createQuery(statsView, {
 *   displayName: field(statsView.displayName), // SQL.Aliased field
 * });
 *
 * // With join:
 * const usersQuery = createQuery(users, {
 *   id: field(users.id),
 *   address: field(users.addressId).leftJoin(addressSchema, addresses.userId),
 * });
 * ```
 */
export function field(column: ColumnOrAliased): FieldBuilder {
  const columnName = getColumnName(column);

  return {
    column: columnName,
    join: undefined,
    leftJoin<TFields extends FluentFieldsDef>(
      target: FluentQueryBuilderLike<TFields>,
      joinColumn: ColumnOrAliased
    ): JoinFieldDefinition<TFields> {
      return {
        column: columnName,
        join: { type: "left", target: () => target, column: getColumnName(joinColumn) },
      };
    },
    innerJoin<TFields extends FluentFieldsDef>(
      target: FluentQueryBuilderLike<TFields>,
      joinColumn: ColumnOrAliased
    ): JoinFieldDefinition<TFields> {
      return {
        column: columnName,
        join: { type: "inner", target: () => target, column: getColumnName(joinColumn) },
      };
    },
    rightJoin<TFields extends FluentFieldsDef>(
      target: FluentQueryBuilderLike<TFields>,
      joinColumn: ColumnOrAliased
    ): JoinFieldDefinition<TFields> {
      return {
        column: columnName,
        join: { type: "right", target: () => target, column: getColumnName(joinColumn) },
      };
    },
    fullJoin<TFields extends FluentFieldsDef>(
      target: FluentQueryBuilderLike<TFields>,
      joinColumn: ColumnOrAliased
    ): JoinFieldDefinition<TFields> {
      return {
        column: columnName,
        join: { type: "full", target: () => target, column: getColumnName(joinColumn) },
      };
    },
  };
}
