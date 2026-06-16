import DataLoader from "dataloader";
import type {
  FacetValue,
  FacetValueTranslation,
  FacetValueSourceHandle,
} from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";

export class FacetValueLoader {
  public readonly facetValue: DataLoader<string, FacetValue | null>;
  public readonly facetValueTranslation: DataLoader<string, FacetValueTranslation | null>;
  public readonly facetValueSourceHandles: DataLoader<string, FacetValueSourceHandle[]>;

  constructor(repository: Repository) {
    this.facetValue = new DataLoader<string, FacetValue | null>(async (valueIds) => {
      const results = await repository.facetValue.getByIds(valueIds);
      return valueIds.map((id) => results.find((item) => item.id === id) ?? null);
    });

    this.facetValueTranslation = new DataLoader<
      string,
      FacetValueTranslation | null
    >(async (valueIds) => {
      const results = await repository.facetValue.getTranslationsByValueIds(valueIds);
      return valueIds.map(
        (id) => results.find((item) => item.facetValueId === id) ?? null
      );
    });

    this.facetValueSourceHandles = new DataLoader<
      string,
      FacetValueSourceHandle[]
    >(async (valueIds) => {
      const results = await repository.facetValue.getSourceHandlesByValueIds(
        valueIds
      );
      return valueIds.map((id) =>
        results.filter((item) => item.facetValueId === id)
      );
    });
  }
}
