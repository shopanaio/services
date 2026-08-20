import { describe, expect, it } from "@jest/globals";
import { rankRecommendationCandidates } from "./rankRulesV1.js";
import type { RecommendationCandidate } from "../repositories/recommendation/types.js";

function candidate(
  targetProductId: string,
  patch: Partial<RecommendationCandidate> = {},
): RecommendationCandidate {
  return {
    targetProductId,
    manualAction: null,
    manualPosition: null,
    manualBoost: null,
    fbtSourceScore: null,
    popularityScore: null,
    primarySource: "FALLBACK",
    sourceBreakdown: { version: 1 },
    ...patch,
  };
}

describe("rankRecommendationCandidates", () => {
  it("fills PIN position gaps and compacts published ranks", () => {
    const result = rankRecommendationCandidates({
      placement: "PRODUCT_RELATED",
      strategy: "CURATED_FIRST",
      maximumResults: 3,
      candidates: [
        candidate("00000000-0000-7000-8000-000000000003", {
          manualAction: "PIN",
          manualPosition: 3,
          primarySource: "MANUAL",
        }),
        candidate("00000000-0000-7000-8000-000000000001", { popularityScore: "0.9" }),
        candidate("00000000-0000-7000-8000-000000000002", { popularityScore: "0.8" }),
      ],
    });

    expect(result.map((item) => [item.targetProductId, item.rank])).toEqual([
      ["00000000-0000-7000-8000-000000000001", 1],
      ["00000000-0000-7000-8000-000000000002", 2],
      ["00000000-0000-7000-8000-000000000003", 3],
    ]);
    expect(result[2]?.score).toBe("0.0000000000");
  });

  it("keeps a CURATED_FIRST boost ahead of a numerically stronger automated candidate", () => {
    const result = rankRecommendationCandidates({
      placement: "PRODUCT_RELATED",
      strategy: "CURATED_FIRST",
      maximumResults: 2,
      candidates: [
        candidate("00000000-0000-7000-8000-000000000001", {
          manualAction: "BOOST",
          manualBoost: "0.000001",
          primarySource: "MANUAL",
        }),
        candidate("00000000-0000-7000-8000-000000000002", {
          fbtSourceScore: "9999999999.9999999999",
          primarySource: "FREQUENTLY_BOUGHT_TOGETHER",
        }),
      ],
    });

    expect(result.map((item) => item.targetProductId)).toEqual([
      "00000000-0000-7000-8000-000000000001",
      "00000000-0000-7000-8000-000000000002",
    ]);
  });
});
