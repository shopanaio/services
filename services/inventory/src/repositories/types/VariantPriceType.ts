import { BaseType } from "@shopana/type-executor";
import type { ItemPricing } from "../models/index.js";
import type { CurrencyCode } from "../../domain/index.js";
import type { ProductTypeContext } from "./context.js";

/**
 * VariantPrice type - resolves price record
 * Accepts price ID, loads data lazily via loaders
 */
export class VariantPriceType extends BaseType<string, ItemPricing | null> {
  protected async loadData() {
    return this.ctx<ProductTypeContext>().loaders.variantPriceById.load(this.value);
  }

  id() {
    return this.value;
  }

  async currency(): Promise<CurrencyCode | null> {
    const data = await this.data;
    return (data?.currency as CurrencyCode) ?? null;
  }

  async amountMinor(): Promise<number | null> {
    return (await this.data)?.amountMinor ?? null;
  }

  async compareAtMinor(): Promise<number | null> {
    return (await this.data)?.compareAtMinor ?? null;
  }

  async effectiveFrom(): Promise<Date | null> {
    return (await this.data)?.effectiveFrom ?? null;
  }

  async effectiveTo(): Promise<Date | null> {
    return (await this.data)?.effectiveTo ?? null;
  }

  async recordedAt(): Promise<Date | null> {
    return (await this.data)?.recordedAt ?? null;
  }

  async isCurrent(): Promise<boolean> {
    const data = await this.data;
    return data?.effectiveTo === null;
  }
}
