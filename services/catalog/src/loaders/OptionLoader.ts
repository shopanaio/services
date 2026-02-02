import DataLoader from "dataloader";
import type {
  ProductOptionTranslation,
  ProductOptionValue,
  ProductOptionValueTranslation,
} from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";

export class OptionLoader {
  public readonly optionTranslation: DataLoader<string, ProductOptionTranslation | null>;
  public readonly optionValueIds: DataLoader<string, string[]>;
  public readonly optionValue: DataLoader<string, ProductOptionValue | null>;
  public readonly optionValueTranslation: DataLoader<string, ProductOptionValueTranslation | null>;

  constructor(repository: Repository) {
    this.optionTranslation = new DataLoader<string, ProductOptionTranslation | null>(async (optionIds) => {
      const results = await repository.option.getTranslationsByOptionIds(optionIds);
      return optionIds.map((id) => results.find((t) => t.optionId === id) ?? null);
    });

    this.optionValueIds = new DataLoader<string, string[]>(async (optionIds) => {
      const results = await repository.option.getValueIdsByOptionIds(optionIds);
      return optionIds.map((id) =>
        results
          .filter((v) => v.optionId === id)
          .sort((a, b) => a.sortIndex - b.sortIndex)
          .map((v) => v.id)
      );
    });

    this.optionValue = new DataLoader<string, ProductOptionValue | null>(async (valueIds) => {
      const results = await repository.option.getValuesByIds(valueIds);
      return valueIds.map((id) => results.find((v) => v.id === id) ?? null);
    });

    this.optionValueTranslation = new DataLoader<string, ProductOptionValueTranslation | null>(async (optionValueIds) => {
      const results = await repository.option.getValueTranslationsByValueIds(optionValueIds);
      return optionValueIds.map((id) => results.find((t) => t.optionValueId === id) ?? null);
    });
  }
}
