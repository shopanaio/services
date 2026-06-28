import { ProductResolver } from "./ProductResolver.js";
import type { Product } from "../../repositories/models/index.js";

/**
 * Bundle is a product-backed sellable item with product.kind = BUNDLE.
 * Shared listing/product fields are resolved by ProductResolver.
 */
export class BundleResolver extends ProductResolver {
  async $preload(): Promise<Product> {
    const product = await super.$preload();
    if (product.kind !== "BUNDLE") {
      throw new Error(`Product with ID ${this.$props} is not a bundle`);
    }
    return product;
  }

  async type() {
    const bundle = await this.$ctx.loaders.bundleByProductId.load(this.$props);
    return bundle?.type ?? null;
  }

  async displayStyle() {
    const bundle = await this.$ctx.loaders.bundleByProductId.load(this.$props);
    return bundle?.displayStyle ?? "ACCORDION";
  }
}
