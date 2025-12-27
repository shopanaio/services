import {
  BaseType,
  Cache,
  createExecutor,
  createAuthorizationMiddleware,
  type CacheStore,
  Authorizable,
} from "@shopana/type-resolver";
import type { ServiceContext } from "../../context/types.js";
import { AuthProvider } from "../../kernel/Authorizable.js";

export { Cache };

/**
 * Base resolver class with pre-configured ServiceContext, executor, and authorization support.
 *
 * Use @TypePolicy decorator to enable authorization check on load/loadMany.
 * Supports store name resolution via NameResolver cache.
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
   * Authorization provider for @Policy decorator.
   */
  readonly authProvider = new AuthProvider();

  /**
   * Executor with authorization middleware.
   */
  static executor = createExecutor<ServiceContext>({
    middleware: [createAuthorizationMiddleware()],
  });

  // @ts-expect-error
  protected getCache() {
    return this.ctx.kernel.cache;
  }
}
