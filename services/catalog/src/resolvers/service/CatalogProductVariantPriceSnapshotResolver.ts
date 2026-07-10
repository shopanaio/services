import type { CatalogProductVariantPriceSnapshot } from "@shopana/broker-types";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import { ServiceType } from "./ServiceType.js";

export class CatalogProductVariantPriceSnapshotResolver extends ServiceType<
  string,
  CatalogProductVariantPriceSnapshot
> {
  protected async $preload(): Promise<CatalogProductVariantPriceSnapshot> {
    const price = await this.$ctx.loaders.variantPriceById.load(this.$props);
    if (!price) {
      throw new PreloadNotFoundError(
        `Variant price with ID ${this.$props} not found`
      );
    }

    return {
      currencyCode: price.currency,
      amountMinor: price.amountMinor,
    };
  }

  async currencyCode(): Promise<string> {
    return this.$get("currencyCode");
  }

  async amountMinor(): Promise<number | null> {
    return (await this.$get("amountMinor")) ?? null;
  }

  async $snapshot() {
    return this.$data;
  }
}
