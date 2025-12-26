import { TypeAuthorizationError, type TypePolicy } from "../baseType.js";
import type { Middleware, AfterCreateContext } from "../types.js";

/**
 * Parameters for authorization check.
 */
export interface AuthorizeParams {
  resource: string;
  action: string;
  domain?: string;
}

/**
 * Interface for types that support authorization.
 */
export interface Authorizable {
  authorize(params: AuthorizeParams): Promise<boolean>;
}

/**
 * Check if instance implements Authorizable interface.
 */
function isAuthorizable(instance: unknown): instance is Authorizable {
  return (
    typeof instance === "object" &&
    instance !== null &&
    typeof (instance as Authorizable).authorize === "function"
  );
}

/**
 * Get policy from TypeClass if defined.
 */
function getPolicy(Type: unknown): TypePolicy | undefined {
  return (Type as { policy?: TypePolicy }).policy;
}

/**
 * Options for createAuthorizationMiddleware.
 */
export interface AuthorizationMiddlewareOptions {
  /**
   * Custom name for the middleware.
   * @default "authorization"
   */
  name?: string;
}

/**
 * Creates an authorization middleware that checks @TypePolicy on types.
 *
 * This middleware:
 * 1. Checks if the TypeClass has a `policy` property (set by @TypePolicy decorator)
 * 2. Checks if the instance implements `authorize()` method
 * 3. Calls `instance.authorize({ resource, action, domain })`
 * 4. Returns null or throws based on `policy.onDeny`
 *
 * @example
 * ```typescript
 * import { createExecutor } from "@shopana/type-resolver";
 * import { createAuthorizationMiddleware } from "@shopana/type-resolver/middleware";
 *
 * const authMiddleware = createAuthorizationMiddleware();
 *
 * const executor = createExecutor({
 *   ctx,
 *   middleware: [authMiddleware],
 * });
 * ```
 *
 * @example
 * ```typescript
 * // TypeClass with policy
 * @TypePolicy({ resource: "store", action: "read", onDeny: "null" })
 * class StoreResolver extends BaseResolver<string, Store | null> {
 *   // authorize() inherited from BaseResolver
 * }
 * ```
 */
export function createAuthorizationMiddleware<TContext = unknown>(
  options: AuthorizationMiddlewareOptions = {}
): Middleware<TContext> {
  const { name = "authorization" } = options;

  return {
    name,

    async afterCreate({
      Type,
      instance,
    }: AfterCreateContext<TContext>): Promise<void | null> {
      const policy = getPolicy(Type);

      // No policy - skip authorization
      if (!policy) {
        return;
      }

      // Instance doesn't implement authorize - skip
      if (!isAuthorizable(instance)) {
        return;
      }

      // Resolve domain (can be a function)
      const domain =
        typeof policy.domain === "function"
          ? policy.domain(instance)
          : policy.domain;

      // Call instance.authorize()
      const allowed = await instance.authorize({
        resource: policy.resource,
        action: policy.action,
        domain,
      });

      if (!allowed) {
        if (policy.onDeny === "null") {
          return null;
        }
        throw new TypeAuthorizationError(policy.resource, policy.action);
      }
    },
  };
}

/**
 * Default authorization middleware instance.
 *
 * @example
 * ```typescript
 * import { createExecutor } from "@shopana/type-resolver";
 * import { authorizationMiddleware } from "@shopana/type-resolver/middleware";
 *
 * const executor = createExecutor({
 *   ctx,
 *   middleware: [authorizationMiddleware],
 * });
 * ```
 */
export const authorizationMiddleware: Middleware =
  createAuthorizationMiddleware();
