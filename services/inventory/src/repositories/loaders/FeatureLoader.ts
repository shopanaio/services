import DataLoader from "dataloader";
import type {
  ProductFeatureTranslation,
  ProductFeatureValue,
  ProductFeatureValueTranslation,
} from "../models/index.js";
import type { FeatureLoaderQueryRepository } from "./FeatureLoaderQueryRepository.js";

export interface FeatureLoaders {
  featureTranslation: DataLoader<string, ProductFeatureTranslation | null>;
  featureValueIds: DataLoader<string, string[]>;
  featureValue: DataLoader<string, ProductFeatureValue | null>;
  featureValueTranslation: DataLoader<string, ProductFeatureValueTranslation | null>;
}

export class FeatureLoader {
  constructor(private readonly queryRepo: FeatureLoaderQueryRepository) {}

  createLoaders(): FeatureLoaders {
    return {
      featureTranslation: this.createFeatureTranslationLoader(),
      featureValueIds: this.createFeatureValueIdsLoader(),
      featureValue: this.createFeatureValueLoader(),
      featureValueTranslation: this.createFeatureValueTranslationLoader(),
    };
  }

  private createFeatureTranslationLoader(): DataLoader<string, ProductFeatureTranslation | null> {
    return new DataLoader<string, ProductFeatureTranslation | null>(async (featureIds) => {
      const results = await this.queryRepo.getTranslationsByFeatureIds(featureIds);
      return featureIds.map(
        (id) => results.find((t) => t.featureId === id) ?? null
      );
    });
  }

  private createFeatureValueIdsLoader(): DataLoader<string, string[]> {
    return new DataLoader<string, string[]>(async (featureIds) => {
      const results = await this.queryRepo.getValueIdsByFeatureIds(featureIds);
      return featureIds.map((id) =>
        results
          .filter((v) => v.featureId === id)
          .sort((a, b) => a.sortIndex - b.sortIndex)
          .map((v) => v.id)
      );
    });
  }

  private createFeatureValueLoader(): DataLoader<string, ProductFeatureValue | null> {
    return new DataLoader<string, ProductFeatureValue | null>(async (valueIds) => {
      const results = await this.queryRepo.getValuesByIds(valueIds);
      return valueIds.map((id) => results.find((v) => v.id === id) ?? null);
    });
  }

  private createFeatureValueTranslationLoader(): DataLoader<string, ProductFeatureValueTranslation | null> {
    return new DataLoader<string, ProductFeatureValueTranslation | null>(async (featureValueIds) => {
      const results = await this.queryRepo.getValueTranslationsByValueIds(featureValueIds);
      return featureValueIds.map(
        (id) => results.find((t) => t.featureValueId === id) ?? null
      );
    });
  }
}
