// Types
export type {
  ColumnNames,
  ColumnDataType,
  IsColumnNullable,
  FilterValue,
  FilterOperators,
  OrderDirection,
  NullsOrder,
  OrderOptions,
  OrderInput,
  OrderByInput,
  PaginationInput,
  ResolvedPagination,
  QueryBuilderConfig,
  DrizzleExecutor,
  GetColumn,
  // Nested path types
  FieldsDef,
  NestedPaths,
  OrderPath,
  NestedWhereInput,
  NestedSchemaInput,
  // Auto-inferred nested types
  SchemaWithFields,
  InferFieldsDef,
  ExtractFields,
  TypedSchemaInput,
  TypedSchemaResult,
} from "./types.js";

// Schema
export {
  ObjectSchema,
  createSchema,
  tablePrefix,
  type Join,
  type JoinType,
  type FieldConfig,
  type SchemaConfig,
  type JoinInfo,
} from "./schema.js";

// Query Builder
export {
  QueryBuilder,
  createQueryBuilder,
  applyJoins,
  buildJoinConditions,
  type TypedInput,
  type WhereResult,
} from "./builder.js";

export {
  QueryBuilderError,
  InvalidFilterError,
  JoinDepthExceededError,
  UnknownFieldError,
} from "./errors.js";

// Operators
export {
  OPERATORS,
  buildOperatorCondition,
  isOperator,
  isLogicalOperator,
  isFilterObject,
  validateFilterValue,
  type OperatorKey,
} from "./operators.js";

// Pagination
export {
  resolvePagination,
  calculatePageInfo,
  encodeCursor,
  decodeCursor,
  resolveCursorPagination,
  type PaginationConfig,
  type PageInfo,
  type ConnectionInfo,
  type CursorPaginationInput,
} from "./pagination.js";

// Helpers
export {
  notDeleted,
  withProjectScope,
  combineAnd,
  applyDefaultFilters,
  hasKey,
  ensureArray,
  pickDefined,
  type DefaultFiltersOptions,
} from "./helpers.js";

export * from "./cursor/index.js";
