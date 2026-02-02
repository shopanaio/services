import {
  BaseType,
  Cache,
  createExecutor,
  createAuthorizationMiddleware,
  type CacheStore,
  type Authorizable,
} from "@shopana/type-resolver";
import type { ServiceContext } from "../../context/types.js";
import { AuthProvider } from "../../kernel/Authorizable.js";

export { Cache };

/**
 * Base resolver class для Catalog Service.
 * Pre-configured ServiceContext, executor, and authorization support.
 *
 * Use @TypePolicy decorator to enable authorization check on load/loadMany.
 *
 * @template TValue - The type of the input value passed to the constructor
 * @template TData - The type of the loaded data entity
 *
 * @example
 * ```typescript
 * @TypePolicy<ProductResolver>({
 *   resource: "product",
 *   action: "read",
 *   organizationId: (resolver) => resolver.$ctx.store?.organizationId,
 *   domain: (resolver) => `store:${resolver.$ctx.store?.id}`,
 *   onDeny: "null",
 * })
 * class ProductResolver extends CatalogType<string, Product | null> {
 *   // ...
 * }
 * ```
 */
export abstract class CatalogType<TValue, TData = unknown>
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

  protected getCache(): CacheStore {
    // TODO: Add cache to kernel services when needed
    return {} as CacheStore;
  }
}
