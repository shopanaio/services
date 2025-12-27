import type { Middleware, AfterCreateContext } from "../../types.js";
import type { TypePolicyOptions, Authorizable } from "./types.js";
import { TypeAuthorizationError } from "./error.js";

/**
 * Check if instance implements Authorizable interface.
 */
function isAuthorizable(instance: unknown): instance is Authorizable {
  return (
    typeof instance === "object" &&
    instance !== null &&
    typeof (instance as Authorizable).authProvider === "object" &&
    (instance as Authorizable).authProvider !== null &&
    typeof (instance as Authorizable).authProvider.authorize === "function"
  );
}

/**
 * Get policy from TypeClass if defined.
 */
function getPolicy(Type: unknown): TypePolicyOptions | undefined {
  return (Type as { policy?: TypePolicyOptions }).policy;
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
 * import { createAuthorizationMiddleware } from "@shopana/type-resolver/middleware/authorization";
 *
 * const executor = createExecutor({
 *   middleware: [createAuthorizationMiddleware()],
 * });
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

      // Resolve organizationId (can be a function)
      const organizationId =
        typeof policy.organizationId === "function"
          ? policy.organizationId(instance)
          : policy.organizationId;

      if (!organizationId) {
        if (policy.onDeny === "null") {
          return null;
        }
        throw new TypeAuthorizationError(policy.resource, policy.action);
      }

      // Resolve domain (can be a function)
      const domain =
        typeof policy.domain === "function"
          ? policy.domain(instance)
          : policy.domain;

      // Resolve userId (can be a function, defaults to current user via authProvider)
      const userId =
        typeof policy.userId === "function"
          ? policy.userId(instance)
          : policy.userId;

      const allowed = await instance.authProvider.authorize({
        resource: policy.resource,
        action: policy.action,
        organizationId,
        domain,
        userId: userId ?? undefined,
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
 */
export const authorizationMiddleware: Middleware =
  createAuthorizationMiddleware();
