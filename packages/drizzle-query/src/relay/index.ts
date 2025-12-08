// ============ Relay Connection Builder ============
export {
  createRelayBuilder,
  createCursorQueryBuilder, // deprecated alias
  type RelayBuilderConfig,
  type RelayInput,
  type RelayResult,
  type CursorQueryBuilderConfig, // deprecated alias
  type CursorQueryInput, // deprecated alias
  type CursorQueryResult, // deprecated alias
} from "../cursor/relay-builder.js";

// ============ Fluent Pagination Query Builder ============
export {
  createPaginationQuery,
  PaginationQueryBuilder,
  type PaginationQueryConfig,
  type PaginationResult,
} from "../builder/pagination-query-builder.js";

// ============ Connection Types ============
export type { Connection, Edge, PageInfo } from "../cursor/connection.js";
