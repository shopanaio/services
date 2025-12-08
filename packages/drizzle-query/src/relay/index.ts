// ============ Relay Query (high-level API) ============
export {
  createRelayQuery,
  RelayQueryBuilder,
  type RelayQueryConfig,
  type RelayQueryInput,
  type RelayQueryResult,
  type RelayQuerySnapshot,
} from "../builder/pagination-query-builder.js";

// ============ Connection Types ============
export type { Connection, Edge, PageInfo } from "../cursor/connection.js";
