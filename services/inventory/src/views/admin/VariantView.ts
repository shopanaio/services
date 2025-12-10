import { BaseType } from "@shopana/type-executor";
import type {
  SelectedOption,
  VariantDimensions,
  VariantMediaItem,
  VariantPrice,
  VariantWeight,
  WarehouseStock,
} from "./interfaces/index.js";
import type { Variant } from "../../repositories/models/index.js";
import type {
  VariantCostHistoryArgs,
  VariantPriceHistoryArgs,
} from "./args.js";
import { VariantPriceView } from "./VariantPriceView.js";
import { InventoryContext } from "../../context/types.js";

/**
 * Variant view - resolves Variant domain interface
 * Accepts variant ID, loads main entity via loaders (lazy)
 * Related data (pricing, stock, etc.) loaded on demand via resolvers
 */
export class VariantView extends BaseType<
  string,
  Variant | null,
  InventoryContext
> {
  static fields = {
    priceHistory: () => VariantPriceView,
  };

  async loadData() {
    return this.ctx.loaders.variant.load(this.value);
  }

  id() {
    return this.value;
  }

  async productId() {
    return this.get("productId");
  }

  async isDefault() {
    return (await this.get("isDefault")) ?? false;
  }

  async handle() {
    return (await this.get("handle")) ?? "";
  }

  async sku() {
    return this.get("sku");
  }

  async externalSystem() {
    return this.get("externalSystem");
  }

  async externalId() {
    return this.get("externalId");
  }

  async createdAt() {
    return this.get("createdAt");
  }

  async updatedAt() {
    return this.get("updatedAt");
  }

  async deletedAt() {
    return this.get("deletedAt");
  }

  async title() {
    const translation = await this.ctx.loaders.variantTranslation.load(
      this.value
    );
    return translation?.title ?? null;
  }

  async price(): Promise<VariantPrice | null> {
    const prices = await this.ctx.loaders.variantPricing.load(this.value);

    // Filter by currency if specified
    let filtered = prices;
    if (this.ctx.currency) {
      filtered = prices.filter((p) => p.currency === this.ctx.currency);
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
  async priceHistory(args: VariantPriceHistoryArgs): Promise<string[]> {
    return this.ctx.queries.variantPriceIds(this.value, args);
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
    const links = await this.ctx.loaders.variantSelectedOptions.load(
      this.value
    );
    return links
      .filter((link) => link.optionValueId !== null)
      .map((link) => ({
        optionId: link.optionId,
        optionValueId: link.optionValueId!,
      }));
  }

  async dimensions(): Promise<VariantDimensions | null> {
    const dims = await this.ctx.loaders.variantDimensions.load(this.value);
    if (!dims) return null;

    return {
      width: dims.wMm,
      length: dims.lMm,
      height: dims.hMm,
    };
  }

  async weight(): Promise<VariantWeight | null> {
    const w = await this.ctx.loaders.variantWeight.load(this.value);
    if (!w) return null;

    return {
      value: w.weightGr,
    };
  }

  async stock(): Promise<WarehouseStock[]> {
    const stocks = await this.ctx.loaders.variantStock.load(this.value);
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
    const stocks = await this.ctx.loaders.variantStock.load(this.value);
    return stocks.some((s) => s.quantityOnHand > 0);
  }

  async media(): Promise<VariantMediaItem[]> {
    const mediaItems = await this.ctx.loaders.variantMedia.load(this.value);
    return mediaItems.map((m) => ({
      fileId: m.fileId,
      sortIndex: m.sortIndex,
    }));
  }
}
