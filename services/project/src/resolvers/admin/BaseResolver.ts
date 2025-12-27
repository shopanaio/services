import {
  BaseType,
  createExecutor,
  createAuthorizationMiddleware,
  type Authorizable,
  type AuthorizeParams,
} from "@shopana/type-resolver";
import type { ServiceContext } from "../../context/types.js";

/**
 * Base resolver class with ServiceContext and Authorizable support.
 *
 * Use @TypePolicy decorator to enable authorization check on load/loadMany.
 * Authorization uses batched loader from context.
 *
 * @template TValue - The type of the input value passed to the constructor
 * @template TData - The type of the loaded data entity
 *
 * @example
 * ```typescript
 * @TypePolicy<StoreResolver>({
 *   resource: "store",
 *   action: "read",
 *   organizationId: (resolver) => resolver.ctx.store?.organizationId ?? null,
 *   domain: (resolver) => `store:${resolver.value}`,
 *   onDeny: "null",
 * })
 * class StoreResolver extends BaseResolver<string, Store | null> {
 *   // ...
 * }
 * ```
 */
export abstract class BaseResolver<TValue, TData = unknown>
  extends BaseType<TValue, TData, ServiceContext>
  implements Authorizable
{
  /**
   * Executor with authorization middleware.
   */
  static executor = createExecutor<ServiceContext>({
    middleware: [createAuthorizationMiddleware()],
  });

  get userId(): string | null {
    return this.ctx.user?.id ?? null;
  }

  /**
   * Instance-level authorization for @TypePolicy decorator.
   * Called by authorization middleware after instance creation.
   */
  async authorize({
    resource,
    action,
    domain,
    organizationId,
  }: AuthorizeParams): Promise<boolean> {
    const { loaders, user } = this.ctx;

    if (!user?.id) {
      return false;
    }

    return loaders.authorization.load({
      userId: user.id,
      organizationId,
      resource,
      action,
      domain,
    });
  }

  // @ts-expect-error
  protected getCache() {
    return this.ctx.kernel.cache;
  }
}
