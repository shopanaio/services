import { describe, expect, it, jest } from "@jest/globals";
import { buildRecommendation } from "./buildRecommendation.js";
import type {
  ManualProductRecommendation,
  RecommendationPlacementPolicy,
} from "../repositories/models/recommendationRuntime.js";

const policy: RecommendationPlacementPolicy = {
  policyId: "00000000-0000-7000-8000-000000000010",
  storeId: "00000000-0000-7000-8000-000000000011",
  placement: "PRODUCT_RELATED",
  enabled: true,
  strategy: "CURATED_ONLY",
  minimumResults: 0,
  maximumResults: 1,
  fallbackChain: [],
  version: 1,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

function boost(id: string, targetProductId: string, value: string): ManualProductRecommendation {
  return {
    recommendationId: id,
    storeId: policy.storeId,
    anchorProductId: "00000000-0000-7000-8000-000000000020",
    targetProductId,
    placement: policy.placement,
    action: "BOOST",
    position: null,
    boost: value,
    enabled: true,
    startsAt: null,
    endsAt: null,
    anchorReferenceStatus: "VALID",
    targetReferenceStatus: "VALID",
    version: 1,
    createdAt: policy.createdAt,
    updatedAt: policy.updatedAt,
  };
}

describe("buildRecommendation", () => {
  it("reports bounded candidates omitted by maximumResults", async () => {
    const loadFallback = jest.fn(async () => []);
    const result = await buildRecommendation({
      anchorProductId: "00000000-0000-7000-8000-000000000020",
      policy,
      manualRows: [
        boost(
          "00000000-0000-7000-8000-000000000030",
          "00000000-0000-7000-8000-000000000040",
          "1.000001",
        ),
        boost(
          "00000000-0000-7000-8000-000000000031",
          "00000000-0000-7000-8000-000000000041",
          "1.000000",
        ),
      ],
      loadFbt: loadFallback,
      loadCategoryPopularity: loadFallback,
      loadStorePopularity: loadFallback,
      eligibility: async (ids) => new Map(ids.map((id) => [id, "ELIGIBLE" as const])),
    });

    expect(result.candidates).toHaveLength(1);
    expect(result.excluded).toEqual([
      {
        targetProductId: "00000000-0000-7000-8000-000000000041",
        reason: "LIMIT_EXCEEDED",
      },
    ]);
    expect(loadFallback).not.toHaveBeenCalled();
  });
});
