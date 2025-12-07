import { and, eq, sql, type SQL, type Table } from "drizzle-orm";
import {
  ObjectSchema,
  tablePrefix,
  type JoinInfo,
  type AliasedTable,
} from "../schema.js";
import type { FieldsDef } from "../types.js";
import { JoinCollector } from "./join-collector.js";

const JOIN_KEYWORDS = {
  left: "LEFT JOIN",
  right: "RIGHT JOIN",
  inner: "INNER JOIN",
  full: "FULL JOIN",
} as const;

// Drizzle ORM symbols for accessing table metadata
const TableSymbols = {
  Name: Symbol.for("drizzle:Name"),
  OriginalName: Symbol.for("drizzle:OriginalName"),
  Schema: Symbol.for("drizzle:Schema"),
} as const;

const ALIASED_TABLE_SQL_CACHE = new WeakMap<AliasedTable, SQL>();

export function formatAliasedTableReference(targetAliased: AliasedTable): SQL {
  const cached = ALIASED_TABLE_SQL_CACHE.get(targetAliased);
  if (cached) {
    return cached;
  }

  const tableAny = targetAliased as unknown as Record<symbol, string | undefined>;
  const alias = tableAny[TableSymbols.Name] ?? "";
  const originalName = tableAny[TableSymbols.OriginalName] ?? alias;
  const schemaName = tableAny[TableSymbols.Schema];

  const tableIdentifier = schemaName
    ? sql`${sql.identifier(schemaName)}.${sql.identifier(originalName)}`
    : sql`${sql.identifier(originalName)}`;

  const formatted = sql`${tableIdentifier} AS ${sql.identifier(alias)}`;
  ALIASED_TABLE_SQL_CACHE.set(targetAliased, formatted);
  return formatted;
}

export function buildJoinSql(
  joinType: JoinInfo["type"],
  targetAliased: AliasedTable,
  onCondition: SQL
): SQL {
  const keyword = JOIN_KEYWORDS[joinType];
  const tableSql = formatAliasedTableReference(targetAliased);
  return sql`${sql.raw(keyword)} ${tableSql} ON ${onCondition}`;
}

type RenderOptions = {
  select?: string[];
  orderSql?: SQL;
  whereSql?: SQL;
  limit: number;
  offset: number;
};

export class SqlRenderer<
  Fields extends FieldsDef,
> {
  constructor(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly schema: ObjectSchema<Table, string, Fields, any>,
    private readonly joinCollector: JoinCollector
  ) {}

  render(options: RenderOptions): SQL {
    const mainAlias = tablePrefix(this.schema.tableName, 0);
    const mainAliased = this.joinCollector.getOrCreateAliasedTable(
      this.schema.table,
      mainAlias
    );

    const selectSql = this.buildSelectFieldsSql(
      options.select,
      mainAlias,
      this.schema,
      0
    );

    const fromSql = formatAliasedTableReference(mainAliased);
    const joinParts = this.buildJoinClauses(this.joinCollector.getJoins());
    const joinsSql = joinParts.length > 0 ? sql` ${sql.join(joinParts, sql` `)}` : sql``;
    const whereSql = options.whereSql ? sql` WHERE ${options.whereSql}` : sql``;
    const orderSql = options.orderSql ? sql` ORDER BY ${options.orderSql}` : sql``;

    return sql`SELECT ${selectSql} FROM ${fromSql}${joinsSql}${whereSql}${orderSql} LIMIT ${options.limit} OFFSET ${options.offset}`;
  }

  private buildSelectFieldsSql(
    fields: string[] | undefined,
    defaultAlias: string,
    schema: ObjectSchema,
    depth: number
  ): SQL {
    if (!fields || fields.length === 0) {
      return sql`${sql.identifier(defaultAlias)}.*`;
    }

    // Check for duplicate field aliases
    const usedAliases = new Set<string>();
    for (const field of fields) {
      if (usedAliases.has(field)) {
        throw new Error(`Duplicate field "${field}" in select`);
      }
      usedAliases.add(field);
    }

    const selectParts: SQL[] = [];
    for (const field of fields) {
      const parts = field.split(".");
      const resolved = this.resolveSelectField(parts, field, schema, depth);
      if (resolved) {
        selectParts.push(resolved);
      }
    }

    if (selectParts.length === 0) {
      return sql`${sql.identifier(defaultAlias)}.*`;
    }

    return sql.join(selectParts, sql`, `);
  }

  private resolveSelectField(
    parts: string[],
    fieldAlias: string,
    schema: ObjectSchema,
    depth: number
  ): SQL | undefined {
    if (parts.length === 0) {
      return undefined;
    }

    const [fieldName, ...rest] = parts;
    const fieldConfig = schema.getField(fieldName);
    const tableAlias = tablePrefix(schema.tableName, depth);
    this.joinCollector.getOrCreateAliasedTable(schema.table, tableAlias);

    if (!fieldConfig) {
      const columnSql = sql`${sql.identifier(tableAlias)}.${sql.identifier(fieldName)}`;
      return sql`${columnSql} AS ${sql.identifier(fieldAlias)}`;
    }

    if (fieldConfig.join && rest.length > 0) {
      const childSchema = fieldConfig.join.schema();
      return this.resolveSelectField(rest, fieldAlias, childSchema, depth + 1);
    }

    const columnSql = sql`${sql.identifier(tableAlias)}.${sql.identifier(fieldConfig.column)}`;
    return sql`${columnSql} AS ${sql.identifier(fieldAlias)}`;
  }

  private buildJoinClauses(joins: JoinInfo[]): SQL[] {
    const clauses: SQL[] = [];
    for (const join of joins) {
      const conditionParts = join.conditions.map((condition) => {
        const sourceCol = this.joinCollector.getAliasedColumn(
          join.sourceTable,
          condition.sourceCol
        );
        const targetCol = this.joinCollector.getAliasedColumn(
          join.targetTable,
          condition.targetCol
        );
        return eq(sourceCol, targetCol);
      });

      const onCondition = conditionParts.length === 1
        ? conditionParts[0]
        // and() returns undefined only for empty arrays, but we know length > 1 here
        : and(...conditionParts)!;

      clauses.push(buildJoinSql(join.type, join.targetTable, onCondition));
    }
    return clauses;
  }
}
