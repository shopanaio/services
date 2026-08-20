import type { RecommendationPlacement } from "../../repositories/models/recommendationRuntime.js";
import type { RecommendationPageResult } from "../../repositories/recommendation/types.js";
import { ListingType } from "./ListingType.js";
import { toProductReference } from "./listingReferences.js";

export interface ProductRecommendationConnectionInput {
  anchorProductId: string;
  placement: RecommendationPlacement;
  first: number;
  after: string | null;
}

export class ProductRecommendationConnectionResolver extends ListingType<
  ProductRecommendationConnectionInput,
  RecommendationPageResult
> {
  $preload() {
    return this.$ctx.loaders.recommendation.load(this.$props);
  }

  async edges() {
    const rows = (await this.$get("rows")) ?? [];
    return rows.map((row) => ({
      cursor: row.cursor,
      node: {
        product: toProductReference(row.targetProductId),
        source: row.primarySource,
      },
    }));
  }

  async nodes() {
    const rows = (await this.$get("rows")) ?? [];
    return rows.map((row) => ({
      product: toProductReference(row.targetProductId),
      source: row.primarySource,
    }));
  }

  async pageInfo() {
    const rows = (await this.$get("rows")) ?? [];
    return {
      hasNextPage: (await this.$get("hasNextPage")) ?? false,
      hasPreviousPage: false,
      startCursor: rows[0]?.cursor ?? null,
      endCursor: rows.at(-1)?.cursor ?? null,
    };
  }

  async totalCount() {
    return (await this.$get("totalCount")) ?? 0;
  }
}
