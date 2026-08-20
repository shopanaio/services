import type { RecommendationPlacement } from "../repositories/models/recommendationRuntime.js";

export const RECOMMENDATION_PLACEMENTS = [
  "PRODUCT_RELATED",
  "FREQUENTLY_BOUGHT_TOGETHER",
] as const satisfies readonly RecommendationPlacement[];

export const RECOMMENDATION_FALLBACK_CODES = ["category_popularity", "store_popularity"] as const;

export const FBT_RULES_V1 = {
  windowDays: 90,
  recencyHalfLifeDays: 30,
  minimumPairOrders: 3n,
  minimumConfidence: "0.0500000000",
  minimumLift: "1.0000000000",
  liftCap: "5.0000000000",
} as const;

export const FBT_ALGORITHM_VERSION = "fbt-rules-v1";
export const RELATED_MODEL_VERSION = "related-rules-v1";
export const STOREFRONT_ELIGIBILITY_POLICY_VERSION = "storefront-eligibility-v1";
export const MAX_MANUAL_ROWS_PER_ANCHOR_PLACEMENT = 5_000;
export const MAX_RECOMMENDATION_SOURCE_LIMIT = 400;
export const GLOBAL_RECOMMENDATION_CANDIDATE_LIMIT = 1_700;
export const MAX_RECOMMENDATION_ITEM_BYTES = 8 * 1024;
export const MAX_RECOMMENDATION_SNAPSHOT_BYTES = 512 * 1024;
export const MAX_RECOMMENDATION_PREVIEW_CHANGES = 400;
export const MAX_RECOMMENDATION_PREVIEW_BYTES = 256 * 1024;
export const MAX_PRODUCT_CATEGORY_MEMBERSHIPS = 1_000;
export const MAX_LIFECYCLE_PLAN_BYTES = 131_072;
export const RECOMMENDATION_FAN_OUT_PAGE_SIZE = 100;
export const RECOMMENDATION_HASH_PAGE_SIZE = 500;
export const RECOMMENDATION_STORE_LANES = 2;

export function recommendationModelVersion(placement: RecommendationPlacement): string {
  return placement === "PRODUCT_RELATED" ? RELATED_MODEL_VERSION : FBT_ALGORITHM_VERSION;
}

export function recommendationSourceLimit(maximumResults: number): number {
  return Math.min(maximumResults * 4, MAX_RECOMMENDATION_SOURCE_LIMIT);
}
