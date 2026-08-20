import { createHash } from "node:crypto";
import { canonicalJson } from "./canonical.js";
import { RECOMMENDATION_HASH_PAGE_SIZE } from "./constants.js";
import type { RecommendationPlacement } from "../repositories/models/recommendationRuntime.js";
import type { ManualProductRecommendationRepository } from "../repositories/recommendation/ManualProductRecommendationRepository.js";

export async function manualConfigurationHash(input: {
  repository: ManualProductRecommendationRepository;
  anchorProductId: string;
  placement: RecommendationPlacement;
  asOf: string;
}): Promise<string> {
  const asOf = Date.parse(input.asOf);
  if (!Number.isFinite(asOf)) throw new Error("Manual configuration asOf is invalid");
  const hash = createHash("sha256");
  let afterId: string | undefined;
  do {
    const page = await input.repository.listPage({
      anchorProductId: input.anchorProductId,
      placement: input.placement,
      afterId,
      first: RECOMMENDATION_HASH_PAGE_SIZE,
    });
    for (const row of page.rows) {
      if (!effective(row, asOf)) continue;
      hash.update(
        canonicalJson({
          recommendationId: row.recommendationId,
          version: row.version,
          targetProductId: row.targetProductId,
          action: row.action,
          position: row.position,
          boost: row.boost,
          enabled: row.enabled,
          startsAt: row.startsAt,
          endsAt: row.endsAt,
          anchorReferenceStatus: row.anchorReferenceStatus,
          targetReferenceStatus: row.targetReferenceStatus,
        }),
      );
      hash.update("\n");
    }
    afterId = page.nextCursor ?? undefined;
  } while (afterId);
  return hash.digest("hex");
}

function effective(
  row: {
    enabled: boolean;
    startsAt: string | null;
    endsAt: string | null;
    anchorReferenceStatus: "VALID" | "STALE";
    targetReferenceStatus: "VALID" | "STALE";
  },
  asOf: number,
): boolean {
  return (
    row.enabled &&
    row.anchorReferenceStatus === "VALID" &&
    row.targetReferenceStatus === "VALID" &&
    (row.startsAt === null || Date.parse(row.startsAt) <= asOf) &&
    (row.endsAt === null || asOf < Date.parse(row.endsAt))
  );
}
