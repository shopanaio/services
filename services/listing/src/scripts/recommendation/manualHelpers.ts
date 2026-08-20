import type { ManualProductRecommendation } from "../../repositories/models/recommendationRuntime.js";
import type { ManualRecommendationInput } from "../../repositories/recommendation/types.js";
import type { UserError } from "../../kernel/BaseScript.js";
import { isPgConstraint } from "../../recommendation/errors.js";

export function mapManualWriteError(error: unknown): UserError[] | null {
  if (
    isPgConstraint(error, [
      "manual_product_recommendation_target_schedule_excl",
      "manual_product_recommendation_pin_schedule_excl",
    ])
  ) {
    return [
      {
        message: "Manual recommendation schedule conflicts with another row",
        code: "SCHEDULE_CONFLICT",
      },
    ];
  }
  return null;
}

export function manualInput(row: ManualProductRecommendation): ManualRecommendationInput {
  return {
    anchorProductId: row.anchorProductId,
    targetProductId: row.targetProductId,
    placement: row.placement,
    action: row.action,
    position: row.position,
    boost: row.boost,
    enabled: row.enabled,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
  };
}
