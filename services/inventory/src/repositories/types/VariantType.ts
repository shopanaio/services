import { BaseType } from "@shopana/type-executor";
import type { Variant } from "../models/index.js";
import type {
  VariantPrice,
  VariantDimensions,
  VariantWeight,
  WarehouseStock,
  SelectedOption,
  VariantMediaItem,
} from "../../domain/index.js";
import type { ProductTypeContext } from "./context.js";
import type { VariantPriceHistoryArgs, VariantCostHistoryArgs } from "./args.js";
import { VariantPriceType } from "./VariantPriceType.js";

/**
 * Variant type - resolves Variant domain interface
 * Accepts variant ID, loads main entity via loaders (lazy)
 * Related data (pricing, stock, etc.) loaded on demand via resolvers
 */
export class VariantType extends BaseType<string, Variant | null> {
  static fields = {
    priceHistory: () => VariantPriceType,
  };

  protected async loadData() {
    return this.ctx<ProductTypeContext>().loaders.variant.load(this.value);
  }

  id() {
    return this.value;
  }

  async productId() {
    return (await this.data)?.productId ?? null;
  }

  async isDefault() {
    return (await this.data)?.isDefault ?? false;
  }

  async handle() {
    return (await this.data)?.handle ?? "";
  }

  async sku() {
    return (await this.data)?.sku ?? null;
  }

  async externalSystem() {
    return (await this.data)?.externalSystem ?? null;
  }

  async externalId() {
    return (await this.data)?.externalId ?? null;
  }

  async createdAt() {
    return (await this.data)?.createdAt ?? null;
  }

  async updatedAt() {
    return (await this.data)?.updatedAt ?? null;
  }

  async deletedAt() {
    return (await this.data)?.deletedAt ?? null;
  }

  async title() {
    const ctx = this.ctx<ProductTypeContext>();
    const translation = await ctx.loaders.variantTranslation.load(this.value);
    return translation?.title ?? null;
  }

  async price(): Promise<VariantPrice | null> {
    const ctx = this.ctx<ProductTypeContext>();
    const prices = await ctx.loaders.variantPricing.load(this.value);

    // Filter by currency if specified
    let filtered = prices;
    if (ctx.currency) {
      filtered = prices.filter((p) => p.currency === ctx.currency);
    }

    if (filtered.length === 0) return null;

    // Get current active price
    const current = filtered[0];
    return {
      id: current.id,
      currency: current.currency as "UAH" | "USD" | "EUR",
      amountMinor: current.amountMinor,
      compareAtMinor: current.compareAtMinor,
      effectiveFrom: current.effectiveFrom,
      effectiveTo: current.effectiveTo,
      recordedAt: current.recordedAt,
      isCurrent: current.effectiveTo === null,
    };
  }

  /**
   * Returns price history IDs for this variant
   * @param args - Pagination arguments (first, last, after, before)
   */
  async priceHistory(args?: VariantPriceHistoryArgs): Promise<string[]> {
    const ctx = this.ctx<ProductTypeContext>();
    return ctx.queries.variantPriceIds(this.value, args);
  }

  // TODO: implement cost() when cost loader is available
  // cost(): Promise<string | null>

  /**
   * Returns cost history IDs for this variant
   * @param args - Pagination arguments (first, last, after, before)
   */
  async costHistory(_args?: VariantCostHistoryArgs): Promise<string[]> {
    // Cost loader not implemented yet
    return [];
  }

  async selectedOptions(): Promise<SelectedOption[]> {
    const ctx = this.ctx<ProductTypeContext>();
    const links = await ctx.loaders.variantSelectedOptions.load(this.value);
    return links
      .filter((link) => link.optionValueId !== null)
      .map((link) => ({
        optionId: link.optionId,
        optionValueId: link.optionValueId!,
      }));
  }

  async dimensions(): Promise<VariantDimensions | null> {
    const ctx = this.ctx<ProductTypeContext>();
    const dims = await ctx.loaders.variantDimensions.load(this.value);
    if (!dims) return null;

    return {
      width: dims.wMm,
      length: dims.lMm,
      height: dims.hMm,
    };
  }

  async weight(): Promise<VariantWeight | null> {
    const ctx = this.ctx<ProductTypeContext>();
    const w = await ctx.loaders.variantWeight.load(this.value);
    if (!w) return null;

    return {
      value: w.weightGr,
    };
  }

  async stock(): Promise<WarehouseStock[]> {
    const ctx = this.ctx<ProductTypeContext>();
    const stocks = await ctx.loaders.variantStock.load(this.value);
    return stocks.map((s) => ({
      id: s.id,
      warehouseId: s.warehouseId,
      variantId: s.variantId,
      quantityOnHand: s.quantityOnHand,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  }

  async inStock(): Promise<boolean> {
    const ctx = this.ctx<ProductTypeContext>();
    const stocks = await ctx.loaders.variantStock.load(this.value);
    return stocks.some((s) => s.quantityOnHand > 0);
  }

  async media(): Promise<VariantMediaItem[]> {
    const ctx = this.ctx<ProductTypeContext>();
    const mediaItems = await ctx.loaders.variantMedia.load(this.value);
    return mediaItems.map((m) => ({
      fileId: m.fileId,
      sortIndex: m.sortIndex,
    }));
  }
}
