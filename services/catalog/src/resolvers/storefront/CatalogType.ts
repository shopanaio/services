import {
  BaseType,
  Cache,
  createAuthorizationMiddleware,
  createExecutor,
  type Authorizable,
  type CacheStore,
  type Middleware,
} from "@shopana/type-resolver";
import {
  decodeGlobalIdByType,
  encodeGlobalIdByType,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import type { ServiceContext } from "../../context/types.js";
import { AuthProvider } from "../../kernel/Authorizable.js";
import { getResolverRegistry, type ResolverRegistry } from "./ResolverRegistry.js";

const graphqlNodeTypeByResolver = new Map<string, string>([
  ["ProductResolver", "Product"],
  ["ProductVariantResolver", "ProductVariant"],
  ["CategoryResolver", "Category"],
  ["ProductOptionResolver", "ProductOption"],
  ["ProductOptionCategoryResolver", "ProductOptionCategory"],
  ["ProductOptionValueResolver", "ProductOptionValue"],
  ["ProductFeatureResolver", "ProductFeature"],
  ["ProductFeatureGroupResolver", "ProductFeatureGroup"],
  ["ProductFeatureValueResolver", "ProductFeatureValue"],
  ["VendorResolver", "Vendor"],
  ["TagResolver", "Tag"],
  ["InventoryItemResolver", "InventoryItem"],
]);

const graphqlNodeTypeMiddleware: Middleware<ServiceContext> = {
  name: "catalog-storefront-graphql-node-type",
  async afterLoad({ Type, result }) {
    const typeName = graphqlNodeTypeByResolver.get(Type.name);
    if (typeName) result.__typename = typeName;
  },
};

export { Cache };

export abstract class CatalogType<TValue, TData = unknown>
  extends BaseType<TValue, TData, ServiceContext>
  implements Authorizable
{
  readonly authProvider = new AuthProvider();

  static executor = createExecutor<ServiceContext>({
    middleware: [createAuthorizationMiddleware(), graphqlNodeTypeMiddleware],
  });

  protected get resolvers(): ResolverRegistry {
    return getResolverRegistry(this.$ctx);
  }

  protected getCache(): CacheStore {
    return this.$ctx.kernel.cache as CacheStore;
  }

  protected encodeId(id: string, type: GlobalIdType): string {
    return encodeGlobalIdByType(id, type);
  }

  protected decodeId(globalId: string, expectedType: GlobalIdType): string {
    return decodeGlobalIdByType(globalId, expectedType);
  }
}
