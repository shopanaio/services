import {
  aliasedTable,
  getTableColumns,
  sql as rawSql,
  type Column,
  type SQL,
  type Table,
} from "drizzle-orm";
import type { Selectable } from "../types.js";
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

/**
 * Symbol for accessing view base config
 */
const DrizzleViewBaseConfig = Symbol.for("drizzle:ViewBaseConfig");

/**
 * Symbol for accessing table/view name (alias)
 */
const DrizzleName = Symbol.for("drizzle:Name");

/**
 * View base config structure
 */
interface ViewBaseConfig {
  name: string;
  originalName: string;
  schema?: string;
  selectedFields: Record<string, unknown>;
  isAlias?: boolean;
}

/**
 * SQL.Aliased structure from Drizzle
 */
interface SQLAliased {
  fieldAlias: string;
  sql?: SQL;
}

/**
 * Check if value is SQL.Aliased
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
 * Check if the table is a view (not a table with isAlias=true)
 */
function isAliasedView(table: AliasedTable): boolean {
  const asRecord = table as unknown as Record<symbol, ViewBaseConfig | undefined>;
  const config = asRecord[DrizzleViewBaseConfig];
  // It's a view if ViewBaseConfig exists, has selectedFields, and is NOT just an aliased table
  return (
    config !== undefined &&
    config.selectedFields !== undefined &&
    !config.isAlias
  );
}

/**
 * Get the alias name from aliased table
 */
function getTableAlias(table: AliasedTable): string {
  const asRecord = table as unknown as Record<symbol, string | undefined>;
  return asRecord[DrizzleName] ?? "";
}

/**
 * Get view selected fields from aliased view
 */
function getViewSelectedFields(table: AliasedTable): Record<string, unknown> | undefined {
  const asRecord = table as unknown as Record<symbol, ViewBaseConfig | undefined>;
  return asRecord[DrizzleViewBaseConfig]?.selectedFields;
}

/**
 * Create a column-like object from table alias and column name.
 * This creates a SQL fragment that will render as "alias"."column".
 */
function createAliasedColumnRef(tableAlias: string, columnName: string): Column {
  // Create a column-like object that Drizzle can use in operators
  const sqlRef = rawSql`${rawSql.identifier(tableAlias)}.${rawSql.identifier(columnName)}`;
  // Return SQL wrapped in a way Drizzle expects for operators
  return sqlRef as unknown as Column;
}

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
    private readonly schemaTable: Selectable,
    private readonly context: JoinCollectorContext = createJoinCollectorContext()
  ) {}
  private readonly processedPaths = new Set<string>();

  ensureMainAlias(tableName: string): AliasedTable {
    const alias = tablePrefix(tableName, 0);
    return this.getOrCreateAliasedTable(this.schemaTable, alias);
  }

  getOrCreateAliasedTable(table: Selectable, alias: string): AliasedTable {
    const existing = this.context.aliases.get(alias);
    if (existing) {
      return existing;
    }

    // aliasedTable works with both Table and View in Drizzle ORM
    const aliased = aliasedTable(table as Table, alias) as AliasedTable;
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
    const tableAlias = getTableAlias(table);

    // Try direct property access first (works for aliased table columns)
    const direct = table[columnName as keyof typeof table];
    if (direct && typeof direct === "object" && !isSQLAliased(direct)) {
      return direct as Column;
    }

    // For views, we need to look at selectedFields
    if (isAliasedView(table)) {
      const selectedFields = getViewSelectedFields(table);
      if (selectedFields) {
        // Try exact match on field key
        if (columnName in selectedFields) {
          const field = selectedFields[columnName];
          if (field && typeof field === "object") {
            // For SQL.Aliased fields, create an aliased column reference
            if (isSQLAliased(field)) {
              return createAliasedColumnRef(tableAlias, field.fieldAlias);
            }
            // For regular columns from views, check if it has table alias
            const col = field as Column;
            // If column doesn't have proper alias, create one
            return direct || createAliasedColumnRef(tableAlias, col.name);
          }
        }
        // Try matching by column name (for fieldAlias or .name)
        for (const [key, field] of Object.entries(selectedFields)) {
          if (field && typeof field === "object") {
            const f = field as { name?: string; fieldAlias?: string };
            const actualName = f.fieldAlias ?? f.name;
            if (actualName === columnName) {
              // For SQL.Aliased fields, create an aliased column reference
              if (isSQLAliased(field)) {
                return createAliasedColumnRef(tableAlias, f.fieldAlias!);
              }
              // Check if direct property access with key gives aliased column
              const directByKey = table[key as keyof typeof table];
              if (directByKey && typeof directByKey === "object" && !isSQLAliased(directByKey)) {
                return directByKey as Column;
              }
              return createAliasedColumnRef(tableAlias, actualName);
            }
          }
        }
      }
    }

    // For tables, use getTableColumns
    try {
      const columns = getTableColumns(table);
      if (columnName in columns) {
        return columns[columnName as keyof typeof columns] as Column;
      }

      for (const column of Object.values(columns)) {
        if ((column as Column).name === columnName) {
          return column as Column;
        }
      }
    } catch {
      // getTableColumns may throw for views, ignore and fall through
    }

    // Last resort: create an aliased reference manually
    if (tableAlias) {
      return createAliasedColumnRef(tableAlias, columnName);
    }

    throw new QueryBuilderError(
      `Column "${columnName}" was not found on aliased table`,
      "COLUMN_NOT_FOUND"
    );
  }

  registerJoin(
    sourceAlias: string,
    targetTable: Selectable,
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
