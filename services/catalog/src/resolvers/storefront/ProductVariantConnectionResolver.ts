import type { VariantRelayInput } from "../../repositories/variant/VariantRepository.js";
import type { ProductVariantsArgs } from "./generated/types.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export type ProductVariantConnectionInput = ProductVariantsArgs & {
  productId: string;
};

export class ProductVariantConnectionResolver extends BaseConnectionResolver<ProductVariantConnectionInput> {
  async $preload(): Promise<ConnectionData> {
    const { productId, ...pagination } = this.$props;
    return this.$ctx.kernel.repository.variant.getConnectionByProductId(productId, {
      ...pagination,
      orderBy: [
        { field: "isDefault", direction: "desc" },
        { field: "createdAt", direction: "asc" },
        { field: "id", direction: "asc" },
      ],
    } as VariantRelayInput);
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.productVariant(nodeId);
  }
}
