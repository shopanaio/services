import type { Middleware, AfterCreateContext } from "../../types.js";
import type { TypePolicyOptions } from "./types.js";
import type { AuthorizeParams, Authorizer } from "@shopana/rbac";
import { TypeAuthorizationConfigurationError, TypeAuthorizationError } from "./error.js";

/**
 * Resolve the minimal authorization capability required by @TypePolicy.
 *
 * Resolver instances keep exposing the capability through `authProvider` for
 * compatibility with existing resolvers. The middleware intentionally depends
 * only on the shared Authorizer contract.
 */
function getAuthorizer(instance: unknown): Authorizer | undefined {
  if (typeof instance !== "object" || instance === null) {
    return undefined;
  }

  const authProvider = (instance as { authProvider?: unknown }).authProvider;
  if (
    typeof authProvider !== "object" ||
    authProvider === null ||
    typeof (authProvider as Authorizer).authorize !== "function"
  ) {
    return undefined;
  }

  return authProvider as Authorizer;
}

/**
 * Get policy from TypeClass if defined.
 */
function getPolicy(Type: unknown): TypePolicyOptions | undefined {
  return (Type as { policy?: TypePolicyOptions }).policy;
}

function getTypeName(Type: unknown): string {
  const name = (Type as { name?: unknown }).name;
  return typeof name === "string" ? name : "";
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
 * 2. Requires the instance to expose an `Authorizer` through `authProvider`
 * 3. Calls `authProvider.authorize({ resource, action, domain })`
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
  options: AuthorizationMiddlewareOptions = {},
): Middleware<TContext> {
  const { name = "authorization" } = options;

  return {
    name,

    async afterCreate({ Type, instance }: AfterCreateContext<TContext>): Promise<void | null> {
      const policy = getPolicy(Type);

      // No policy - skip authorization
      if (!policy) {
        return;
      }

      const authorizer = getAuthorizer(instance);
      if (!authorizer) {
        throw new TypeAuthorizationConfigurationError(getTypeName(Type));
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
      const domain = typeof policy.domain === "function" ? policy.domain(instance) : policy.domain;

      // Resolve subject (can be a function, defaults to the authorizer's subject)
      const subject =
        typeof policy.subject === "function" ? policy.subject(instance) : policy.subject;

      const authorizeParams: AuthorizeParams = {
        resource: policy.resource,
        action: policy.action,
        organizationId,
        domain,
        subject: subject ?? undefined,
      };
      const allowed = await authorizer.authorize(authorizeParams);

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
export const authorizationMiddleware: Middleware = createAuthorizationMiddleware();
