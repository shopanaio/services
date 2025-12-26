import type { GraphQLResolveInfo } from "graphql";
import type { ServiceContext } from "../../../context/index.js";
import { ForbiddenError } from "../contextMiddleware.js";

export interface AuthorizeOptions {
  resource: string;
  action: string;
  /** Override organizationId (e.g., from input for store creation) */
  organizationId?: string | ((args: Record<string, unknown>) => string);
  /** Domain scope. Defaults to "org". Use function for dynamic: (args, ctx) => `store:${ctx.store!.id}` */
  domain?:
    | string
    | ((args: Record<string, unknown>, ctx?: ServiceContext) => string);
}

interface IamAuthorizeResult {
  allowed: boolean;
  deniedReason?: string;
}

type ResolverFn<TParent, TArgs, TResult> = (
  parent: TParent,
  args: TArgs,
  ctx: ServiceContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

/**
 * Resolve dynamic value from options
 */
function resolveValue(
  value:
    | string
    | ((args: Record<string, unknown>, ctx?: ServiceContext) => string)
    | undefined,
  args: Record<string, unknown>,
  ctx?: ServiceContext
): string | undefined {
  if (!value) return undefined;
  if (typeof value === "function") return value(args, ctx);
  return value;
}

export interface AuthorizationError {
  code: string;
  message: string;
  field: string[] | null;
}

export interface CheckAuthorizationOptions {
  organizationId?: string;
  domain?: string;
}

/**
 * Check authorization and return error if denied
 * Returns null if authorized, error object if denied
 */
export async function checkAuthorization(
  ctx: ServiceContext,
  resource: string,
  action: string,
  options?: CheckAuthorizationOptions
): Promise<AuthorizationError | null> {
  if (!ctx.user?.id) {
    return {
      code: "UNAUTHORIZED",
      message: "Authentication required",
      field: null,
    };
  }

  const organizationId = options?.organizationId ?? ctx.store?.organizationId;
  if (!organizationId) {
    return {
      code: "UNAUTHORIZED",
      message: "Organization context required",
      field: null,
    };
  }

  // Auto-detect domain: explicit > store context > org (default)
  const domain = options?.domain ?? (ctx.store ? `store:${ctx.store.id}` : undefined);
  const allowed = await checkPermission(ctx, resource, action, organizationId, domain);

  if (!allowed) {
    return {
      code: "FORBIDDEN",
      message: `Access denied: ${resource}:${action}`,
      field: null,
    };
  }

  return null;
}

async function checkPermission(
  ctx: ServiceContext,
  resource: string,
  action: string,
  organizationId: string,
  domain?: string
): Promise<boolean> {
  if (!ctx.user) {
    return false;
  }

  const result = (await ctx.kernel.getServices().broker.call("iam.authorize", {
    userId: ctx.user.id,
    organizationId,
    resource,
    action,
    domain,
  })) as IamAuthorizeResult;

  return result.allowed;
}

/**
 * Authorize decorator - ensures user has permission before executing resolver
 * Throws ForbiddenError if access is denied
 *
 * @example
 * // Single permission check
 * storeUpdate: Authorize({ resource: "store", action: "write" })(
 *   async (_parent, { input }, ctx, info) => { ... }
 * )
 *
 * @example
 * // Multiple permissions (AND logic - all must pass)
 * orderWithProducts: Authorize([
 *   { resource: "order", action: "read" },
 *   { resource: "product", action: "read" }
 * ])(async (_parent, args, ctx, info) => { ... })
 *
 * @example
 * // Dynamic organizationId
 * storeCreate: Authorize({
 *   resource: "store",
 *   action: "create",
 *   organizationId: (args) => args.input.organizationId
 * })(async (_parent, { input }, ctx, info) => { ... })
 */
export function Authorize<TParent, TArgs extends Record<string, unknown>, TResult>(
  options: AuthorizeOptions | AuthorizeOptions[]
) {
  return function (resolver: ResolverFn<TParent, TArgs, TResult>): ResolverFn<TParent, TArgs, TResult> {
    return async function authorizedResolver(
      parent: TParent,
      args: TArgs,
      ctx: ServiceContext,
      info: GraphQLResolveInfo
    ): Promise<TResult> {
      // Ensure user is authenticated
      if (!ctx.user?.id) {
        throw new ForbiddenError("Authentication required");
      }

      const checks = Array.isArray(options) ? options : [options];

      // Check all permissions (AND logic)
      for (const opt of checks) {
        const orgId =
          resolveValue(opt.organizationId, args) ?? ctx.store?.organizationId;
        if (!orgId) {
          throw new ForbiddenError("Organization context required");
        }

        // Auto-detect domain: explicit > store context > org (default)
        const domain =
          resolveValue(opt.domain, args, ctx) ??
          (ctx.store ? `store:${ctx.store.id}` : undefined);
        const allowed = await checkPermission(
          ctx,
          opt.resource,
          opt.action,
          orgId,
          domain
        );

        if (!allowed) {
          throw new ForbiddenError(
            `Access denied: ${opt.resource}:${opt.action}`
          );
        }
      }

      return resolver(parent, args, ctx, info);
    };
  };
}

/**
 * AuthorizeAny decorator - ensures user has at least one of the permissions
 * Uses OR logic - at least one permission must be granted
 *
 * @example
 * orderUpdate: AuthorizeAny([
 *   { resource: "order", action: "write" },
 *   { resource: "order", action: "admin" }
 * ])(async (_parent, args, ctx, info) => { ... })
 */
export function AuthorizeAny<TParent, TArgs extends Record<string, unknown>, TResult>(
  options: AuthorizeOptions[]
) {
  return function (resolver: ResolverFn<TParent, TArgs, TResult>): ResolverFn<TParent, TArgs, TResult> {
    return async function authorizedResolver(
      parent: TParent,
      args: TArgs,
      ctx: ServiceContext,
      info: GraphQLResolveInfo
    ): Promise<TResult> {
      // Ensure user is authenticated
      if (!ctx.user?.id) {
        throw new ForbiddenError("Authentication required");
      }

      // Check if any permission is allowed (OR logic)
      for (const opt of options) {
        const orgId =
          resolveValue(opt.organizationId, args) ?? ctx.store?.organizationId;
        if (!orgId) continue;

        // Auto-detect domain: explicit > store context > org (default)
        const domain =
          resolveValue(opt.domain, args, ctx) ??
          (ctx.store ? `store:${ctx.store.id}` : undefined);
        const allowed = await checkPermission(
          ctx,
          opt.resource,
          opt.action,
          orgId,
          domain
        );

        if (allowed) {
          return resolver(parent, args, ctx, info);
        }
      }

      throw new ForbiddenError("Access denied");
    };
  };
}
