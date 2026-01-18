import DataLoader from "dataloader";
import type {
  ProductFeatureTranslation,
  ProductFeatureValue,
  ProductFeatureValueTranslation,
} from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";

export type FeatureChildrenKey = { productId: string; parentId: string };

export class FeatureLoader {
  public readonly featureTranslation: DataLoader<string, ProductFeatureTranslation | null>;
  public readonly featureValueIds: DataLoader<string, string[]>;
  public readonly featureValue: DataLoader<string, ProductFeatureValue | null>;
  public readonly featureValueTranslation: DataLoader<string, ProductFeatureValueTranslation | null>;
  public readonly featureChildIds: DataLoader<FeatureChildrenKey, string[]>;

  constructor(repository: Repository) {
    this.featureTranslation = new DataLoader<string, ProductFeatureTranslation | null>(async (featureIds) => {
      const results = await repository.feature.getTranslationsByFeatureIds(featureIds);
      return featureIds.map((id) => results.find((t) => t.featureId === id) ?? null);
    });

    this.featureValueIds = new DataLoader<string, string[]>(async (featureIds) => {
      const results = await repository.feature.getValueIdsByFeatureIds(featureIds);
      return featureIds.map((id) =>
        results
          .filter((v) => v.featureId === id)
          .sort((a, b) => a.sortIndex - b.sortIndex)
          .map((v) => v.id)
      );
    });

    this.featureValue = new DataLoader<string, ProductFeatureValue | null>(async (valueIds) => {
      const results = await repository.feature.getValuesByIds(valueIds);
      return valueIds.map((id) => results.find((v) => v.id === id) ?? null);
    });

    this.featureValueTranslation = new DataLoader<string, ProductFeatureValueTranslation | null>(async (featureValueIds) => {
      const results = await repository.feature.getValueTranslationsByValueIds(featureValueIds);
      return featureValueIds.map((id) => results.find((t) => t.featureValueId === id) ?? null);
    });

    this.featureChildIds = new DataLoader<FeatureChildrenKey, string[]>(async (keys) => {
      const productIds = [...new Set(keys.map((key) => key.productId))];
      const parentIds = [...new Set(keys.map((key) => key.parentId))];
      const results = await repository.feature.getChildIdsByParentIds(productIds, parentIds);

      const byKey = new Map<string, Array<{ id: string; sortIndex: number }>>();
      for (const child of results) {
        if (!child.parentId) continue;
        const key = `${child.productId}:${child.parentId}`;
        const existing = byKey.get(key) ?? [];
        existing.push({ id: child.id, sortIndex: child.sortIndex });
        byKey.set(key, existing);
      }

      return keys.map((key) => {
        const items = byKey.get(`${key.productId}:${key.parentId}`) ?? [];
        items.sort((a, b) => a.sortIndex - b.sortIndex);
        return items.map((item) => item.id);
      });
    });
  }
}
