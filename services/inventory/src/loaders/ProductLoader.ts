import DataLoader from "dataloader";
import type {
  Product,
  ProductTranslation,
  ProductOption,
  ProductFeature,
} from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";

export interface ProductDataLoaders {
  product: DataLoader<string, Product | null>;
  productTranslation: DataLoader<string, ProductTranslation | null>;
  productOptionIds: DataLoader<string, string[]>;
  productFeatureIds: DataLoader<string, string[]>;
  productOption: DataLoader<string, ProductOption | null>;
  productFeature: DataLoader<string, ProductFeature | null>;
}

export class ProductLoader {
  constructor(private readonly repository: Repository) {}

  createLoaders(): ProductDataLoaders {
    return {
      product: this.createProductLoader(),
      productTranslation: this.createProductTranslationLoader(),
      productOptionIds: this.createProductOptionIdsLoader(),
      productFeatureIds: this.createProductFeatureIdsLoader(),
      productOption: this.createProductOptionLoader(),
      productFeature: this.createProductFeatureLoader(),
    };
  }

  private createProductLoader(): DataLoader<string, Product | null> {
    return new DataLoader<string, Product | null>(async (productIds) => {
      const results = await this.repository.productLoaderQuery.getByIds(productIds);
      return productIds.map(
        (id) => results.find((p) => p.id === id) ?? null
      );
    });
  }

  private createProductTranslationLoader(): DataLoader<string, ProductTranslation | null> {
    return new DataLoader<string, ProductTranslation | null>(async (productIds) => {
      const results = await this.repository.productLoaderQuery.getTranslationsByProductIds(productIds);
      return productIds.map(
        (id) => results.find((t) => t.productId === id) ?? null
      );
    });
  }

  private createProductOptionIdsLoader(): DataLoader<string, string[]> {
    return new DataLoader<string, string[]>(async (productIds) => {
      const results = await this.repository.productLoaderQuery.getOptionIdsByProductIds(productIds);
      return productIds.map((id) =>
        results.filter((o) => o.productId === id).map((o) => o.id)
      );
    });
  }

  private createProductFeatureIdsLoader(): DataLoader<string, string[]> {
    return new DataLoader<string, string[]>(async (productIds) => {
      const results = await this.repository.productLoaderQuery.getFeatureIdsByProductIds(productIds);
      return productIds.map((id) =>
        results.filter((f) => f.productId === id).map((f) => f.id)
      );
    });
  }

  private createProductOptionLoader(): DataLoader<string, ProductOption | null> {
    return new DataLoader<string, ProductOption | null>(async (optionIds) => {
      const results = await this.repository.productLoaderQuery.getOptionsByIds(optionIds);
      return optionIds.map((id) => results.find((o) => o.id === id) ?? null);
    });
  }

  private createProductFeatureLoader(): DataLoader<string, ProductFeature | null> {
    return new DataLoader<string, ProductFeature | null>(async (featureIds) => {
      const results = await this.repository.productLoaderQuery.getFeaturesByIds(featureIds);
      return featureIds.map((id) => results.find((f) => f.id === id) ?? null);
    });
  }
}
