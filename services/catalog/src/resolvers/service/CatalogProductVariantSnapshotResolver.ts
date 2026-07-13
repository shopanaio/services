import type {
  CatalogProductAvailabilitySnapshot,
  CatalogProductVariantInventoryItemSnapshot,
  CatalogProductVariantPriceSnapshot,
  CatalogVariantLocalizedContentSnapshot,
} from "@shopana/broker-types";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import { CatalogProductAvailabilitySnapshotResolver } from "./CatalogProductAvailabilitySnapshotResolver.js";
import { CatalogProductVariantOptionSelectionSnapshotResolver } from "./CatalogProductVariantOptionSelectionSnapshotResolver.js";
import { CatalogProductVariantInventoryItemSnapshotResolver } from "./CatalogProductVariantInventoryItemSnapshotResolver.js";
import { CatalogProductVariantPriceSnapshotResolver } from "./CatalogProductVariantPriceSnapshotResolver.js";
import { CatalogVariantLocalizedContentSnapshotResolver } from "./CatalogVariantLocalizedContentSnapshotResolver.js";
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
    content: CatalogVariantLocalizedContentSnapshot[];
    inventoryItem: CatalogProductVariantInventoryItemSnapshot | null;
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
      throw new PreloadNotFoundError(
        `Variant with ID ${this.$props} not found`
      );
    }

    const [prices, optionSelections, content, inventoryItem] = await Promise.all([
      this.createPriceSnapshots(),
      this.createOptionSelectionSnapshots(),
      this.createContentSnapshots(),
      this.createInventoryItemSnapshot(),
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
      content,
      inventoryItem,
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

  async content(): Promise<CatalogVariantLocalizedContentSnapshotResolver[]> {
    const translations = await this.$ctx.loaders.variantTranslations.load(
      this.$props
    );
    return translations
      .filter(
        (translation) =>
          typeof translation.title === "string" &&
          translation.title.trim().length > 0
      )
      .sort((left, right) => left.locale.localeCompare(right.locale))
      .map(
        (translation) =>
          new CatalogVariantLocalizedContentSnapshotResolver(
            { variantId: this.$props, locale: translation.locale },
            this.$ctx
          )
      );
  }

  async inventoryItem(): Promise<CatalogProductVariantInventoryItemSnapshotResolver | null> {
    const inventoryItem = await this.$ctx.loaders.inventoryItemByVariant.load(
      this.$props
    );
    return inventoryItem
      ? new CatalogProductVariantInventoryItemSnapshotResolver(
          this.$props,
          this.$ctx
        )
      : null;
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

  private async createContentSnapshots(): Promise<
    CatalogVariantLocalizedContentSnapshot[]
  > {
    const resolvers = await this.content();
    return Promise.all(resolvers.map((resolver) => resolver.$snapshot()));
  }

  private async createInventoryItemSnapshot(): Promise<
    CatalogProductVariantInventoryItemSnapshot | null
  > {
    const resolver = await this.inventoryItem();
    return resolver ? resolver.$snapshot() : null;
  }
}
