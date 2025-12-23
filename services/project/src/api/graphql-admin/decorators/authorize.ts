import type { GraphQLResolveInfo } from "graphql";
import type { ServiceContext } from "../../../context/index.js";
import { ForbiddenError } from "../contextMiddleware.js";

export interface AuthorizeOptions {
  resource: string;
  action: string;
  resourceId?: string | ((args: Record<string, unknown>) => string);
  resourceOwnerId?: string | ((args: Record<string, unknown>, ctx: ServiceContext) => string);
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
  value: string | ((args: Record<string, unknown>, ctx?: ServiceContext) => string) | undefined,
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

/**
 * Check authorization and return error if denied
 * Returns null if authorized, error object if denied
 */
export async function checkAuthorization(
  ctx: ServiceContext,
  resource: string,
  action: string
): Promise<AuthorizationError | null> {
  if (!ctx.user?.id || !ctx.project?.tenantId) {
    return {
      code: "UNAUTHORIZED",
      message: "Authentication required",
      field: null,
    };
  }

  const allowed = await checkPermission(ctx, resource, action);
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
  resourceId?: string,
  resourceOwnerId?: string
): Promise<boolean> {
  const result = await ctx.kernel.getServices().broker.call("iam.authorize", {
    userId: ctx.user.id,
    tenantId: ctx.project.tenantId,
    resource,
    action,
    resourceId,
    resourceOwnerId,
  }) as IamAuthorizeResult;

  return result.allowed;
}

/**
 * Authorize decorator - ensures user has permission before executing resolver
 * Throws ForbiddenError if access is denied
 *
 * @example
 * // Single permission check
 * projectUpdate: Authorize({ resource: "project", action: "write" })(
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
 * // Dynamic resourceId
 * projectDelete: Authorize({
 *   resource: "project",
 *   action: "delete",
 *   resourceId: (args) => args.input.id
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
      // Ensure context has required data
      if (!ctx.user?.id || !ctx.project?.tenantId) {
        throw new ForbiddenError("Authentication required");
      }

      const checks = Array.isArray(options) ? options : [options];

      // Check all permissions (AND logic)
      for (const opt of checks) {
        const allowed = await checkPermission(
          ctx,
          opt.resource,
          opt.action,
          resolveValue(opt.resourceId, args),
          resolveValue(opt.resourceOwnerId, args, ctx)
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
      // Ensure context has required data
      if (!ctx.user?.id || !ctx.project?.tenantId) {
        throw new ForbiddenError("Authentication required");
      }

      // Check if any permission is allowed (OR logic)
      for (const opt of options) {
        const allowed = await checkPermission(
          ctx,
          opt.resource,
          opt.action,
          resolveValue(opt.resourceId, args),
          resolveValue(opt.resourceOwnerId, args, ctx)
        );

        if (allowed) {
          return resolver(parent, args, ctx, info);
        }
      }

      throw new ForbiddenError("Access denied");
    };
  };
}
