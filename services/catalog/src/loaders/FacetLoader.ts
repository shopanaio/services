import DataLoader from "dataloader";
import type {
  Facet,
  FacetTranslation,
} from "../repositories/models/index.js";
import type { FacetSourceWithName } from "../repositories/facet/FacetRepository.js";
import type { Repository } from "../repositories/Repository.js";

export class FacetLoader {
  public readonly facet: DataLoader<string, Facet | null>;
  public readonly facetTranslation: DataLoader<string, FacetTranslation | null>;
  public readonly facetSources: DataLoader<string, FacetSourceWithName[]>;
  public readonly facetValueIds: DataLoader<string, string[]>;

  constructor(repository: Repository) {
    this.facet = new DataLoader<string, Facet | null>(async (facetIds) => {
      const results = await repository.facet.getByIds(facetIds);
      return facetIds.map((id) => results.find((item) => item.id === id) ?? null);
    });

    this.facetTranslation = new DataLoader<string, FacetTranslation | null>(
      async (facetIds) => {
        const results = await repository.facet.getTranslationsByFacetIds(facetIds);
        return facetIds.map(
          (id) => results.find((item) => item.facetId === id) ?? null
        );
      }
    );

    this.facetSources = new DataLoader<string, FacetSourceWithName[]>(
      async (facetIds) => {
        const results = await repository.facet.getSourcesByFacetIds(facetIds);
        return facetIds.map((id) => results.filter((item) => item.facetId === id));
      }
    );

    this.facetValueIds = new DataLoader<string, string[]>(async (facetIds) => {
      const allValues = await Promise.all(
        facetIds.map((facetId) => repository.facetValue.findByFacetId(facetId))
      );
      return allValues.map((values) => values.map((value) => value.id));
    });
  }
}
