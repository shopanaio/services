import { sql, type SQL, type Table } from "drizzle-orm";
import {
  ObjectSchema,
  tablePrefix,
  type FieldConfig,
} from "../schema.js";
import type { FieldsDef, OrderDirection, NullsOrder, OrderByItem } from "../types.js";
import { JoinCollector } from "./join-collector.js";
import { JoinDepthExceededError, UnknownFieldError } from "../errors.js";

export class OrderBuilder<
  Fields extends FieldsDef,
> {
  constructor(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly schema: ObjectSchema<Table, string, Fields, any>,
    private readonly joinCollector: JoinCollector,
    private readonly maxDepth: number
  ) {}

  build(orders: OrderByItem<string>[] | undefined | null): SQL | undefined {
    if (!orders || orders.length === 0) {
      return undefined;
    }

    this.joinCollector.ensureMainAlias(this.schema.tableName);

    const parts: SQL[] = [];
    for (const orderItem of orders) {
      const resolved = this.resolveOrderField(
        orderItem.field.split("."),
        this.schema,
        0,
        orderItem.direction,
        orderItem.nulls
      );
      if (resolved) {
        parts.push(resolved);
      }
    }

    return parts.length > 0 ? sql.join(parts, sql`, `) : undefined;
  }

  private resolveOrderField(
    parts: string[],
    schema: ObjectSchema,
    depth: number,
    direction: OrderDirection,
    nulls?: NullsOrder
  ): SQL | undefined {
    if (parts.length === 0) {
      return undefined;
    }

    const [fieldName, ...rest] = parts;
    const fieldConfig = schema.getField(fieldName);
    if (!fieldConfig) {
      throw new UnknownFieldError(fieldName);
    }

    if (depth >= this.maxDepth) {
      throw new JoinDepthExceededError(depth, this.maxDepth);
    }

    const tableAlias = tablePrefix(schema.tableName, depth);
    this.joinCollector.getOrCreateAliasedTable(schema.table, tableAlias);

    if (fieldConfig.join && rest.length > 0) {
      const childSchema = fieldConfig.join.schema();
      const childAlias = tablePrefix(childSchema.tableName, depth + 1);
      const joinFieldConfig = childSchema.getField(fieldConfig.join.column);
      const joinColumn = joinFieldConfig?.column ?? fieldConfig.join.column;

      this.joinCollector.registerJoin(
        tableAlias,
        childSchema.table,
        childAlias,
        fieldConfig.column,
        joinColumn,
        fieldConfig.join.type,
        fieldConfig.join.composite
      );

      return this.resolveOrderField(rest, childSchema, depth + 1, direction, nulls);
    }

    return this.buildOrderExpression(fieldConfig, tableAlias, direction, nulls);
  }

  private buildOrderExpression(
    fieldConfig: FieldConfig,
    tableAlias: string,
    direction: OrderDirection,
    nulls?: NullsOrder
  ): SQL {
    const dirSql = direction === "desc" ? sql`DESC` : sql`ASC`;
    const colSql = sql`${sql.identifier(tableAlias)}.${sql.identifier(fieldConfig.column)} ${dirSql}`;

    if (nulls === "first") {
      return sql`${colSql} NULLS FIRST`;
    } else if (nulls === "last") {
      return sql`${colSql} NULLS LAST`;
    }

    return colSql;
  }
}
