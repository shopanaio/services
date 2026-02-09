import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import type { ItemPricing } from "../../repositories/models/index.js";
import type { CurrencyCode } from "./interfaces/index.js";
import { CatalogType } from "./CatalogType.js";

/**
 * VariantPrice view - resolves price record
 * Accepts price ID, loads data lazily via loaders
 */
export class VariantPriceResolver extends CatalogType<
  string,
  ItemPricing
> {
  async $preload() {
    const price = await this.$ctx.loaders.variantPriceById.load(this.$props);
    if (!price) {
      throw new Error(`Price with ID ${this.$props} not found`);
    }
    return price;
  }

  id() {
    return encodeGlobalIdByType(this.$props, GlobalIdEntity.VariantPrice);
  }

  async currency(): Promise<CurrencyCode | null> {
    const currency = await this.$get("currency");
    return (currency as CurrencyCode) ?? null;
  }

  async amountMinor(): Promise<number | null> {
    return this.$get("amountMinor");
  }

  async compareAtMinor(): Promise<number | null> {
    return this.$get("compareAtMinor");
  }

  async effectiveFrom(): Promise<string | null> {
    return this.$get("effectiveFrom");
  }

  async effectiveTo(): Promise<string | null> {
    return this.$get("effectiveTo");
  }

  async recordedAt(): Promise<string | null> {
    return this.$get("recordedAt");
  }

  async isCurrent(): Promise<boolean> {
    const effectiveTo = await this.$get("effectiveTo");
    return effectiveTo === null;
  }
}
