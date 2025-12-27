// Base type (use Type.load() and Type.loadMany() static methods)
export { BaseType } from "./baseType.js";

// Executor
export { Executor, createExecutor, ResolverError } from "./executor.js";

// Decorators
export { Cache, type CacheOptions, type CacheStore } from "./decorators/Cache.js";
export { ApolloQuery, ApolloMutation } from "./decorators/ApolloQuery.js";
export { SubgraphReference } from "./decorators/SubgraphReference.js";

// GraphQL utils
export { parseGraphqlInfo } from "./utils/graphqlArgsParser.js";

// Authorization middleware (re-exported for convenience)
export {
  TypePolicy,
  TypeAuthorizationError,
  createAuthorizationMiddleware,
  authorizationMiddleware,
  type TypePolicyOptions,
  type AuthorizeParams,
  type Authorizable,
  type AuthorizationMiddlewareOptions,
} from "./middleware/authorization/index.js";

// Types
export type {
  TypeClass,
  TypeContext,
  TypeInstance,
  ResolverMethod,
  TypeResult,
  TypeValue,
  ResolverKeys,
  ArgsForField,
  QueryArgs,
  ExecutorOptions,
  // Middleware
  Middleware,
  MiddlewareStack,
  MiddlewareContext,
  AfterCreateContext,
  AfterLoadContext,
  MiddlewareResult,
} from "./types.js";
