// Query Builder
export {
  createQuery,
  FluentQueryBuilder,
  MaxLimitExceededError,
  field,
} from "./builder/index.js";

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
