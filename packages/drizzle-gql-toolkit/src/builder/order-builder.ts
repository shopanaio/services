import { sql, type SQL, type Table } from "drizzle-orm";
import {
  ObjectSchema,
  tablePrefix,
  type FieldConfig,
} from "../schema.js";
import type { FieldsDef } from "../types.js";
import { JoinCollector } from "./join-collector.js";
import { JoinDepthExceededError, UnknownFieldError } from "../errors.js";

type OrderDirection = "asc" | "desc";

export class OrderBuilder<
  Fields extends FieldsDef,
> {
  constructor(
    private readonly schema: ObjectSchema<Table, string, Fields>,
    private readonly joinCollector: JoinCollector,
    private readonly maxDepth: number
  ) {}

  build(orders: string[] | undefined | null): SQL | undefined {
    if (!orders || orders.length === 0) {
      return undefined;
    }

    this.joinCollector.ensureMainAlias(this.schema.tableName);

    const parts: SQL[] = [];
    for (const order of orders) {
      const { path, direction } = this.parseOrder(order);
      const resolved = this.resolveOrderField(
        path.split("."),
        this.schema,
        0,
        direction
      );
      if (resolved) {
        parts.push(resolved);
      }
    }

    return parts.length > 0 ? sql.join(parts, sql`, `) : undefined;
  }

  private parseOrder(order: string): { path: string; direction: OrderDirection } {
    const colonMatch = order.match(/^(.+):(asc|desc)$/i);
    if (colonMatch) {
      return {
        path: colonMatch[1],
        direction: colonMatch[2].toLowerCase() as OrderDirection,
      };
    }

    const suffixMatch = order.match(/^(.+?)(ASC|DESC)$/);
    if (suffixMatch) {
      return {
        path: suffixMatch[1],
        direction: suffixMatch[2].toLowerCase() as OrderDirection,
      };
    }

    return { path: order, direction: "asc" };
  }

  private resolveOrderField(
    parts: string[],
    schema: ObjectSchema,
    depth: number,
    direction: OrderDirection
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

      return this.resolveOrderField(rest, childSchema, depth + 1, direction);
    }

    return this.buildOrderExpression(fieldConfig, tableAlias, direction);
  }

  private buildOrderExpression(
    fieldConfig: FieldConfig,
    tableAlias: string,
    direction: OrderDirection
  ): SQL {
    const dirSql = direction === "desc" ? sql`DESC` : sql`ASC`;
    return sql`${sql.identifier(tableAlias)}.${sql.identifier(fieldConfig.column)} ${dirSql}`;
  }
}
