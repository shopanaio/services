import DataLoader from "dataloader";
import type {
  ProductFeatureTranslation,
  ProductFeatureValue,
  ProductFeatureValueTranslation,
} from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";

export class FeatureLoader {
  public readonly featureTranslation: DataLoader<string, ProductFeatureTranslation | null>;
  public readonly featureValueIds: DataLoader<string, string[]>;
  public readonly featureValue: DataLoader<string, ProductFeatureValue | null>;
  public readonly featureValueTranslation: DataLoader<string, ProductFeatureValueTranslation | null>;

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
  }
}
