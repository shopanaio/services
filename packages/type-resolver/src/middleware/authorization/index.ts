// Types
export type { TypePolicyOptions, AuthorizeParams, Authorizable } from "./types.js";

// Error
export { TypeAuthorizationError } from "./error.js";

// Decorator
export { TypePolicy } from "./decorator.js";

// Middleware
export {
  createAuthorizationMiddleware,
  authorizationMiddleware,
  type AuthorizationMiddlewareOptions,
} from "./middleware.js";
