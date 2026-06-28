import type {
  BundleConnectionInput,
  BundleRelayInput,
} from "../../repositories/product/ProductRepository.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export type { BundleConnectionInput };

type BundleCategoriesScopeArgs = {
  referenceIds: string[];
  mode: "INCLUDE" | "EXCLUDE";
};

type BundleBundlesMetaArgs = {
  categoriesScope?: BundleCategoriesScopeArgs | null;
};

export type BundleQueryBundlesArgs = BundleRelayInput & {
  meta?: BundleBundlesMetaArgs | null;
};

/**
 * BundleConnection - resolves paginated bundle list.
 */
export class BundleConnectionResolver extends BaseConnectionResolver<BundleConnectionInput> {
  async $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel
      .getServices()
      .repository.product.getBundleConnection(this.$props);
  }

  protected async createNodeResolver(nodeId: string) {
    return this.resolvers.bundle(nodeId);
  }
}
