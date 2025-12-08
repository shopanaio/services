// ============ Cursor Query (high-level API) ============
export {
  createCursorQuery,
  CursorQueryBuilder,
  type CursorQueryConfig,
  type CursorQueryInput,
  type CursorQueryResult,
  type CursorQuerySnapshot,
} from "../builder/pagination-query-builder.js";

// ============ Base Cursor Pagination (low-level API) ============
export {
  createBaseCursorBuilder,
  type BaseCursorBuilderConfig,
  type BaseCursorInput,
  type BaseCursorResult,
  type BaseCursorSqlMeta,
  type CursorDirection,
} from "./base-builder.js";

// ============ Errors ============
export { InvalidCursorError } from "./cursor.js";

// ============ Low-level API (for advanced use cases) ============
export { encode, decode } from "./cursor.js";
export type { CursorParams, SeekValue } from "./cursor.js";
export { hashFilters } from "./helpers.js";
export type { SortParam } from "./helpers.js";
