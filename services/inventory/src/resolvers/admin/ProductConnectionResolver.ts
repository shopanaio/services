import type { ProductRelayInput } from "../../repositories/product/ProductRepository.js";
import { ProductResolver } from "./ProductResolver.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export type ProductConnectionInput = ProductRelayInput;

/**
 * ProductConnection - resolves paginated product list
 * Uses cursor-based pagination with Relay-style Connection spec
 */
export class ProductConnectionResolver extends BaseConnectionResolver<ProductRelayInput> {
  async $preload(): Promise<ConnectionData> {
    return this.ctx.kernel
      .getServices()
      .repository.product.getConnection(this.value);
  }

  protected createNodeResolver(nodeId: string) {
    return new ProductResolver(nodeId, this.ctx);
  }
}
