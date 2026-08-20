// Types
export type {
  TypePolicyOptions,
  AuthorizeParams,
  BrokerAuthorizeParams,
  Authorizer,
  AuthProvider,
  Authorizable,
} from "./types.js";

// Error
export { TypeAuthorizationConfigurationError, TypeAuthorizationError } from "./error.js";

// Decorator
export { TypePolicy } from "./decorator.js";

// Middleware
export {
  createAuthorizationMiddleware,
  authorizationMiddleware,
  type AuthorizationMiddlewareOptions,
} from "./middleware.js";
