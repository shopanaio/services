import DataLoader from "dataloader";
import type { Repository } from "../repositories/Repository.js";
import type {
  RecommendationPageKey,
  RecommendationPageResult,
} from "../repositories/recommendation/types.js";

export class RecommendationLoader {
  readonly page: DataLoader<RecommendationPageKey, RecommendationPageResult, string>;

  constructor(repository: Repository) {
    this.page = new DataLoader(
      (keys) => repository.storefrontRecommendationQuery.getPages(keys),
      {
        cacheKeyFn: (key) => [
          key.anchorProductId,
          key.placement,
          key.first,
          key.after ?? "",
        ].join(":"),
      },
    );
  }
}
