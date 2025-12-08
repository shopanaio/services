// ============ Base Cursor Pagination ============
export {
  createBaseCursorBuilder,
  type BaseCursorBuilderConfig,
  type BaseCursorInput,
  type BaseCursorResult,
  type BaseCursorSqlMeta,
  type CursorDirection,
} from "./base-builder.js";

// ============ Relay Connection ============
export {
  createRelayBuilder,
  createCursorQueryBuilder, // deprecated alias
  type RelayBuilderConfig,
  type RelayInput,
  type RelayResult,
  type CursorQueryBuilderConfig, // deprecated alias
  type CursorQueryInput, // deprecated alias
  type CursorQueryResult, // deprecated alias
} from "./relay-builder.js";

// ============ Connection Types ============
export type { Connection, Edge, PageInfo } from "./connection.js";

// ============ Errors ============
export { InvalidCursorError } from "./cursor.js";

// ============ Low-level API (for advanced use cases) ============
export { encode, decode } from "./cursor.js";
export type { CursorParams, SeekValue } from "./cursor.js";
export { hashFilters } from "./helpers.js";
