import DataLoader from "dataloader";
import type {
  Facet,
  FacetValue,
  FacetTranslation,
} from "../repositories/models/index.js";
import type { FacetSourceWithName } from "../repositories/facet/FacetRepository.js";
import {
  isFacetScopeType,
  type FacetScopeType,
} from "../repositories/facet/facetScopes.js";
import type { Repository } from "../repositories/Repository.js";

export class FacetLoader {
  public readonly facet: DataLoader<string, Facet | null>;
  public readonly facetTranslation: DataLoader<string, FacetTranslation | null>;
  public readonly facetSources: DataLoader<string, FacetSourceWithName[]>;
  public readonly facetScopes: DataLoader<string, FacetScopeType[]>;
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

    this.facetScopes = new DataLoader<string, FacetScopeType[]>(
      async (facetIds) => {
        const results = await repository.facet.getScopesByFacetIds(facetIds);
        const scopesByFacetId = new Map<string, FacetScopeType[]>();

        for (const result of results) {
          if (!isFacetScopeType(result.scopeType)) {
            throw new Error(`Unsupported persisted facet scope: ${result.scopeType}`);
          }

          const scopes = scopesByFacetId.get(result.facetId) ?? [];
          scopes.push(result.scopeType);
          scopesByFacetId.set(result.facetId, scopes);
        }

        return facetIds.map((facetId) => scopesByFacetId.get(facetId) ?? []);
      }
    );

    this.facetValueIds = new DataLoader<string, string[]>(async (facetIds) => {
      const allValues = await repository.facetValue.findVisibleByFacetIds(facetIds);
      const valuesByFacetId = new Map<string, FacetValue[]>();
      for (const value of allValues) {
        const values = valuesByFacetId.get(value.facetId) ?? [];
        values.push(value);
        valuesByFacetId.set(value.facetId, values);
      }
      return facetIds.map((facetId) =>
        (valuesByFacetId.get(facetId) ?? []).map((value) => value.id)
      );
    });
  }
}
