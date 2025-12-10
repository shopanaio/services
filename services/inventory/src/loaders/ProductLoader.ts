import DataLoader from "dataloader";
import type {
  Product,
  ProductTranslation,
  ProductOption,
  ProductFeature,
} from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";

export class ProductLoader {
  public readonly product: DataLoader<string, Product | null>;
  public readonly productTranslation: DataLoader<string, ProductTranslation | null>;
  public readonly productOptionIds: DataLoader<string, string[]>;
  public readonly productFeatureIds: DataLoader<string, string[]>;
  public readonly productOption: DataLoader<string, ProductOption | null>;
  public readonly productFeature: DataLoader<string, ProductFeature | null>;

  constructor(repository: Repository) {
    this.product = new DataLoader<string, Product | null>(async (productIds) => {
      const results = await repository.product.getByIds(productIds);
      return productIds.map((id) => results.find((p) => p.id === id) ?? null);
    });

    this.productTranslation = new DataLoader<string, ProductTranslation | null>(async (productIds) => {
      const results = await repository.product.getTranslationsByProductIds(productIds);
      return productIds.map((id) => results.find((t) => t.productId === id) ?? null);
    });

    this.productOptionIds = new DataLoader<string, string[]>(async (productIds) => {
      const results = await repository.product.getOptionIdsByProductIds(productIds);
      return productIds.map((id) =>
        results.filter((o) => o.productId === id).map((o) => o.id)
      );
    });

    this.productFeatureIds = new DataLoader<string, string[]>(async (productIds) => {
      const results = await repository.product.getFeatureIdsByProductIds(productIds);
      return productIds.map((id) =>
        results.filter((f) => f.productId === id).map((f) => f.id)
      );
    });

    this.productOption = new DataLoader<string, ProductOption | null>(async (optionIds) => {
      const results = await repository.product.getOptionsByIds(optionIds);
      return optionIds.map((id) => results.find((o) => o.id === id) ?? null);
    });

    this.productFeature = new DataLoader<string, ProductFeature | null>(async (featureIds) => {
      const results = await repository.product.getFeaturesByIds(featureIds);
      return featureIds.map((id) => results.find((f) => f.id === id) ?? null);
    });
  }
}
