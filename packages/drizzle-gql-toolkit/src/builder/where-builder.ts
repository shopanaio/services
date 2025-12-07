import { and, eq, or, type SQL, type Column, type Table } from "drizzle-orm";
import {
  buildOperatorCondition,
  isFilterObject,
  validateFilterValue,
} from "../operators.js";
import {
  ObjectSchema,
  tablePrefix,
  type FieldConfig,
  type JoinInfo,
} from "../schema.js";
import type { FieldsDef, NestedWhereInput } from "../types.js";
import { JoinCollector } from "./join-collector.js";
import {
  InvalidFilterError,
  JoinDepthExceededError,
  UnknownFieldError,
} from "../errors.js";

export type WhereResult = {
  sql: SQL | undefined;
  joins: JoinInfo[];
};

export class WhereBuilder<
  Fields extends FieldsDef,
> {
  constructor(
    private readonly schema: ObjectSchema<Table, string, Fields>,
    private readonly joinCollector: JoinCollector,
    private readonly maxDepth: number
  ) {}

  build(input: NestedWhereInput<Fields> | undefined | null): WhereResult {
    if (!input || Object.keys(input).length === 0) {
      return {
        sql: undefined,
        joins: [],
      };
    }

    this.joinCollector.ensureMainAlias(this.schema.tableName);
    const conditions = this.buildWhereConditions(
      input as NestedWhereInput<FieldsDef>,
      this.schema,
      0
    );
    const sql = conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : and(...conditions);

    return {
      sql,
      joins: this.joinCollector.getJoins(),
    };
  }

  private buildWhereConditions(
    input: NestedWhereInput<FieldsDef>,
    schema: ObjectSchema,
    depth: number
  ): SQL[] {
    if (depth >= this.maxDepth) {
      throw new JoinDepthExceededError(depth, this.maxDepth);
    }

    const conditions: SQL[] = [];
    const tableAlias = tablePrefix(schema.tableName, depth);
    this.joinCollector.getOrCreateAliasedTable(schema.table, tableAlias);

    for (const [key, rawValue] of Object.entries(input)) {
      if (rawValue === undefined) {
        continue;
      }

      if (key === "$and" && Array.isArray(rawValue)) {
        for (const nested of rawValue) {
          const nestedConditions = this.buildWhereConditions(
            nested as NestedWhereInput<FieldsDef>,
            schema,
            depth
          );
          conditions.push(...nestedConditions);
        }
        continue;
      }

      if (key === "$or" && Array.isArray(rawValue)) {
        const orConditions: SQL[] = [];
        for (const nested of rawValue) {
          const nestedConditions = this.buildWhereConditions(
            nested as NestedWhereInput<FieldsDef>,
            schema,
            depth
          );
          if (nestedConditions.length === 1) {
            orConditions.push(nestedConditions[0]);
          } else if (nestedConditions.length > 1) {
            orConditions.push(and(...nestedConditions));
          }
        }
        if (orConditions.length > 0) {
          conditions.push(or(...orConditions));
        }
        continue;
      }

      if (key.startsWith("$")) {
        continue;
      }

      const fieldConfig = schema.getField(key);
      if (!fieldConfig) {
        throw new UnknownFieldError(key);
      }

      const aliasedTable = this.joinCollector.requireAliasedTable(tableAlias);
      const column = this.joinCollector.getAliasedColumn(
        aliasedTable,
        fieldConfig.column
      );

      if (fieldConfig.join && this.isNestedObject(rawValue)) {
        const nestedSql = this.buildNestedJoinConditions(
          fieldConfig,
          schema,
          depth,
          rawValue as NestedWhereInput<FieldsDef>
        );
        conditions.push(...nestedSql);
      } else {
        const fieldConditions = this.buildFieldConditions(
          key,
          column,
          rawValue
        );
        conditions.push(...fieldConditions);
      }
    }

    return conditions;
  }

  private buildNestedJoinConditions(
    fieldConfig: FieldConfig,
    parentSchema: ObjectSchema,
    depth: number,
    nestedInput: NestedWhereInput<FieldsDef>
  ): SQL[] {
    const join = fieldConfig.join!;
    const childSchema = join.schema();
    const childAlias = tablePrefix(childSchema.tableName, depth + 1);

    const joinFieldConfig = childSchema.getField(join.column);
    const targetColumn = joinFieldConfig?.column ?? join.column;

    this.joinCollector.registerJoin(
      tablePrefix(parentSchema.tableName, depth),
      childSchema.table,
      childAlias,
      fieldConfig.column,
      targetColumn,
      join.type,
      join.composite
    );

    return this.buildWhereConditions(
      nestedInput,
      childSchema,
      depth + 1
    );
  }

  private buildFieldConditions(
    fieldName: string,
    column: Column,
    value: unknown
  ): SQL[] {
    if (isFilterObject(value)) {
      const conditions: SQL[] = [];
      for (const [opKey, opVal] of Object.entries(value)) {
        const validation = validateFilterValue(opKey, opVal);
        if (!validation.valid) {
          throw new InvalidFilterError(
            fieldName,
            validation.reason ?? "Invalid filter value"
          );
        }
        const condition = buildOperatorCondition(column, opKey, opVal);
        if (!condition) {
          throw new InvalidFilterError(
            fieldName,
            `Invalid value for operator "${opKey}"`
          );
        }
        conditions.push(condition);
      }
      return conditions;
    }

    return [eq(column, value)];
  }

  private isNestedObject(value: unknown): value is Record<string, unknown> {
    return (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      !isFilterObject(value)
    );
  }
}
