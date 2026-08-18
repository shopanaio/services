import {
  requireStorefrontPermission,
  STOREFRONT_PERMISSIONS,
} from "@shopana/shared-context";
import {
  decodeGlobalIdByType,
  encodeGlobalIdByType,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import {
  BaseType,
  createExecutor,
  type CacheStore,
} from "@shopana/type-resolver";
import type { ServiceContext } from "../../context/types.js";
import {
  getStorefrontResolverRegistry,
  type StorefrontResolverRegistry,
} from "./StorefrontResolverRegistry.js";

export abstract class StorefrontCustomersType<TValue, TData = unknown> extends BaseType<
  TValue,
  TData,
  ServiceContext
> {
  static executor = createExecutor<ServiceContext>({});

  protected get resolvers(): StorefrontResolverRegistry {
    return getStorefrontResolverRegistry(this.$ctx);
  }

  protected getCache(): CacheStore {
    return this.$ctx.kernel.cache as CacheStore;
  }

  protected encodeId(id: string, type: GlobalIdType): string {
    return encodeGlobalIdByType(id, type);
  }

  protected decodeId(id: string, type: GlobalIdType): string {
    return decodeGlobalIdByType(id, type);
  }

  protected requireReadPermission(): void {
    requireStorefrontPermission(
      this.$ctx.storefrontAccess,
      STOREFRONT_PERMISSIONS.CUSTOMER_READ,
    );
  }

  protected requireWritePermission(): void {
    requireStorefrontPermission(
      this.$ctx.storefrontAccess,
      STOREFRONT_PERMISSIONS.CUSTOMER_WRITE,
    );
  }
}
