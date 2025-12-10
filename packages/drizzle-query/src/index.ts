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

// Type inference utilities
export type {
  InferFields,
  InferWhere,
  InferOrder,
  InferOrderPath,
  InferSelect,
  InferSelectPath,
  InferResult,
  InferExecuteOptions,
  InferRelayInput,
  InferCursorInput,
} from "./infer.js";

export {
  queryInput,
  queryWhere,
  queryOrder,
  relayInput,
  cursorInput,
} from "./infer.js";

// GraphQL type generation
export {
  generateGraphQLTypes,
  generateBaseFilterTypes,
  generateWhereInputType,
  generateOrderByInputType,
} from "./graphql.js";

export type {
  GraphQLFieldType,
  GraphQLGeneratorOptions,
  GeneratedGraphQLTypes,
} from "./graphql.js";

// GraphQL schema file generation
export {
  createGraphQLSchema,
  generateGraphQLSchema,
  generateBaseTypesSchema,
  generateQuerySchema,
} from "./graphql-codegen.js";

export type {
  GraphQLSchemaConfig,
  QueryDefinition,
} from "./graphql-codegen.js";

// GraphQL input mappers
export {
  // Mapper factory (with validation)
  createGraphQLMapper,
  // Standalone functions (no validation)
  mapOrderBy,
  mapOrderByItem,
  mapWhereInput,
  mapConnectionInput,
  mapQueryInput,
  // Errors
  InvalidFieldError,
  InvalidOperatorError,
} from "./graphql-mapper.js";

export type {
  GraphQLMapper,
  GraphQLMapperConfig,
  GraphQLOrderByInput,
  GraphQLWhereInput,
  GraphQLConnectionInput,
  GraphQLQueryInput,
} from "./graphql-mapper.js";
