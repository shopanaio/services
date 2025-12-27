import {
  BaseType,
  Cache,
  createExecutor,
  createAuthorizationMiddleware,
  type CacheStore,
  type Authorizable,
  type AuthorizeParams,
} from "@shopana/type-resolver";
import type { ServiceContext } from "../../context/types.js";

export { Cache };

/**
 * Base resolver class with pre-configured ServiceContext, executor, and authorization support.
 *
 * Use @TypePolicy decorator to enable authorization check on load/loadMany.
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
export abstract class IAMType<TValue, TData = unknown>
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
    return this.ctx.currentUser?.id ?? null;
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
    const { currentUser, kernel } = this.ctx;

    if (!currentUser?.id) {
      return false;
    }

    // Cast string types to CasbinService types
    // AuthorizeParams uses plain strings, but CasbinService expects Domain and Resource
    type Domain = import("../../casbin/CasbinService.js").Domain;
    type Resource = import("../../casbin/CasbinService.js").Resource;

    return kernel.repository.casbin.enforce({
      userId: currentUser.id,
      organizationId,
      resource: resource as Resource,
      action,
      domain: (domain ?? "org") as Domain,
    });
  }

  protected getCache(): CacheStore {
    return this.ctx.kernel.cache as CacheStore;
  }
}
