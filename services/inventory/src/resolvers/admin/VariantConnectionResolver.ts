import type { VariantRelayInput } from "../../repositories/variant/VariantRepository.js";
import { VariantResolver } from "./VariantResolver.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export interface VariantConnectionInput extends VariantRelayInput {
  productId: string;
}

/**
 * VariantConnection - resolves paginated variant list for a product
 * Uses cursor-based pagination with Relay-style Connection spec
 */
export class VariantConnectionResolver extends BaseConnectionResolver<VariantConnectionInput> {
  static node = () => VariantResolver;

  async loadData(): Promise<ConnectionData> {
    const { productId, ...args } = this.value;
    return this.ctx.kernel
      .getServices()
      .repository.variantQuery.getConnectionByProductId(productId, args);
  }
}
