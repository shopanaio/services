import type {
  ProductConnectionInput,
  ProductRelayInput,
} from "../../repositories/product/ProductRepository.js";
import { ProductResolver } from "./ProductResolver.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export type { ProductConnectionInput };

type ProductCategoriesScopeArgs = {
  referenceIds: string[];
  mode: "INCLUDE" | "EXCLUDE";
};

type ProductProductsMetaArgs = {
  categoriesScope?: ProductCategoriesScopeArgs | null;
};

export type ProductQueryProductsArgs = ProductRelayInput & {
  meta?: ProductProductsMetaArgs | null;
};

/**
 * ProductConnection - resolves paginated product list
 * Uses cursor-based pagination with Relay-style Connection spec
 */
export class ProductConnectionResolver extends BaseConnectionResolver<ProductConnectionInput> {
  async $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel
      .getServices()
      .repository.product.getConnection(this.$props);
  }

  protected createNodeResolver(nodeId: string) {
    return new ProductResolver(nodeId, this.$ctx);
  }
}
