import type { Table } from "drizzle-orm";
import type { FieldsDef, QueryBuilderConfig } from "../types.js";
import { ObjectSchema } from "../schema.js";
import { QueryBuilder, type TypedInput } from "./query-builder.js";

// Fluent Query Builder
export { createQuery, FluentQueryBuilder, MaxLimitExceededError } from "./fluent-query-builder.js";

// Field helper
export { field } from "./helpers.js";

// Internal: used by cursor builders
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
