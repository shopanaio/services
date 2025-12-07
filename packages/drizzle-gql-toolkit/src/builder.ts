import {
  and,
  or,
  asc,
  desc,
  sql,
  eq,
  type SQL,
  type Table,
  type Column,
} from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { buildOperatorCondition, isFilterObject } from "./operators.js";
import {
  ObjectSchema,
  tablePrefix,
  type JoinInfo,
  type FieldConfig,
} from "./schema.js";
import type {
  WhereInput,
  WhereInputV3,
  OrderByInput,
  OrderInput,
  OrderDirection,
  ColumnNames,
  QueryBuilderConfig,
  ResolvedPagination,
  PaginationInput,
  Input,
} from "./types.js";

const DEFAULT_CONFIG: Required<QueryBuilderConfig> = {
  maxLimit: 100,
  defaultLimit: 20,
};

/**
 * Query builder for Drizzle tables with GraphQL-style filtering
 * Supports relations and automatic JOIN generation (like goqutil)
 *
 * @example
 * ```ts
 * const schema = createSchema({
 *   table: product,
 *   tableName: "product",
 *   fields: {
 *     id: { column: "id" },
 *     title: {
 *       column: "id",
 *       relation: {
 *         table: () => translation,
 *         on: "entityId",
 *         lift: ["value"],
 *       }
 *     }
 *   }
 * });
 *
 * const qb = createQueryBuilder(schema);
 * const { where, joins } = qb.fromInput({
 *   where: { title: { $iLike: "%test%" } }
 * });
 * ```
 */
export class QueryBuilder<T extends Table> {
  private config: Required<QueryBuilderConfig>;
  private joins: Map<string, JoinInfo> = new Map();

  constructor(
    private schema: ObjectSchema<T>,
    config?: QueryBuilderConfig
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Build WHERE clause from filter input
   * Returns undefined if no conditions, allowing easy spreading
   */
  where(input: WhereInput<T> | WhereInputV3 | undefined | null): SQL | undefined {
    // Reset joins for new query
    this.joins.clear();

    if (!input || Object.keys(input).length === 0) {
      return undefined;
    }

    const conditions = this.buildWhereConditions(input, this.schema, 0);
    if (conditions.length === 0) {
      return undefined;
    }

    return conditions.length === 1 ? conditions[0] : and(...conditions);
  }

  /**
   * Build WHERE conditions recursively (V3 format with relation support)
   */
  private buildWhereConditions(
    input: WhereInputV3,
    schema: ObjectSchema,
    depth: number
  ): SQL[] {
    const conditions: SQL[] = [];
    const tableAlias = tablePrefix(schema.tableName, depth);

    for (const [key, value] of Object.entries(input)) {
      if (value === undefined) {
        continue;
      }

      // Handle $and operator - flatten conditions (like Go: exprs = append(exprs, sub))
      if (key === "$and" && Array.isArray(value)) {
        for (const item of value) {
          const nested = this.buildWhereConditions(item as WhereInputV3, schema, depth);
          conditions.push(...nested);
        }
        continue;
      }

      // Handle $or operator - each element's conditions are AND'ed, then OR'ed together
      if (key === "$or" && Array.isArray(value)) {
        const orConditions: SQL[] = [];
        for (const item of value) {
          const nested = this.buildWhereConditions(item as WhereInputV3, schema, depth);
          if (nested.length === 1) {
            orConditions.push(nested[0]);
          } else if (nested.length > 1) {
            orConditions.push(and(...nested)!);
          }
        }
        if (orConditions.length > 0) {
          conditions.push(or(...orConditions)!);
        }
        continue;
      }

      // Skip other $ operators at top level
      if (key.startsWith("$")) {
        continue;
      }

      // Get field configuration
      const fieldConfig = schema.getField(key);
      if (!fieldConfig) {
        // Try direct column access if no schema field
        const column = this.getColumn(schema.table, key);
        if (column) {
          const fieldConditions = this.buildFieldConditions(column, tableAlias, value);
          conditions.push(...fieldConditions);
        }
        continue;
      }

      // Check if value is a filter object (all keys start with $)
      const isFilter = isFilterObject(value);

      // Handle relation with lift
      if (fieldConfig.relation) {
        const relation = fieldConfig.relation;
        const hasLift = relation.lift && relation.lift.length > 0;

        if (isFilter && hasLift) {
          // Filter on field with lift - apply to child table fields
          const childConditions = this.buildRelationConditions(
            fieldConfig,
            schema,
            depth,
            value as Record<string, unknown>
          );
          conditions.push(...childConditions);
        } else if (!isFilter) {
          // Nested object - recurse into relation
          const childConditions = this.buildNestedRelationConditions(
            fieldConfig,
            schema,
            depth,
            value as WhereInputV3
          );
          conditions.push(...childConditions);
        } else {
          // Filter without lift - apply to current table column
          const column = this.getColumn(schema.table, fieldConfig.column);
          if (column) {
            const fieldConditions = this.buildFieldConditions(column, tableAlias, value);
            conditions.push(...fieldConditions);
          }
        }
      } else {
        // Regular field
        const column = this.getColumn(schema.table, fieldConfig.column);
        if (column) {
          const fieldConditions = this.buildFieldConditions(column, tableAlias, value);
          conditions.push(...fieldConditions);
        }
      }
    }

    return conditions;
  }

  /**
   * Build conditions for a relation with lift
   */
  private buildRelationConditions(
    fieldConfig: FieldConfig,
    parentSchema: ObjectSchema,
    depth: number,
    filterValue: Record<string, unknown>
  ): SQL[] {
    const relation = fieldConfig.relation!;
    const childTable = typeof relation.table === "function"
      ? relation.table()
      : relation.table;

    // Create child schema (simplified - just using table directly)
    const childTableName = this.getTableName(childTable);
    const childAlias = tablePrefix(childTableName, depth + 1);

    // Register JOIN
    this.addJoin(
      tablePrefix(parentSchema.tableName, depth),
      childTable,
      childAlias,
      fieldConfig.column,
      relation.on as string,
      relation.composite
    );

    // Build conditions for each lift field
    const conditions: SQL[] = [];
    const liftFields = relation.lift || [];

    for (const liftField of liftFields) {
      const column = this.getColumn(childTable, liftField as string);
      if (column) {
        const fieldConditions = this.buildFieldConditions(column, childAlias, filterValue);
        conditions.push(...fieldConditions);
      }
    }

    return conditions;
  }

  /**
   * Build conditions for nested relation (non-filter object)
   */
  private buildNestedRelationConditions(
    fieldConfig: FieldConfig,
    parentSchema: ObjectSchema,
    depth: number,
    nestedInput: WhereInputV3
  ): SQL[] {
    const relation = fieldConfig.relation!;
    const childTable = typeof relation.table === "function"
      ? relation.table()
      : relation.table;

    const childTableName = this.getTableName(childTable);
    const childAlias = tablePrefix(childTableName, depth + 1);

    // Register JOIN
    this.addJoin(
      tablePrefix(parentSchema.tableName, depth),
      childTable,
      childAlias,
      fieldConfig.column,
      relation.on as string,
      relation.composite
    );

    // If lift is defined, wrap the nested input
    let childWhere: WhereInputV3;
    if (relation.lift && relation.lift.length > 0) {
      childWhere = {};
      for (const liftField of relation.lift) {
        childWhere[liftField as string] = nestedInput;
      }
    } else {
      childWhere = nestedInput;
    }

    // Create a simple schema for child table
    const childSchema = new ObjectSchema({
      table: childTable,
      tableName: childTableName,
      fields: this.inferFieldsFromTable(childTable),
    });

    return this.buildWhereConditions(childWhere, childSchema, depth + 1);
  }

  /**
   * Build field conditions from filter value
   */
  private buildFieldConditions(
    column: Column,
    _tableAlias: string,
    value: unknown
  ): SQL[] {
    const conditions: SQL[] = [];

    if (isFilterObject(value)) {
      // Process each operator
      for (const [opKey, opVal] of Object.entries(value)) {
        const condition = buildOperatorCondition(column, opKey, opVal);
        if (condition) {
          conditions.push(condition);
        }
      }
    } else {
      // Direct value - treat as $eq
      conditions.push(eq(column, value));
    }

    return conditions;
  }

  /**
   * Add a join to the collection
   */
  private addJoin(
    sourceAlias: string,
    targetTable: Table,
    targetAlias: string,
    sourceCol: string,
    targetCol: string,
    composite?: Array<{ field: string; on: string }>
  ): void {
    // Skip if already joined with this alias
    if (this.joins.has(targetAlias)) {
      return;
    }

    const conditions: Array<{ sourceCol: string; targetCol: string }> = [
      { sourceCol, targetCol },
    ];

    if (composite) {
      for (const c of composite) {
        conditions.push({ sourceCol: c.field, targetCol: c.on });
      }
    }

    this.joins.set(targetAlias, {
      type: "left",
      sourceAlias,
      targetTable,
      targetAlias,
      conditions,
    });
  }

  /**
   * Get collected joins
   */
  getJoins(): JoinInfo[] {
    return Array.from(this.joins.values());
  }

  /**
   * Build SQL for joins (for manual query building)
   */
  buildJoinsSql(): SQL[] {
    const joinSqls: SQL[] = [];

    for (const join of this.joins.values()) {
      const conditionParts = join.conditions.map((c) =>
        sql`${sql.identifier(join.sourceAlias)}.${sql.identifier(c.sourceCol)} = ${sql.identifier(join.targetAlias)}.${sql.identifier(c.targetCol)}`
      );

      const conditionSql = conditionParts.length === 1
        ? conditionParts[0]
        : sql.join(conditionParts, sql` AND `);

      joinSqls.push(
        sql`LEFT JOIN ${join.targetTable} AS ${sql.identifier(join.targetAlias)} ON ${conditionSql}`
      );
    }

    return joinSqls;
  }

  /**
   * Get a column from a table by name
   */
  private getColumn(table: Table, name: string): Column | undefined {
    const columns = (table as PgTable)["_"]["columns"];
    return columns[name as keyof typeof columns] as Column | undefined;
  }

  /**
   * Get table name from table object
   */
  private getTableName(table: Table): string {
    const pgTable = table as PgTable;
    return pgTable["_"]["name"];
  }

  /**
   * Infer field configs from table columns
   */
  private inferFieldsFromTable(table: Table): Record<string, FieldConfig> {
    const columns = (table as PgTable)["_"]["columns"];
    const fields: Record<string, FieldConfig> = {};

    for (const [name] of Object.entries(columns)) {
      fields[name] = { column: name };
    }

    return fields;
  }

  /**
   * Build ORDER BY clause from input
   */
  orderBy(
    input: OrderByInput<T> | OrderInput<T> | undefined | null
  ): SQL[] {
    if (!input) {
      return [];
    }

    // Array syntax (explicit order)
    if (Array.isArray(input)) {
      return input
        .map((item) => {
          const column = this.getColumn(this.schema.table, item.field as string);
          if (!column) return null;

          const direction = item.direction ?? "asc";
          return this.buildOrderExpression(column, direction, item.nulls);
        })
        .filter((x): x is SQL => x !== null);
    }

    // Object syntax
    const orders: SQL[] = [];
    for (const [key, value] of Object.entries(input)) {
      const column = this.getColumn(this.schema.table, key);
      if (!column || !value) continue;

      let direction: OrderDirection;
      let nullsOrder: "first" | "last" | undefined;

      if (typeof value === "string") {
        direction = value;
      } else {
        direction = value.direction;
        nullsOrder = value.nulls;
      }

      orders.push(this.buildOrderExpression(column, direction, nullsOrder));
    }

    return orders;
  }

  /**
   * Build a single order expression with optional nulls positioning
   */
  private buildOrderExpression(
    column: Column,
    direction: OrderDirection,
    nulls?: "first" | "last"
  ): SQL {
    const orderFn = direction === "desc" ? desc : asc;
    const baseOrder = orderFn(column);

    if (nulls === "first") {
      return sql`${baseOrder} NULLS FIRST`;
    } else if (nulls === "last") {
      return sql`${baseOrder} NULLS LAST`;
    }

    return baseOrder;
  }

  /**
   * Resolve pagination input to limit/offset
   */
  pagination(input: PaginationInput | undefined | null): ResolvedPagination {
    if (!input) {
      return {
        limit: this.config.defaultLimit,
        offset: 0,
      };
    }

    let limit = input.limit ?? this.config.defaultLimit;
    limit = Math.min(limit, this.config.maxLimit);
    const offset = Math.max(0, input.offset ?? 0);

    return { limit, offset };
  }

  /**
   * Get column selection for specific fields
   */
  select<K extends ColumnNames<T>>(
    fields: K[] | undefined | null
  ): Record<string, Column> | undefined {
    if (!fields || fields.length === 0) {
      return undefined;
    }

    const selection: Record<string, Column> = {};
    for (const field of fields) {
      const column = this.getColumn(this.schema.table, field as string);
      if (column) {
        selection[field] = column;
      }
    }

    return Object.keys(selection).length > 0 ? selection : undefined;
  }

  /**
   * Parse order string like "createdAt:desc" or "createdAtDESC"
   */
  parseOrder(order: string | undefined | null): SQL[] {
    if (!order) return [];

    // Try "field:direction" format
    const colonMatch = order.match(/^(.+):(asc|desc)$/i);
    if (colonMatch) {
      const [, field, dir] = colonMatch;
      const column = this.getColumn(this.schema.table, field);
      if (column) {
        return [this.buildOrderExpression(column, dir.toLowerCase() as OrderDirection)];
      }
    }

    // Try "fieldASC" / "fieldDESC" format
    const suffixMatch = order.match(/^(.+?)(ASC|DESC)$/);
    if (suffixMatch) {
      const [, field, dir] = suffixMatch;
      const column = this.getColumn(this.schema.table, field);
      if (column) {
        return [this.buildOrderExpression(column, dir.toLowerCase() as OrderDirection)];
      }
    }

    // Default: field name with asc
    const column = this.getColumn(this.schema.table, order);
    if (column) {
      return [this.buildOrderExpression(column, "asc")];
    }

    return [];
  }

  /**
   * Parse multiple order strings
   */
  parseMultiOrder(orders: string[] | undefined | null): SQL[] {
    if (!orders || orders.length === 0) return [];
    return orders.flatMap((o) => this.parseOrder(o));
  }

  /**
   * Build a raw SQL query with all components (for complex queries with joins)
   *
   * @example
   * ```ts
   * const { sql: querySql, params } = qb.toRawQuery(input);
   * const result = await db.execute(querySql);
   * ```
   */
  buildSelectSql(input: Input<T> | undefined | null): SQL {
    const { where, limit, offset } = this.fromInput(input);
    const tableAlias = tablePrefix(this.schema.tableName, 0);

    // Build FROM clause with alias
    const fromSql = sql`${this.schema.table} AS ${sql.identifier(tableAlias)}`;

    // Build JOIN clauses
    const joinParts: SQL[] = [];
    for (const join of this.joins.values()) {
      const onConditions = join.conditions.map((c) =>
        sql`${sql.identifier(join.sourceAlias)}.${sql.identifier(c.sourceCol)} = ${sql.identifier(join.targetAlias)}.${sql.identifier(c.targetCol)}`
      );

      const onCondition = onConditions.length === 1
        ? onConditions[0]
        : sql.join(onConditions, sql` AND `);

      joinParts.push(
        sql`LEFT JOIN ${join.targetTable} AS ${sql.identifier(join.targetAlias)} ON ${onCondition}`
      );
    }

    const joinsSql = joinParts.length > 0
      ? sql.join(joinParts, sql` `)
      : sql``;

    // Build WHERE clause
    const whereSql = where ? sql`WHERE ${where}` : sql``;

    // Build full query
    return sql`SELECT ${sql.identifier(tableAlias)}.* FROM ${fromSql} ${joinsSql} ${whereSql} LIMIT ${limit} OFFSET ${offset}`;
  }

  /**
   * Process full Input object (analogous to goqutil.SetInput)
   * Returns all query components including joins
   */
  fromInput(input: Input<T> | undefined | null): {
    where: SQL | undefined;
    joins: JoinInfo[];
    orderBy: SQL[];
    limit: number;
    offset: number;
    select: Record<string, Column> | undefined;
  } {
    if (!input) {
      return {
        where: undefined,
        joins: [],
        orderBy: [],
        limit: this.config.defaultLimit,
        offset: 0,
        select: undefined,
      };
    }

    // Build where clause (this also collects joins)
    const where = this.where(input.where);

    // Get collected joins
    const joins = this.getJoins();

    // Build order by
    let orderBy: SQL[] = [];
    if (input.multiOrder && input.multiOrder.length > 0) {
      orderBy = this.parseMultiOrder(input.multiOrder);
    } else if (input.order) {
      orderBy = this.parseOrder(input.order);
    }

    // Build pagination
    const { limit, offset } = this.pagination({
      limit: input.limit,
      offset: input.offset,
    });

    // Build selection
    const select = this.select(input.fields);

    return { where, joins, orderBy, limit, offset, select };
  }
}

/**
 * Create a new query builder from schema
 */
export function createQueryBuilder<T extends Table>(
  schema: ObjectSchema<T>,
  config?: QueryBuilderConfig
): QueryBuilder<T> {
  return new QueryBuilder(schema, config);
}

/**
 * Apply joins to a Drizzle query using leftJoin
 *
 * @example
 * ```ts
 * const schema = createSchema({
 *   table: product,
 *   tableName: "product",
 *   fields: {
 *     id: { column: "id" },
 *     title: {
 *       column: "id",
 *       relation: {
 *         table: () => translation,
 *         on: "entityId",
 *         lift: ["value"],
 *       }
 *     }
 *   }
 * });
 *
 * const qb = createQueryBuilder(schema);
 * const { where, joins } = qb.fromInput({
 *   where: { title: { $iLike: "%test%" } }
 * });
 *
 * // Apply joins to query
 * let query = db.select().from(product);
 * query = applyJoins(query, joins);
 * const result = await query.where(where);
 * ```
 */
export function applyJoins<Q extends { leftJoin: (...args: unknown[]) => Q }>(
  query: Q,
  joins: JoinInfo[]
): Q {
  let result = query;

  for (const join of joins) {
    // Build join condition
    const conditions = join.conditions.map((c) =>
      sql`${sql.identifier(join.sourceAlias)}.${sql.identifier(c.sourceCol)} = ${sql.identifier(join.targetAlias)}.${sql.identifier(c.targetCol)}`
    );

    const onCondition = conditions.length === 1
      ? conditions[0]
      : sql.join(conditions, sql` AND `);

    // Apply left join with alias
    result = result.leftJoin(
      sql`${join.targetTable} AS ${sql.identifier(join.targetAlias)}`,
      onCondition
    ) as Q;
  }

  return result;
}

/**
 * Build join conditions as SQL for manual query building
 *
 * @example
 * ```ts
 * const joins = qb.getJoins();
 * const joinConditions = buildJoinConditions(joins);
 * // Returns array of: { table: SQL, on: SQL }
 * ```
 */
export function buildJoinConditions(joins: JoinInfo[]): Array<{ table: SQL; on: SQL }> {
  return joins.map((join) => {
    const conditions = join.conditions.map((c) =>
      sql`${sql.identifier(join.sourceAlias)}.${sql.identifier(c.sourceCol)} = ${sql.identifier(join.targetAlias)}.${sql.identifier(c.targetCol)}`
    );

    return {
      table: sql`${join.targetTable} AS ${sql.identifier(join.targetAlias)}`,
      on: conditions.length === 1 ? conditions[0] : sql.join(conditions, sql` AND `),
    };
  });
}
