import {
  BaseType,
  createAuthorizationMiddleware,
  createExecutor,
  type Authorizable,
  type CacheStore,
} from "@shopana/type-resolver";
import {
  decodeGlobalIdByType,
  encodeGlobalIdByType,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import { requireStorefrontPermission, STOREFRONT_PERMISSIONS } from "@shopana/shared-context";
import type { ServiceContext } from "../../context/types.js";
import { AuthProvider } from "../../kernel/Authorizable.js";
import { getStorefrontResolverRegistry, type StorefrontResolverRegistry } from "./ResolverRegistry.js";

export abstract class LoyaltyStorefrontType<TValue, TData = unknown>
  extends BaseType<TValue, TData, ServiceContext>
  implements Authorizable
{
  readonly authProvider = new AuthProvider();

  static executor = createExecutor<ServiceContext>({
    middleware: [createAuthorizationMiddleware()],
  });

  protected get resolvers(): StorefrontResolverRegistry {
    return getStorefrontResolverRegistry(this.$ctx);
  }

  protected getCache(): CacheStore {
    return this.$ctx.kernel.cache as unknown as CacheStore;
  }

  protected encodeId(id: string, type: GlobalIdType) {
    return encodeGlobalIdByType(id, type);
  }

  protected decodeId(id: string, type: GlobalIdType) {
    return decodeGlobalIdByType(id, type);
  }

  protected requireReadPermission() {
    requireStorefrontPermission(this.$ctx.storefrontAccess, STOREFRONT_PERMISSIONS.LOYALTY_READ);
  }
}
