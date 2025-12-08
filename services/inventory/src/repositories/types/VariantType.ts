import { BaseType } from "@shopana/type-executor";
import type {
  VariantPrice,
  VariantDimensions,
  VariantWeight,
  WarehouseStock,
  SelectedOption,
  VariantMediaItem,
} from "../../domain/index.js";
import type { ProductTypeContext } from "./context.js";

/**
 * Variant type - resolves Variant domain interface
 * Accepts variant ID, loads all data via loaders
 */
export class VariantType extends BaseType<string> {
  id() {
    return this.value;
  }

  async productId() {
    const ctx = this.ctx<ProductTypeContext>();
    const variant = await ctx.loaders.variant.load(this.value);
    return variant?.productId ?? null;
  }

  async isDefault() {
    const ctx = this.ctx<ProductTypeContext>();
    const variant = await ctx.loaders.variant.load(this.value);
    return variant?.isDefault ?? false;
  }

  async handle() {
    const ctx = this.ctx<ProductTypeContext>();
    const variant = await ctx.loaders.variant.load(this.value);
    return variant?.handle ?? "";
  }

  async sku() {
    const ctx = this.ctx<ProductTypeContext>();
    const variant = await ctx.loaders.variant.load(this.value);
    return variant?.sku ?? null;
  }

  async externalSystem() {
    const ctx = this.ctx<ProductTypeContext>();
    const variant = await ctx.loaders.variant.load(this.value);
    return variant?.externalSystem ?? null;
  }

  async externalId() {
    const ctx = this.ctx<ProductTypeContext>();
    const variant = await ctx.loaders.variant.load(this.value);
    return variant?.externalId ?? null;
  }

  async createdAt() {
    const ctx = this.ctx<ProductTypeContext>();
    const variant = await ctx.loaders.variant.load(this.value);
    return variant?.createdAt ?? null;
  }

  async updatedAt() {
    const ctx = this.ctx<ProductTypeContext>();
    const variant = await ctx.loaders.variant.load(this.value);
    return variant?.updatedAt ?? null;
  }

  async deletedAt() {
    const ctx = this.ctx<ProductTypeContext>();
    const variant = await ctx.loaders.variant.load(this.value);
    return variant?.deletedAt ?? null;
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

  async cost() {
    // Cost loader not implemented yet
    return null;
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
    const stocks = await this.stock();
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
