import DataLoader from "dataloader";
import type {
  Variant,
  VariantTranslation,
  ItemPricing,
  ItemDimensions,
  ItemWeight,
  VariantMedia,
  WarehouseStock,
  ProductOptionVariantLink,
} from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";

export class VariantLoader {
  public readonly variant: DataLoader<string, Variant | null>;
  public readonly variantIds: DataLoader<string, string[]>;
  public readonly variantTranslation: DataLoader<string, VariantTranslation | null>;
  public readonly variantPricing: DataLoader<string, ItemPricing[]>;
  public readonly variantPriceById: DataLoader<string, ItemPricing | null>;
  public readonly variantPriceIds: DataLoader<string, string[]>;
  public readonly variantDimensions: DataLoader<string, ItemDimensions | null>;
  public readonly variantWeight: DataLoader<string, ItemWeight | null>;
  public readonly variantMedia: DataLoader<string, VariantMedia[]>;
  public readonly variantStock: DataLoader<string, WarehouseStock[]>;
  public readonly variantSelectedOptions: DataLoader<string, ProductOptionVariantLink[]>;

  constructor(repository: Repository) {
    this.variant = new DataLoader<string, Variant | null>(async (variantIds) => {
      const results = await repository.variantLoaderQuery.getByIds(variantIds);
      return variantIds.map((id) => results.find((v) => v.id === id) ?? null);
    });

    this.variantIds = new DataLoader<string, string[]>(async (productIds) => {
      const results = await repository.variantLoaderQuery.getIdsByProductIds(productIds);
      return productIds.map((id) =>
        results.filter((v) => v.productId === id).map((v) => v.id)
      );
    });

    this.variantTranslation = new DataLoader<string, VariantTranslation | null>(async (variantIds) => {
      const results = await repository.variantLoaderQuery.getTranslationsByVariantIds(variantIds);
      return variantIds.map((id) => results.find((t) => t.variantId === id) ?? null);
    });

    this.variantPricing = new DataLoader<string, ItemPricing[]>(async (variantIds) => {
      const results = await repository.variantLoaderQuery.getActivePricingByVariantIds(variantIds);
      return variantIds.map((id) => results.filter((p) => p.variantId === id));
    });

    this.variantPriceById = new DataLoader<string, ItemPricing | null>(async (priceIds) => {
      const results = await repository.variantLoaderQuery.getPricingByIds(priceIds);
      return priceIds.map((id) => results.find((p) => p.id === id) ?? null);
    });

    this.variantPriceIds = new DataLoader<string, string[]>(async (variantIds) => {
      const results = await repository.variantLoaderQuery.getPriceIdsByVariantIds(variantIds);
      return variantIds.map((id) =>
        results.filter((p) => p.variantId === id).map((p) => p.id)
      );
    });

    this.variantDimensions = new DataLoader<string, ItemDimensions | null>(async (variantIds) => {
      const results = await repository.variantLoaderQuery.getDimensionsByVariantIds(variantIds);
      return variantIds.map((id) => results.find((d) => d.variantId === id) ?? null);
    });

    this.variantWeight = new DataLoader<string, ItemWeight | null>(async (variantIds) => {
      const results = await repository.variantLoaderQuery.getWeightsByVariantIds(variantIds);
      return variantIds.map((id) => results.find((w) => w.variantId === id) ?? null);
    });

    this.variantMedia = new DataLoader<string, VariantMedia[]>(async (variantIds) => {
      const results = await repository.variantLoaderQuery.getMediaByVariantIds(variantIds);
      return variantIds.map((id) =>
        results.filter((m) => m.variantId === id).sort((a, b) => a.sortIndex - b.sortIndex)
      );
    });

    this.variantStock = new DataLoader<string, WarehouseStock[]>(async (variantIds) => {
      const results = await repository.variantLoaderQuery.getStockByVariantIds(variantIds);
      return variantIds.map((id) => results.filter((s) => s.variantId === id));
    });

    this.variantSelectedOptions = new DataLoader<string, ProductOptionVariantLink[]>(async (variantIds) => {
      const results = await repository.variantLoaderQuery.getSelectedOptionsByVariantIds(variantIds);
      return variantIds.map((id) => results.filter((o) => o.variantId === id));
    });
  }
}
