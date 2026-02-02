import DataLoader from "dataloader";
import type {
  Variant,
  VariantTranslation,
  ItemPricing,
  VariantMedia,
  ProductOptionVariantLink,
} from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";

/**
 * VariantLoader для Catalog Service.
 * НЕ содержит inventory-related loaders (cost, dimensions, weight, stock).
 * Эти данные загружаются в Inventory Service.
 */
export class VariantLoader {
  public readonly variant: DataLoader<string, Variant | null>;
  public readonly variantIds: DataLoader<string, string[]>;
  public readonly variantTranslation: DataLoader<string, VariantTranslation | null>;
  public readonly variantPricing: DataLoader<string, ItemPricing[]>;
  public readonly variantPriceById: DataLoader<string, ItemPricing | null>;
  public readonly variantPriceIds: DataLoader<string, string[]>;
  public readonly variantMedia: DataLoader<string, VariantMedia[]>;
  public readonly variantSelectedOptions: DataLoader<string, ProductOptionVariantLink[]>;

  constructor(repository: Repository) {
    this.variant = new DataLoader<string, Variant | null>(async (variantIds) => {
      const results = await repository.variant.getByIds(variantIds);
      return variantIds.map((id) => results.find((v) => v.id === id) ?? null);
    });

    this.variantIds = new DataLoader<string, string[]>(async (productIds) => {
      const results = await repository.variant.getIdsByProductIds(productIds);
      return productIds.map((id) =>
        results.filter((v) => v.productId === id).map((v) => v.id)
      );
    });

    this.variantTranslation = new DataLoader<string, VariantTranslation | null>(async (variantIds) => {
      const results = await repository.variant.getTranslationsByVariantIds(variantIds);
      return variantIds.map((id) => results.find((t) => t.variantId === id) ?? null);
    });

    this.variantPricing = new DataLoader<string, ItemPricing[]>(async (variantIds) => {
      const results = await repository.variant.getActivePricingByVariantIds(variantIds);
      return variantIds.map((id) => results.filter((p) => p.variantId === id));
    });

    this.variantPriceById = new DataLoader<string, ItemPricing | null>(async (priceIds) => {
      const results = await repository.variant.getPricingByIds(priceIds);
      return priceIds.map((id) => results.find((p) => p.id === id) ?? null);
    });

    this.variantPriceIds = new DataLoader<string, string[]>(async (variantIds) => {
      const results = await repository.variant.getPriceIdsByVariantIds(variantIds);
      return variantIds.map((id) =>
        results.filter((p) => p.variantId === id).map((p) => p.id)
      );
    });

    this.variantMedia = new DataLoader<string, VariantMedia[]>(async (variantIds) => {
      const results = await repository.variant.getMediaByVariantIds(variantIds);
      return variantIds.map((id) =>
        results.filter((m) => m.variantId === id).sort((a, b) => a.sortIndex - b.sortIndex)
      );
    });

    this.variantSelectedOptions = new DataLoader<string, ProductOptionVariantLink[]>(async (variantIds) => {
      const results = await repository.variant.getSelectedOptionsByVariantIds(variantIds);
      return variantIds.map((id) => results.filter((o) => o.variantId === id));
    });
  }
}
