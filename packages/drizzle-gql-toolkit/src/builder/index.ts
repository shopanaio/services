import { and, eq, type SQL, type Column, type Table } from "drizzle-orm";
import type { FieldsDef, QueryBuilderConfig } from "../types.js";
import { ObjectSchema, type JoinInfo } from "../schema.js";
import { formatAliasedTableReference } from "./sql-renderer.js";
import { QueryBuilder, type TypedInput } from "./query-builder.js";
export type { WhereResult } from "./where-builder.js";

// =============================================================================
// NEW FLUENT API
// =============================================================================

// Fluent Query Builder
export { createQuery, FluentQueryBuilder, MaxLimitExceededError } from "./fluent-query-builder.js";

// Pagination Query Builder
export {
  createPaginationQuery,
  PaginationQueryBuilder,
  type PaginationQueryConfig,
  type PaginationInput,
  type PaginationResult,
} from "./pagination-query-builder.js";

// Helpers
export { field } from "./helpers.js";
export type { FieldDefinition, JoinDefinition, FieldBuilder, JoinTarget } from "./helpers.js";

// Types
export type {
  FluentQueryConfig,
  FluentFieldsDef,
  ExecuteOptions,
  QuerySnapshot,
  ToFieldsDef,
  FluentQueryBuilderLike,
} from "./fluent-types.js";

// =============================================================================
// EXISTING API (kept for backward compatibility)
// =============================================================================

type JoinableQuery = {
  leftJoin: (table: SQL, on: SQL) => JoinableQuery;
  rightJoin: (table: SQL, on: SQL) => JoinableQuery;
  innerJoin: (table: SQL, on: SQL) => JoinableQuery;
  fullJoin: (table: SQL, on: SQL) => JoinableQuery;
};

function applyJoinByType<Q extends JoinableQuery>(
  query: Q,
  joinType: JoinInfo["type"],
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

export function createQueryBuilder<
  T extends Table,
  F extends string,
  Fields extends FieldsDef,
  Types = T["$inferSelect"],
>(
  schema: ObjectSchema<T, F, Fields, Types>,
  config?: QueryBuilderConfig
): QueryBuilder<T, F, Fields, Types> {
  return new QueryBuilder(schema, config);
}

export { QueryBuilder, TypedInput };

export function applyJoins<Q extends JoinableQuery>(
  query: Q,
  joins: JoinInfo[]
): Q {
  let result = query;

  for (const join of joins) {
    const conditionParts = join.conditions.map((condition) => {
      const sourceCol = join.sourceTable[condition.sourceCol] as Column;
      const targetCol = join.targetTable[condition.targetCol] as Column;
      return eq(sourceCol, targetCol);
    });

    const onCondition = conditionParts.length === 1
      ? conditionParts[0]
      // and() returns undefined only for empty arrays, but we know length > 1 here
      : and(...conditionParts)!;

    const tableSql = formatAliasedTableReference(join.targetTable);
    result = applyJoinByType(result, join.type, tableSql, onCondition);
  }

  return result;
}

export function buildJoinConditions(
  joins: JoinInfo[]
): Array<{ table: SQL; on: SQL }> {
  return joins.map((join) => {
    const conditionParts = join.conditions.map((condition) => {
      const sourceCol = join.sourceTable[condition.sourceCol] as Column;
      const targetCol = join.targetTable[condition.targetCol] as Column;
      return eq(sourceCol, targetCol);
    });

    const onCondition = conditionParts.length === 1
      ? conditionParts[0]
      // and() returns undefined only for empty arrays, but we know length > 1 here
      : and(...conditionParts)!;

    return {
      table: formatAliasedTableReference(join.targetTable),
      on: onCondition,
    };
  });
}
