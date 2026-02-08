import DataLoader from "dataloader";
import type { FacetSwatch } from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";

export class FacetSwatchLoader {
  public readonly facetSwatch: DataLoader<string, FacetSwatch | null>;

  constructor(repository: Repository) {
    this.facetSwatch = new DataLoader<string, FacetSwatch | null>(
      async (swatchIds) => {
        const all = await repository.facetSwatch.getByIds(swatchIds);
        return swatchIds.map((id) => all.find((item) => item.id === id) ?? null);
      }
    );
  }
}
