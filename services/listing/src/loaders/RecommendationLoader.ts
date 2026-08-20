import DataLoader from "dataloader";
import type { Repository } from "../repositories/Repository.js";
import type {
  RecommendationPageKey,
  RecommendationPageResult,
} from "../repositories/recommendation/types.js";
import type {
  ManualProductRecommendation,
  RecommendationPlacementPolicy,
} from "../repositories/models/recommendationRuntime.js";

export class RecommendationLoader {
  readonly page: DataLoader<RecommendationPageKey, RecommendationPageResult, string>;
  readonly policyById: DataLoader<string, RecommendationPlacementPolicy | null>;
  readonly manualById: DataLoader<string, ManualProductRecommendation | null>;

  constructor(repository: Repository) {
    this.page = new DataLoader((keys) => repository.storefrontRecommendationQuery.getPages(keys), {
      cacheKeyFn: (key) =>
        [key.anchorProductId, key.placement, key.first, key.after ?? ""].join(":"),
    });
    this.policyById = new DataLoader(async (ids) => {
      const rows = await repository.recommendationPlacementPolicy.getByIds(ids);
      const byId = new Map(rows.map((row) => [row.policyId, row]));
      return ids.map((id) => byId.get(id) ?? null);
    });
    this.manualById = new DataLoader(async (ids) => {
      const rows = await repository.manualProductRecommendation.getByIds(ids);
      const byId = new Map(rows.map((row) => [row.recommendationId, row]));
      return ids.map((id) => byId.get(id) ?? null);
    });
  }
}
