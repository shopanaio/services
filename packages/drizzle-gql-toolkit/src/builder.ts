import {
  and,
  or,
  asc,
  desc,
  sql,
  type SQL,
  type Table,
  type Column,
} from "drizzle-orm";
import { buildOperatorConditionWithAlias, isFilterObject } from "./operators.js";
import {
  ObjectSchema,
  tablePrefix,
  type JoinInfo,
  type FieldConfig,
} from "./schema.js";
import type {
  WhereInputV3,
  OrderByInput,
  OrderInput,
  OrderDirection,
  ColumnNames,
  QueryBuilderConfig,
  ResolvedPagination,
  PaginationInput,
  SchemaInput,
} from "./types.js";

const DEFAULT_CONFIG: Required<QueryBuilderConfig> = {
  maxLimit: 100,
  defaultLimit: 20,
};

/**
 * JOIN type keywords for SQL generation
 */
const JOIN_KEYWORDS = {
  left: "LEFT JOIN",
  right: "RIGHT JOIN",
  inner: "INNER JOIN",
  full: "FULL JOIN",
} as const;

/**
 * Build a JOIN SQL clause with the specified type
 */
function buildJoinSql(
  joinType: "left" | "right" | "inner" | "full",
  targetTable: Table,
  targetAlias: string,
  onCondition: SQL
): SQL {
  const keyword = JOIN_KEYWORDS[joinType];
  return sql`${sql.raw(keyword)} ${targetTable} AS ${sql.identifier(targetAlias)} ON ${onCondition}`;
}

/**
 * Query type that supports all join methods
 */
type JoinableQuery = {
  leftJoin: (table: SQL, on: SQL) => JoinableQuery;
  rightJoin: (table: SQL, on: SQL) => JoinableQuery;
  innerJoin: (table: SQL, on: SQL) => JoinableQuery;
  fullJoin: (table: SQL, on: SQL) => JoinableQuery;
};

/**
 * Apply a join to a query using the appropriate method based on join type
 */
function applyJoinByType<Q extends JoinableQuery>(
  query: Q,
  joinType: "left" | "right" | "inner" | "full",
  tableSql: SQL,
  onCondition: SQL
): Q {
  switch (joinType) {
    case "left":
      return query.leftJoin(tableSql, onCondition) as Q;
    case "right":
      return query.rightJoin(tableSql, onCondition) as Q;
    case "inner":
      return query.innerJoin(tableSql, onCondition) as Q;
    case "full":
      return query.fullJoin(tableSql, onCondition) as Q;
  }
}

/**
 * Query builder for Drizzle tables with GraphQL-style filtering
 * Supports joins and automatic JOIN generation (like goqutil)
 *
 * @example
 * ```ts
 * const translationSchema = createSchema({
 *   table: translation,
 *   tableName: "translation",
 *   fields: {
 *     entityId: { column: "entity_id" },
 *     value: { column: "value" },
 *   }
 * });
 *
 * const productSchema = createSchema({
 *   table: product,
 *   tableName: "product",
 *   fields: {
 *     id: { column: "id" },
 *     title: {
 *       column: "id",
 *       join: {
 *         schema: () => translationSchema,
 *         column: "entityId",
 *         select: ["value"],
 *       }
 *     }
 *   }
 * });
 *
 * const qb = createQueryBuilder(productSchema);
 * const { where, joins } = qb.fromInput({
 *   where: { title: { $iLike: "%test%" } }
 * });
 * ```
 */
export class QueryBuilder<T extends Table, F extends string = string> {
  private config: Required<QueryBuilderConfig>;
  private joins: Map<string, JoinInfo> = new Map();

  constructor(
    private schema: ObjectSchema<T, F>,
    config?: QueryBuilderConfig
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Build WHERE clause from filter input
   * Returns undefined if no conditions, allowing easy spreading
   */
  where(input: WhereInputV3 | undefined | null): SQL | undefined {
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
        const fieldConditions = this.buildFieldConditionsWithAlias(tableAlias, key, value);
        conditions.push(...fieldConditions);
        continue;
      }

      // Check if value is a filter object (all keys start with $)
      const isFilter = isFilterObject(value);

      // Handle join with select
      if (fieldConfig.join) {
        const join = fieldConfig.join;
        const hasSelect = join.select && join.select.length > 0;

        if (isFilter && hasSelect) {
          // Filter on field with select - apply to child table fields
          const childConditions = this.buildJoinFilterConditions(
            fieldConfig,
            schema,
            depth,
            value as Record<string, unknown>
          );
          conditions.push(...childConditions);
        } else if (!isFilter) {
          // Nested object - recurse into join
          const childConditions = this.buildNestedJoinConditions(
            fieldConfig,
            schema,
            depth,
            value as WhereInputV3
          );
          conditions.push(...childConditions);
        } else {
          // Filter without lift - apply to current table column
          const fieldConditions = this.buildFieldConditionsWithAlias(
            tableAlias,
            fieldConfig.column,
            value
          );
          conditions.push(...fieldConditions);
        }
      } else {
        // Regular field
        const fieldConditions = this.buildFieldConditionsWithAlias(
          tableAlias,
          fieldConfig.column,
          value
        );
        conditions.push(...fieldConditions);
      }
    }

    return conditions;
  }

  /**
   * Build conditions for a join with select
   */
  private buildJoinFilterConditions(
    fieldConfig: FieldConfig,
    parentSchema: ObjectSchema,
    depth: number,
    filterValue: Record<string, unknown>
  ): SQL[] {
    const join = fieldConfig.join!;
    const childSchema = join.schema();
    const childAlias = tablePrefix(childSchema.tableName, depth + 1);

    // Get join column from child schema
    const joinFieldConfig = childSchema.getField(join.column);
    const joinColumnName = joinFieldConfig?.column ?? join.column;

    // Register JOIN
    this.registerJoin(
      tablePrefix(parentSchema.tableName, depth),
      childSchema.table,
      childAlias,
      fieldConfig.column,
      joinColumnName,
      join.type,
      join.composite
    );

    // Build conditions for each select field using child alias
    const conditions: SQL[] = [];
    const selectFields = join.select || [];

    for (const selectField of selectFields) {
      // Get field config from child schema to resolve column name
      const selectFieldConfig = childSchema.getField(selectField);
      const columnName = selectFieldConfig?.column ?? selectField;
      // Use childAlias for WHERE conditions
      const fieldConditions = this.buildFieldConditionsWithAlias(childAlias, columnName, filterValue);
      conditions.push(...fieldConditions);
    }

    return conditions;
  }

  /**
   * Build conditions for nested join (non-filter object)
   */
  private buildNestedJoinConditions(
    fieldConfig: FieldConfig,
    parentSchema: ObjectSchema,
    depth: number,
    nestedInput: WhereInputV3
  ): SQL[] {
    const join = fieldConfig.join!;
    const childSchema = join.schema();
    const childAlias = tablePrefix(childSchema.tableName, depth + 1);

    // Get join column from child schema
    const joinFieldConfig = childSchema.getField(join.column);
    const joinColumnName = joinFieldConfig?.column ?? join.column;

    // Register JOIN
    this.registerJoin(
      tablePrefix(parentSchema.tableName, depth),
      childSchema.table,
      childAlias,
      fieldConfig.column,
      joinColumnName,
      join.type,
      join.composite
    );

    // If select is defined, wrap the nested input
    let childWhere: WhereInputV3;
    if (join.select && join.select.length > 0) {
      childWhere = {};
      for (const selectField of join.select) {
        childWhere[selectField] = nestedInput;
      }
    } else {
      childWhere = nestedInput;
    }

    return this.buildWhereConditions(childWhere, childSchema, depth + 1);
  }

  /**
   * Build field conditions from filter value using table alias
   * Produces SQL like: "t0_products"."id" = $1
   */
  private buildFieldConditionsWithAlias(
    tableAlias: string,
    columnName: string,
    value: unknown
  ): SQL[] {
    const conditions: SQL[] = [];

    if (isFilterObject(value)) {
      // Process each operator
      for (const [opKey, opVal] of Object.entries(value)) {
        const condition = buildOperatorConditionWithAlias(tableAlias, columnName, opKey, opVal);
        if (condition) {
          conditions.push(condition);
        }
      }
    } else {
      // Direct value - treat as $eq
      const aliasedColumn = sql`${sql.identifier(tableAlias)}.${sql.identifier(columnName)}`;
      conditions.push(sql`${aliasedColumn} = ${value}`);
    }

    return conditions;
  }

  /**
   * Register a join to the collection
   */
  private registerJoin(
    sourceAlias: string,
    targetTable: Table,
    targetAlias: string,
    sourceCol: string,
    targetCol: string,
    type?: "left" | "right" | "inner" | "full",
    composite?: Array<{ field: string; column: string }>
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
        conditions.push({ sourceCol: c.field, targetCol: c.column });
      }
    }

    this.joins.set(targetAlias, {
      type: type ?? "left",
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
    const joinClauses: SQL[] = [];

    for (const join of this.joins.values()) {
      const conditionParts = join.conditions.map((c) =>
        sql`${sql.identifier(join.sourceAlias)}.${sql.identifier(c.sourceCol)} = ${sql.identifier(join.targetAlias)}.${sql.identifier(c.targetCol)}`
      );

      const conditionSql = conditionParts.length === 1
        ? conditionParts[0]
        : sql.join(conditionParts, sql` AND `);

      const joinSql = buildJoinSql(
        join.type,
        join.targetTable,
        join.targetAlias,
        conditionSql
      );
      joinClauses.push(joinSql);
    }

    return joinClauses;
  }

  /**
   * Get a column from a table by name
   */
  private getColumn(table: Table, name: string): Column | undefined {
    // Access column directly as property on the table object
    return (table as unknown as Record<string, Column | unknown>)[name] as Column | undefined;
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
  buildSelectSql(input: SchemaInput<T, F> | undefined | null): SQL {
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

      const joinSql = buildJoinSql(
        join.type,
        join.targetTable,
        join.targetAlias,
        onCondition
      );
      joinParts.push(joinSql);
    }

    const joinsSql = joinParts.length > 0
      ? sql.join(joinParts, sql` `)
      : sql``;

    // Build WHERE clause
    const whereSql = where ? sql`WHERE ${where}` : sql``;

    // Build ORDER BY clause
    let orderSql = sql``;
    if (input?.order && input.order.length > 0) {
      const orderBySql = this.buildOrderBySqlWithJoins(input.order);
      if (orderBySql) {
        orderSql = sql` ORDER BY ${orderBySql}`;
      }
    }

    // Build SELECT clause with nested field support
    const selectSql = this.buildSelectFieldsSql(input?.select as string[] | undefined, tableAlias);

    // Build full query
    return sql`SELECT ${selectSql} FROM ${fromSql} ${joinsSql}${whereSql}${orderSql} LIMIT ${limit} OFFSET ${offset}`;
  }

  /**
   * Build SELECT fields SQL supporting nested fields (e.g., "items.product.price")
   * Returns "t0.*" if no fields specified, otherwise returns comma-separated field list
   */
  private buildSelectFieldsSql(
    fields: string[] | undefined,
    defaultTableAlias: string
  ): SQL {
    if (!fields || fields.length === 0) {
      return sql`${sql.identifier(defaultTableAlias)}.*`;
    }

    const selectParts: SQL[] = [];

    for (const field of fields) {
      const parts = field.split(".");
      const fieldSql = this.resolveSelectField(parts, this.schema, 0);
      if (fieldSql) {
        selectParts.push(fieldSql);
      }
    }

    if (selectParts.length === 0) {
      return sql`${sql.identifier(defaultTableAlias)}.*`;
    }

    return sql.join(selectParts, sql`, `);
  }

  /**
   * Resolve select field path to SQL with correct table alias
   * Returns "alias"."column" AS "fieldPath"
   */
  private resolveSelectField(
    parts: string[],
    schema: ObjectSchema,
    depth: number
  ): SQL | undefined {
    if (parts.length === 0) return undefined;

    const [fieldName, ...rest] = parts;
    const fieldConfig = schema.getField(fieldName);

    if (!fieldConfig) {
      // Direct column on current table
      const tableAlias = tablePrefix(schema.tableName, depth);
      const columnSql = sql`${sql.identifier(tableAlias)}.${sql.identifier(fieldName)}`;
      const alias = parts.length > 1 ? parts.join("_") : undefined;
      return alias ? sql`${columnSql} AS ${sql.identifier(alias)}` : columnSql;
    }

    if (fieldConfig.join && rest.length > 0) {
      // Nested field - recurse into join
      const childSchema = fieldConfig.join.schema();
      return this.resolveSelectField(rest, childSchema, depth + 1);
    }

    // Field on current table
    const tableAlias = tablePrefix(schema.tableName, depth);
    const columnName = fieldConfig.column;

    if (fieldConfig.join && fieldConfig.join.select && fieldConfig.join.select.length > 0) {
      // Field with select - use child table alias and first select field
      const childSchema = fieldConfig.join.schema();
      const childAlias = tablePrefix(childSchema.tableName, depth + 1);
      const selectField = fieldConfig.join.select[0];
      const selectFieldConfig = childSchema.getField(selectField);
      const selectColumnName = selectFieldConfig?.column ?? selectField;
      const columnSql = sql`${sql.identifier(childAlias)}.${sql.identifier(selectColumnName)}`;
      if (fieldConfig.alias) {
        return sql`${columnSql} AS ${sql.identifier(fieldConfig.alias)}`;
      }
      return columnSql;
    }

    // Simple field - only use alias if explicitly specified in schema
    const columnSql = sql`${sql.identifier(tableAlias)}.${sql.identifier(columnName)}`;
    return fieldConfig.alias ? sql`${columnSql} AS ${sql.identifier(fieldConfig.alias)}` : columnSql;
  }

  /**
   * Build ORDER BY SQL supporting nested fields (e.g., "items.product.price:desc")
   */
  private buildOrderBySqlWithJoins(orders: string[]): SQL | undefined {
    if (!orders || orders.length === 0) return undefined;

    const orderParts: SQL[] = [];

    for (const order of orders) {
      // Parse "field:direction" format
      let fieldPath: string;
      let direction: OrderDirection = "asc";

      const colonMatch = order.match(/^(.+):(asc|desc)$/i);
      if (colonMatch) {
        fieldPath = colonMatch[1];
        direction = colonMatch[2].toLowerCase() as OrderDirection;
      } else {
        const suffixMatch = order.match(/^(.+?)(ASC|DESC)$/);
        if (suffixMatch) {
          fieldPath = suffixMatch[1];
          direction = suffixMatch[2].toLowerCase() as OrderDirection;
        } else {
          fieldPath = order;
        }
      }

      // Parse nested path (e.g., "items.product.category.slug")
      const parts = fieldPath.split(".");
      const orderSql = this.resolveOrderField(parts, this.schema, 0, direction);
      if (orderSql) {
        orderParts.push(orderSql);
      }
    }

    if (orderParts.length === 0) return undefined;
    return sql.join(orderParts, sql`, `);
  }

  /**
   * Resolve order field path to SQL with correct table alias
   */
  private resolveOrderField(
    parts: string[],
    schema: ObjectSchema,
    depth: number,
    direction: OrderDirection
  ): SQL | undefined {
    if (parts.length === 0) return undefined;

    const [fieldName, ...rest] = parts;
    const fieldConfig = schema.getField(fieldName);

    if (!fieldConfig) {
      // Direct column on current table
      const tableAlias = tablePrefix(schema.tableName, depth);
      const dirSql = direction === "desc" ? sql`DESC` : sql`ASC`;
      return sql`${sql.identifier(tableAlias)}.${sql.identifier(fieldName)} ${dirSql}`;
    }

    if (fieldConfig.join && rest.length > 0) {
      // Nested field - recurse into join
      const childSchema = fieldConfig.join.schema();
      return this.resolveOrderField(rest, childSchema, depth + 1, direction);
    }

    // Field on current table (possibly with join for select)
    const tableAlias = tablePrefix(schema.tableName, depth);
    const columnName = fieldConfig.column;

    if (fieldConfig.join && fieldConfig.join.select && fieldConfig.join.select.length > 0) {
      // Field with select - use child table alias and first select field
      const childSchema = fieldConfig.join.schema();
      const childAlias = tablePrefix(childSchema.tableName, depth + 1);
      const selectField = fieldConfig.join.select[0];
      const selectFieldConfig = childSchema.getField(selectField);
      const selectColumnName = selectFieldConfig?.column ?? selectField;
      const dirSql = direction === "desc" ? sql`DESC` : sql`ASC`;
      return sql`${sql.identifier(childAlias)}.${sql.identifier(selectColumnName)} ${dirSql}`;
    }

    const dirSql = direction === "desc" ? sql`DESC` : sql`ASC`;
    return sql`${sql.identifier(tableAlias)}.${sql.identifier(columnName)} ${dirSql}`;
  }

  /**
   * Process full Input object (analogous to goqutil.SetInput)
   * Returns all query components including joins
   */
  fromInput(input: SchemaInput<T, F> | undefined | null): {
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
    if (input.order && input.order.length > 0) {
      orderBy = this.parseMultiOrder(input.order);
    }

    // Build pagination
    const { limit, offset } = this.pagination({
      limit: input.limit,
      offset: input.offset,
    });

    // Build selection
    const selection = this.select(input.select);

    return { where, joins, orderBy, limit, offset, select: selection };
  }

  /**
   * Build ORDER BY SQL from parsed order string with aliased columns
   */
  private buildParsedOrderSqlWithAlias(
    order: string | undefined | null,
    tableAlias: string
  ): SQL | undefined {
    if (!order) return undefined;

    let field: string;
    let direction: OrderDirection = "asc";

    // Try "field:direction" format
    const colonMatch = order.match(/^(.+):(asc|desc)$/i);
    if (colonMatch) {
      field = colonMatch[1];
      direction = colonMatch[2].toLowerCase() as OrderDirection;
    } else {
      // Try "fieldASC" / "fieldDESC" format
      const suffixMatch = order.match(/^(.+?)(ASC|DESC)$/);
      if (suffixMatch) {
        field = suffixMatch[1];
        direction = suffixMatch[2].toLowerCase() as OrderDirection;
      } else {
        // Default: field name with asc
        field = order;
      }
    }

    const dirSql = direction === "desc" ? sql`DESC` : sql`ASC`;
    return sql`${sql.identifier(tableAlias)}.${sql.identifier(field)} ${dirSql}`;
  }

  /**
   * Build ORDER BY SQL from multiple order strings with aliased columns
   */
  private buildMultiOrderSqlWithAlias(
    orders: string[] | undefined | null,
    tableAlias: string
  ): SQL | undefined {
    if (!orders || orders.length === 0) return undefined;

    const orderParts: SQL[] = [];
    for (const order of orders) {
      const orderSql = this.buildParsedOrderSqlWithAlias(order, tableAlias);
      if (orderSql) {
        orderParts.push(orderSql);
      }
    }

    if (orderParts.length === 0) {
      return undefined;
    }

    return sql.join(orderParts, sql`, `);
  }

  /**
   * Build a complete Drizzle query ready for execution
   * Returns typed results based on the table schema
   *
   * Uses raw SQL with proper table aliases for all queries.
   *
   * @example
   * ```ts
   * const qb = createQueryBuilder(productSchema);
   *
   * // Get ready query - results are typed as Product[]
   * const results = await qb.query(db, {
   *   where: { title: { $iLike: "%phone%" } },
   *   limit: 20,
   * });
   * ```
   */
  async query(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db: { execute: (query: SQL) => Promise<any> },
    input?: SchemaInput<T, F> | null
  ): Promise<T["$inferSelect"][]> {
    const { where, joins, limit, offset } = this.fromInput(input);
    const mainAlias = tablePrefix(this.schema.tableName, 0);

    // Build FROM clause with alias
    const fromSql = sql`${this.schema.table} AS ${sql.identifier(mainAlias)}`;

    // Build JOIN clauses with aliased ON conditions
    const joinParts: SQL[] = [];
    for (const join of joins) {
      const onConditions = join.conditions.map((c) =>
        sql`${sql.identifier(join.sourceAlias)}.${sql.identifier(c.sourceCol)} = ${sql.identifier(join.targetAlias)}.${sql.identifier(c.targetCol)}`
      );

      const onCondition = onConditions.length === 1
        ? onConditions[0]
        : sql.join(onConditions, sql` AND `);

      const joinSql = buildJoinSql(
        join.type,
        join.targetTable,
        join.targetAlias,
        onCondition
      );
      joinParts.push(joinSql);
    }

    const joinsSql = joinParts.length > 0
      ? sql` ${sql.join(joinParts, sql` `)}`
      : sql``;

    // Build WHERE clause
    const whereSql = where ? sql` WHERE ${where}` : sql``;

    // Build ORDER BY clause with aliases
    let orderSql = sql``;
    if (input?.order && input.order.length > 0) {
      const orderBySql = this.buildMultiOrderSqlWithAlias(input.order, mainAlias);
      if (orderBySql) {
        orderSql = sql` ORDER BY ${orderBySql}`;
      }
    }

    // Build full query with raw SQL
    const fullQuery = sql`SELECT ${sql.identifier(mainAlias)}.* FROM ${fromSql}${joinsSql}${whereSql}${orderSql} LIMIT ${limit} OFFSET ${offset}`;

    const result = await db.execute(fullQuery);

    // Handle different result formats from db.execute
    if (Array.isArray(result)) {
      return result as T["$inferSelect"][];
    }
    if (result && typeof result === "object" && "rows" in result) {
      return (result as { rows: T["$inferSelect"][] }).rows;
    }
    return [];
  }
}

/**
 * Create a new query builder from schema
 */
export function createQueryBuilder<T extends Table, F extends string>(
  schema: ObjectSchema<T, F>,
  config?: QueryBuilderConfig
): QueryBuilder<T, F> {
  return new QueryBuilder(schema, config);
}

/**
 * Apply joins to a Drizzle query using leftJoin
 *
 * @example
 * ```ts
 * const translationSchema = createSchema({
 *   table: translation,
 *   tableName: "translation",
 *   fields: {
 *     entityId: { column: "entity_id" },
 *     value: { column: "value" },
 *   }
 * });
 *
 * const productSchema = createSchema({
 *   table: product,
 *   tableName: "product",
 *   fields: {
 *     id: { column: "id" },
 *     title: {
 *       column: "id",
 *       join: {
 *         type: "left",
 *         schema: () => translationSchema,
 *         column: "entityId",
 *         select: ["value"],
 *       }
 *     }
 *   }
 * });
 *
 * const qb = createQueryBuilder(productSchema);
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
export function applyJoins<Q extends JoinableQuery>(
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

    const tableSql = sql`${join.targetTable} AS ${sql.identifier(join.targetAlias)}`;
    result = applyJoinByType(result, join.type, tableSql, onCondition) as Q;
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
