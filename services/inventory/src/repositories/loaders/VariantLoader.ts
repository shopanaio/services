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
} from "../models/index.js";
import type { Repository } from "../Repository.js";

export interface VariantLoaders {
  variant: DataLoader<string, Variant | null>;
  variantIds: DataLoader<string, string[]>;
  variantTranslation: DataLoader<string, VariantTranslation | null>;
  variantPricing: DataLoader<string, ItemPricing[]>;
  variantPriceById: DataLoader<string, ItemPricing | null>;
  variantPriceIds: DataLoader<string, string[]>;
  variantDimensions: DataLoader<string, ItemDimensions | null>;
  variantWeight: DataLoader<string, ItemWeight | null>;
  variantMedia: DataLoader<string, VariantMedia[]>;
  variantStock: DataLoader<string, WarehouseStock[]>;
  variantSelectedOptions: DataLoader<string, ProductOptionVariantLink[]>;
}

export class VariantLoader {
  constructor(private readonly repository: Repository) {}

  createLoaders(): VariantLoaders {
    return {
      variant: this.createVariantLoader(),
      variantIds: this.createVariantIdsLoader(),
      variantTranslation: this.createVariantTranslationLoader(),
      variantPricing: this.createVariantPricingLoader(),
      variantPriceById: this.createVariantPriceByIdLoader(),
      variantPriceIds: this.createVariantPriceIdsLoader(),
      variantDimensions: this.createVariantDimensionsLoader(),
      variantWeight: this.createVariantWeightLoader(),
      variantMedia: this.createVariantMediaLoader(),
      variantStock: this.createVariantStockLoader(),
      variantSelectedOptions: this.createVariantSelectedOptionsLoader(),
    };
  }

  private createVariantLoader(): DataLoader<string, Variant | null> {
    return new DataLoader<string, Variant | null>(async (variantIds) => {
      const results = await this.repository.variantLoaderQuery.getByIds(variantIds);
      return variantIds.map((id) => results.find((v) => v.id === id) ?? null);
    });
  }

  private createVariantIdsLoader(): DataLoader<string, string[]> {
    return new DataLoader<string, string[]>(async (productIds) => {
      const results = await this.repository.variantLoaderQuery.getIdsByProductIds(productIds);
      return productIds.map((id) =>
        results.filter((v) => v.productId === id).map((v) => v.id)
      );
    });
  }

  private createVariantTranslationLoader(): DataLoader<string, VariantTranslation | null> {
    return new DataLoader<string, VariantTranslation | null>(async (variantIds) => {
      const results = await this.repository.variantLoaderQuery.getTranslationsByVariantIds(variantIds);
      return variantIds.map(
        (id) => results.find((t) => t.variantId === id) ?? null
      );
    });
  }

  private createVariantPricingLoader(): DataLoader<string, ItemPricing[]> {
    return new DataLoader<string, ItemPricing[]>(async (variantIds) => {
      const results = await this.repository.variantLoaderQuery.getActivePricingByVariantIds(variantIds);
      return variantIds.map((id) => results.filter((p) => p.variantId === id));
    });
  }

  private createVariantPriceByIdLoader(): DataLoader<string, ItemPricing | null> {
    return new DataLoader<string, ItemPricing | null>(async (priceIds) => {
      const results = await this.repository.variantLoaderQuery.getPricingByIds(priceIds);
      return priceIds.map((id) => results.find((p) => p.id === id) ?? null);
    });
  }

  private createVariantPriceIdsLoader(): DataLoader<string, string[]> {
    return new DataLoader<string, string[]>(async (variantIds) => {
      const results = await this.repository.variantLoaderQuery.getPriceIdsByVariantIds(variantIds);
      return variantIds.map((id) =>
        results.filter((p) => p.variantId === id).map((p) => p.id)
      );
    });
  }

  private createVariantDimensionsLoader(): DataLoader<string, ItemDimensions | null> {
    return new DataLoader<string, ItemDimensions | null>(async (variantIds) => {
      const results = await this.repository.variantLoaderQuery.getDimensionsByVariantIds(variantIds);
      return variantIds.map(
        (id) => results.find((d) => d.variantId === id) ?? null
      );
    });
  }

  private createVariantWeightLoader(): DataLoader<string, ItemWeight | null> {
    return new DataLoader<string, ItemWeight | null>(async (variantIds) => {
      const results = await this.repository.variantLoaderQuery.getWeightsByVariantIds(variantIds);
      return variantIds.map(
        (id) => results.find((w) => w.variantId === id) ?? null
      );
    });
  }

  private createVariantMediaLoader(): DataLoader<string, VariantMedia[]> {
    return new DataLoader<string, VariantMedia[]>(async (variantIds) => {
      const results = await this.repository.variantLoaderQuery.getMediaByVariantIds(variantIds);
      return variantIds.map((id) =>
        results.filter((m) => m.variantId === id).sort((a, b) => a.sortIndex - b.sortIndex)
      );
    });
  }

  private createVariantStockLoader(): DataLoader<string, WarehouseStock[]> {
    return new DataLoader<string, WarehouseStock[]>(async (variantIds) => {
      const results = await this.repository.variantLoaderQuery.getStockByVariantIds(variantIds);
      return variantIds.map((id) => results.filter((s) => s.variantId === id));
    });
  }

  private createVariantSelectedOptionsLoader(): DataLoader<string, ProductOptionVariantLink[]> {
    return new DataLoader<string, ProductOptionVariantLink[]>(async (variantIds) => {
      const results = await this.repository.variantLoaderQuery.getSelectedOptionsByVariantIds(variantIds);
      return variantIds.map((id) =>
        results.filter((o) => o.variantId === id)
      );
    });
  }
}
