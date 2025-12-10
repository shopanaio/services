// Query Builder
export {
  createQuery,
  FluentQueryBuilder,
  MaxLimitExceededError,
  field,
} from "./builder/index.js";

// Pagination Query Builders
export {
  createCursorQuery,
  createRelayQuery,
  CursorQueryBuilder,
  RelayQueryBuilder,
} from "./builder/pagination-query-builder.js";

export type {
  CursorQueryConfig,
  CursorQueryInput,
  CursorQueryResult,
  RelayQueryConfig,
  RelayQueryInput,
  RelayQueryResult,
} from "./builder/pagination-query-builder.js";

// Relay Connection types
export type { Connection, Edge, PageInfo } from "./cursor/connection.js";

// Types
export type { DrizzleExecutor } from "./types.js";

// Type helpers for nested paths
export type {
  FieldsDef,
  NestedPaths,
  NestedWhereInput,
  OrderPath,
  FilterOperators,
  FilterValue,
  ScalarValue,
  QueryBuilderConfig,
} from "./types.js";
