import { and, isNull, eq, type SQL, type Table, type Column } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type { ColumnNames } from "./types.js";

/**
 * Common filter for soft-deletable entities
 * Adds `deletedAt IS NULL` condition
 *
 * @example
 * ```ts
 * const where = and(
 *   notDeleted(product.deletedAt),
 *   qb.where({ status: { $eq: "active" } }).sql
 * );
 * ```
 */
export function notDeleted(deletedAtColumn: Column): SQL {
  return isNull(deletedAtColumn);
}

/**
 * Create a scoped filter that always includes project context
 *
 * @example
 * ```ts
 * const scopedWhere = withProjectScope(product.projectId, projectId);
 *
 * const where = and(
 *   scopedWhere,
 *   notDeleted(product.deletedAt),
 *   qb.where(input).sql
 * );
 * ```
 */
export function withProjectScope(projectIdColumn: Column, projectId: string): SQL {
  return eq(projectIdColumn, projectId);
}

/**
 * Combine multiple SQL conditions with AND, filtering out undefined/null
 *
 * @example
 * ```ts
 * const where = combineAnd(
 *   withProjectScope(product.projectId, projectId),
 *   notDeleted(product.deletedAt),
 *   qb.where(input).sql // may be undefined
 * );
 * ```
 */
export function combineAnd(
  ...conditions: (SQL | undefined | null)[]
): SQL | undefined {
  const filtered = conditions.filter((c): c is SQL => c != null);
  if (filtered.length === 0) return undefined;
  if (filtered.length === 1) return filtered[0];
  return and(...filtered);
}

/**
 * Apply default filters commonly used in repositories
 *
 * @example
 * ```ts
 * const filters = applyDefaultFilters(product, {
 *   projectId: "uuid",
 *   includeDeleted: false,
 * });
 *
 * await db.select().from(product).where(and(filters, qb.where(input).sql));
 * ```
 */
export type DefaultFiltersOptions<T extends Table> = {
  projectId?: string;
  projectIdColumn?: ColumnNames<T>;
  includeDeleted?: boolean;
  deletedAtColumn?: ColumnNames<T>;
};

export function applyDefaultFilters<T extends PgTable>(
  table: T,
  options: DefaultFiltersOptions<T>
): SQL | undefined {
  const conditions: SQL[] = [];
  const columns = table["_"]["columns"];

  // Project scope
  if (options.projectId) {
    const colName = options.projectIdColumn ?? "projectId";
    const column = columns[colName as keyof typeof columns] as Column | undefined;
    if (column) {
      conditions.push(eq(column, options.projectId));
    }
  }

  // Soft delete
  if (!options.includeDeleted) {
    const colName = options.deletedAtColumn ?? "deletedAt";
    const column = columns[colName as keyof typeof columns] as Column | undefined;
    if (column) {
      conditions.push(isNull(column));
    }
  }

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return and(...conditions);
}
