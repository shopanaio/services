import { BaseType } from "@shopana/type-executor";
import type { ItemPricing } from "../../repositories/models/index.js";
import type { CurrencyCode } from "./interfaces/index.js";

/**
 * VariantPrice view - resolves price record
 * Accepts price ID, loads data lazily via loaders
 */
export class VariantPriceView extends BaseType<string, ItemPricing | null> {
  async loadData() {
    return this.ctx.loaders.variantPriceById.load(this.value);
  }

  id() {
    return this.value;
  }

  async currency(): Promise<CurrencyCode | null> {
    const currency = await this.get("currency");
    return (currency as CurrencyCode) ?? null;
  }

  async amountMinor(): Promise<number | null> {
    return this.get("amountMinor");
  }

  async compareAtMinor(): Promise<number | null> {
    return this.get("compareAtMinor");
  }

  async effectiveFrom(): Promise<Date | null> {
    return this.get("effectiveFrom");
  }

  async effectiveTo(): Promise<Date | null> {
    return this.get("effectiveTo");
  }

  async recordedAt(): Promise<Date | null> {
    return this.get("recordedAt");
  }

  async isCurrent(): Promise<boolean> {
    const effectiveTo = await this.get("effectiveTo");
    return effectiveTo === null;
  }
}
