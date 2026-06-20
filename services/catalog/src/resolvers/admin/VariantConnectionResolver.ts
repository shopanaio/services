import type { VariantRelayInput } from "../../repositories/variant/VariantRepository.js";
import { VariantResolver } from "./VariantResolver.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export type VariantConnectionInput = VariantRelayInput & {
  productId?: string;
};

/**
 * VariantConnection - resolves paginated variant lists
 * Uses cursor-based pagination with Relay-style Connection spec
 */
export class VariantConnectionResolver extends BaseConnectionResolver<VariantConnectionInput> {
  async $preload(): Promise<ConnectionData> {
    const { productId, ...args } = this.$props;
    if (!productId) {
      return this.$ctx.kernel
        .getServices()
        .repository.variant.getConnection(args);
    }

    return this.$ctx.kernel
      .getServices()
      .repository.variant.getConnectionByProductId(productId, args);
  }

  protected createNodeResolver(nodeId: string) {
    return new VariantResolver(nodeId, this.$ctx);
  }
}
