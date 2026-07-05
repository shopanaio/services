import type {
  CatalogProductAvailabilitySnapshot,
  CatalogProductVariantPriceSnapshot,
} from "@shopana/broker-types";
import { CatalogProductAvailabilitySnapshotResolver } from "./CatalogProductAvailabilitySnapshotResolver.js";
import { CatalogProductVariantOptionSelectionSnapshotResolver } from "./CatalogProductVariantOptionSelectionSnapshotResolver.js";
import { CatalogProductVariantPriceSnapshotResolver } from "./CatalogProductVariantPriceSnapshotResolver.js";
import { ServiceType } from "./ServiceType.js";

export class CatalogProductVariantSnapshotResolver extends ServiceType<
  string,
  {
    id: string;
    handle: string;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
    availability: CatalogProductAvailabilitySnapshot;
    prices: CatalogProductVariantPriceSnapshot[];
    options: Array<{
      id?: string;
      handle: string;
      values: Array<{
        id?: string;
        handle: string;
      }>;
    }>;
  }
> {
  protected async $preload() {
    const variant = await this.$ctx.loaders.variant.load(this.$props);
    if (!variant) {
      throw new Error(`Variant with ID ${this.$props} not found`);
    }

    const [prices, optionSelections] = await Promise.all([
      this.createPriceSnapshots(),
      this.createOptionSelectionSnapshots(),
    ]);

    return {
      id: variant.id,
      handle: variant.handle,
      isDefault: variant.isDefault,
      createdAt: variant.createdAt,
      updatedAt: variant.updatedAt,
      availability: await new CatalogProductAvailabilitySnapshotResolver(
        { variantId: variant.id },
        this.$ctx
      ).$snapshot(),
      prices,
      options: optionSelections,
    };
  }

  async id(): Promise<string> {
    return this.$get("id");
  }

  async handle(): Promise<string> {
    return this.$get("handle");
  }

  async isDefault(): Promise<boolean> {
    return this.$get("isDefault");
  }

  async createdAt(): Promise<string> {
    return this.$get("createdAt");
  }

  async updatedAt(): Promise<string> {
    return this.$get("updatedAt");
  }

  async availability(): Promise<CatalogProductAvailabilitySnapshotResolver> {
    return new CatalogProductAvailabilitySnapshotResolver(
      { variantId: this.$props },
      this.$ctx
    );
  }

  async prices(): Promise<CatalogProductVariantPriceSnapshotResolver[]> {
    const prices = await this.$ctx.loaders.variantPricing.load(this.$props);
    const filtered = this.$ctx.currency
      ? prices.filter((price) => price.currency === this.$ctx.currency)
      : prices;

    return filtered.map(
      (price) => new CatalogProductVariantPriceSnapshotResolver(price.id, this.$ctx)
    );
  }

  async options(): Promise<
    CatalogProductVariantOptionSelectionSnapshotResolver[]
  > {
    const links = await this.$ctx.loaders.variantSelectedOptions.load(this.$props);
    const optionIds = [...new Set(links.map((link) => link.optionId))];
    return optionIds.map(
      (optionId) =>
        new CatalogProductVariantOptionSelectionSnapshotResolver(
          { variantId: this.$props, optionId },
          this.$ctx
        )
    );
  }

  async $snapshot() {
    return this.$data;
  }

  private async createPriceSnapshots(): Promise<
    CatalogProductVariantPriceSnapshot[]
  > {
    const resolvers = await this.prices();
    return Promise.all(resolvers.map((resolver) => resolver.$snapshot()));
  }

  private async createOptionSelectionSnapshots() {
    const resolvers = await this.options();
    return Promise.all(resolvers.map((resolver) => resolver.$snapshot()));
  }
}
