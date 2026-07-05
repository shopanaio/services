import { ServiceType } from "./ServiceType.js";
import { ProductSnapshotResolver } from "./ProductSnapshotResolver.js";

export interface ServiceQueryProductsArgs {
  productIds: string[];
}

export class ServiceQueryResolver extends ServiceType<Record<string, never>> {
  async products(args: ServiceQueryProductsArgs): Promise<ProductSnapshotResolver[]> {
    const uniqueProductIds = [...new Set(args.productIds)];
    const existingProducts =
      await this.$ctx.kernel.repository.product.getByIds(uniqueProductIds);
    const existingProductIds = new Set(
      existingProducts.map((product) => product.id)
    );

    return uniqueProductIds
      .filter((id) => existingProductIds.has(id))
      .map((id) => new ProductSnapshotResolver(id, this.$ctx));
  }
}
