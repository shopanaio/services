// Types
export type {
  ColumnNames,
  ColumnDataType,
  IsColumnNullable,
  WhereInput,
  WhereInputV3,
  SchemaWhereInput,
  FilterValue,
  FilterOperators,
  OrderDirection,
  NullsOrder,
  OrderOptions,
  OrderInput,
  OrderByInput,
  PaginationInput,
  ResolvedPagination,
  SelectionInput,
  QueryInput,
  Input,
  InputG,
  SchemaInput,
  QueryBuilderConfig,
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
} from "./builder.js";

// Operators
export {
  OPERATORS,
  buildOperatorCondition,
  isOperator,
  isLogicalOperator,
  isFilterObject,
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
