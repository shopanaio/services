import DataLoader from "dataloader";
import type {
  FacetGroup,
  FacetGroupTranslation,
} from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";

export class FacetGroupLoader {
  public readonly facetGroup: DataLoader<string, FacetGroup | null>;
  public readonly facetGroupTranslation: DataLoader<string, FacetGroupTranslation | null>;
  public readonly facetIdsByGroup: DataLoader<string, string[]>;

  constructor(repository: Repository) {
    this.facetGroup = new DataLoader<string, FacetGroup | null>(async (groupIds) => {
      const results = await repository.facetGroup.getByIds(groupIds);
      return groupIds.map((id) => results.find((item) => item.id === id) ?? null);
    });

    this.facetGroupTranslation = new DataLoader<
      string,
      FacetGroupTranslation | null
    >(async (groupIds) => {
      const results = await repository.facetGroup.getTranslationsByGroupIds(groupIds);
      return groupIds.map(
        (id) => results.find((item) => item.groupId === id) ?? null
      );
    });

    this.facetIdsByGroup = new DataLoader<string, string[]>(async (groupIds) => {
      const facets = await repository.facet.findByGroupIds(groupIds);
      return groupIds.map((groupId) =>
        facets
          .filter((item) => item.groupId === groupId)
          .map((item) => item.id)
      );
    });
  }
}
