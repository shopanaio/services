import { BaseType, type TypePolicy } from "@shopana/type-resolver";
import type { Authorizable, AuthorizeParams } from "@shopana/shared-kernel";
import type { ServiceContext } from "../../context/types.js";

/**
 * Base resolver class with ServiceContext and Authorizable support.
 *
 * Set static `policy` to enable authorization check on load/loadMany.
 * Authorization uses batched loader from context.
 *
 * @template TValue - The type of the input value passed to the constructor
 * @template TData - The type of the loaded data entity
 *
 * @example
 * ```typescript
 * class StoreResolver extends BaseResolver<string, Store | null> {
 *   static policy = { resource: "store", action: "read", onDeny: "null" };
 * }
 * ```
 */
export abstract class BaseResolver<TValue, TData = unknown>
  extends BaseType<TValue, TData, ServiceContext>
  implements Authorizable
{
  /**
   * Authorization check using batched loader.
   * Called by BaseType.load/loadMany when policy is defined.
   */
  protected static async authorize(
    ctx: ServiceContext,
    policy: TypePolicy
  ): Promise<boolean> {
    if (!ctx.user?.id || !ctx.store?.organizationId) {
      return false;
    }

    return ctx.loaders.authorization.load({
      userId: ctx.user.id,
      organizationId: ctx.store.organizationId,
      resource: policy.resource,
      action: policy.action,
      domain: `store:${ctx.store.id}`,
    });
  }

  get userId(): string | null {
    return this.ctx.user?.id ?? null;
  }

  get organizationId(): string | null {
    return this.ctx.store?.organizationId ?? null;
  }

  /**
   * Instance-level authorization for @Authorize decorator.
   */
  authorize({ resource, action }: AuthorizeParams): Promise<boolean> {
    return BaseResolver.authorize(this.ctx, { resource, action });
  }

  protected getCache() {
    return this.ctx.kernel.cache;
  }
}
