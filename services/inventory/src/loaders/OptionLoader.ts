import DataLoader from "dataloader";
import type {
  ProductOptionTranslation,
  ProductOptionValue,
  ProductOptionValueTranslation,
} from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";

export interface OptionLoaders {
  optionTranslation: DataLoader<string, ProductOptionTranslation | null>;
  optionValueIds: DataLoader<string, string[]>;
  optionValue: DataLoader<string, ProductOptionValue | null>;
  optionValueTranslation: DataLoader<string, ProductOptionValueTranslation | null>;
}

export class OptionLoader {
  constructor(private readonly repository: Repository) {}

  createLoaders(): OptionLoaders {
    return {
      optionTranslation: this.createOptionTranslationLoader(),
      optionValueIds: this.createOptionValueIdsLoader(),
      optionValue: this.createOptionValueLoader(),
      optionValueTranslation: this.createOptionValueTranslationLoader(),
    };
  }

  private createOptionTranslationLoader(): DataLoader<string, ProductOptionTranslation | null> {
    return new DataLoader<string, ProductOptionTranslation | null>(async (optionIds) => {
      const results = await this.repository.optionLoaderQuery.getTranslationsByOptionIds(optionIds);
      return optionIds.map(
        (id) => results.find((t) => t.optionId === id) ?? null
      );
    });
  }

  private createOptionValueIdsLoader(): DataLoader<string, string[]> {
    return new DataLoader<string, string[]>(async (optionIds) => {
      const results = await this.repository.optionLoaderQuery.getValueIdsByOptionIds(optionIds);
      return optionIds.map((id) =>
        results
          .filter((v) => v.optionId === id)
          .sort((a, b) => a.sortIndex - b.sortIndex)
          .map((v) => v.id)
      );
    });
  }

  private createOptionValueLoader(): DataLoader<string, ProductOptionValue | null> {
    return new DataLoader<string, ProductOptionValue | null>(async (valueIds) => {
      const results = await this.repository.optionLoaderQuery.getValuesByIds(valueIds);
      return valueIds.map((id) => results.find((v) => v.id === id) ?? null);
    });
  }

  private createOptionValueTranslationLoader(): DataLoader<string, ProductOptionValueTranslation | null> {
    return new DataLoader<string, ProductOptionValueTranslation | null>(async (optionValueIds) => {
      const results = await this.repository.optionLoaderQuery.getValueTranslationsByValueIds(optionValueIds);
      return optionValueIds.map(
        (id) => results.find((t) => t.optionValueId === id) ?? null
      );
    });
  }
}
