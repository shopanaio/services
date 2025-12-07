import {
  aliasedTable,
  getTableColumns,
  type Column,
  type Table,
} from "drizzle-orm";
import {
  ObjectSchema,
  tablePrefix,
  type AliasedTable,
  type JoinInfo,
} from "../schema.js";
import {
  JoinDepthExceededError,
  QueryBuilderError,
  UnknownFieldError,
} from "../errors.js";

export type JoinCollectorContext = {
  joins: Map<string, JoinInfo>;
  aliases: Map<string, AliasedTable>;
};

export function createJoinCollectorContext(): JoinCollectorContext {
  return {
    joins: new Map(),
    aliases: new Map(),
  };
}

export class JoinCollector {
  constructor(
    private readonly schemaTable: Table,
    private readonly context: JoinCollectorContext = createJoinCollectorContext()
  ) {}
  private readonly processedPaths = new Set<string>();

  ensureMainAlias(tableName: string): AliasedTable {
    const alias = tablePrefix(tableName, 0);
    return this.getOrCreateAliasedTable(this.schemaTable, alias);
  }

  getOrCreateAliasedTable(table: Table, alias: string): AliasedTable {
    const existing = this.context.aliases.get(alias);
    if (existing) {
      return existing;
    }

    const aliased = aliasedTable(table, alias) as AliasedTable;
    this.context.aliases.set(alias, aliased);
    return aliased;
  }

  requireAliasedTable(alias: string): AliasedTable {
    const table = this.context.aliases.get(alias);
    if (!table) {
      throw new QueryBuilderError(
        `Aliased table "${alias}" was not registered`,
        "ALIASED_TABLE_MISSING"
      );
    }
    return table;
  }

  getAliasedColumn(table: AliasedTable, columnName: string): Column {
    const direct = table[columnName as keyof typeof table];
    if (direct && typeof direct === "object") {
      return direct as Column;
    }

    const columns = getTableColumns(table);
    if (columnName in columns) {
      return columns[columnName as keyof typeof columns] as Column;
    }

    for (const column of Object.values(columns)) {
      if ((column as Column).name === columnName) {
        return column as Column;
      }
    }

    throw new QueryBuilderError(
      `Column "${columnName}" was not found on aliased table`,
      "COLUMN_NOT_FOUND"
    );
  }

  registerJoin(
    sourceAlias: string,
    targetTable: Table,
    targetAlias: string,
    sourceCol: string,
    targetCol: string,
    type?: JoinInfo["type"],
    composite?: Array<{ field: string; column: string }>
  ): void {
    if (this.context.joins.has(targetAlias)) {
      return;
    }

    const sourceTable = this.requireAliasedTable(sourceAlias);
    const targetAliased = this.getOrCreateAliasedTable(targetTable, targetAlias);

    const conditions: JoinInfo["conditions"] = [
      { sourceCol, targetCol },
    ];

    if (composite) {
      for (const { field, column } of composite) {
        conditions.push({ sourceCol: field, targetCol: column });
      }
    }

    this.context.joins.set(targetAlias, {
      type: type ?? "left",
      sourceTable,
      targetTable: targetAliased,
      conditions,
    });
  }

  getJoins(): JoinInfo[] {
    return Array.from(this.context.joins.values());
  }

  collectJoinsForFieldPath(
    fieldPath: string,
    schema: ObjectSchema,
    depth: number,
    maxDepth?: number
  ): void {
    if (this.processedPaths.has(fieldPath)) {
      return;
    }
    this.processedPaths.add(fieldPath);

    const parts = fieldPath.split(".");
    schema.resolveFieldPath(fieldPath);
    if (parts.length <= 1) {
      return;
    }

    let currentSchema: ObjectSchema = schema;
    let currentDepth = depth;

    for (let i = 0; i < parts.length - 1; i++) {
      const fieldName = parts[i];
      const fieldConfig = currentSchema.getField(fieldName);
      if (!fieldConfig) {
        throw new UnknownFieldError(fieldName);
      }

      if (!fieldConfig.join) {
        return;
      }

      if (maxDepth !== undefined && currentDepth >= maxDepth) {
        throw new JoinDepthExceededError(currentDepth, maxDepth);
      }

      const childSchema = fieldConfig.join.schema();
      const sourceAlias = tablePrefix(currentSchema.tableName, currentDepth);
      const childAlias = tablePrefix(childSchema.tableName, currentDepth + 1);
      const joinFieldConfig = childSchema.getField(fieldConfig.join.column);
      const joinColumn = joinFieldConfig?.column ?? fieldConfig.join.column;

      this.getOrCreateAliasedTable(currentSchema.table, sourceAlias);
      this.registerJoin(
        sourceAlias,
        childSchema.table,
        childAlias,
        fieldConfig.column,
        joinColumn,
        fieldConfig.join.type,
        fieldConfig.join.composite
      );

      currentSchema = childSchema;
      currentDepth += 1;
    }
  }

  getContext(): JoinCollectorContext {
    return this.context;
  }
}
