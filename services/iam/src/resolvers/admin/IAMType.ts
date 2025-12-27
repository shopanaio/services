import {
  BaseType,
  Cache,
  createExecutor,
  createAuthorizationMiddleware,
  type CacheStore,
  type Authorizable as IAuthorizable,
} from "@shopana/type-resolver";
import type { ServiceContext } from "../../context/types.js";
import { Authorizable } from "../../kernel/Authorizable.js";

export { Cache };

/**
 * Base resolver class with pre-configured ServiceContext, executor, and authorization support.
 *
 * Use @TypePolicy decorator to enable authorization check on load/loadMany.
 * Supports organization name resolution via NameResolver cache.
 *
 * @template TValue - The type of the input value passed to the constructor
 * @template TData - The type of the loaded data entity
 *
 * @example
 * ```typescript
 * @TypePolicy<OrganizationResolver>({
 *   resource: "organization",
 *   action: "read",
 *   organizationId: (resolver) => resolver.value,
 *   domain: "org",
 *   onDeny: "null",
 * })
 * class OrganizationResolver extends IAMType<string, Organization | null> {
 *   // ...
 * }
 * ```
 */
@Authorizable()
export abstract class IAMType<TValue, TData = unknown> extends BaseType<
  TValue,
  TData,
  ServiceContext
> {
  /**
   * Executor with authorization middleware.
   */
  static executor = createExecutor<ServiceContext>({
    middleware: [createAuthorizationMiddleware()],
  });

  constructor(value: TValue, ctx: ServiceContext) {
    super(value, ctx);
  }

  protected getCache(): CacheStore {
    return this.ctx.kernel.cache as CacheStore;
  }
}
