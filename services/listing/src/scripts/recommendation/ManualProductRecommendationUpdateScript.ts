import { Transactional } from "../../kernel/BaseScript.js";
import { BaseScript } from "../../kernel/BaseScript.js";
import type { ManualRecommendationUpdateParams, ManualRecommendationResult } from "./dto/index.js";
import { genericError, validateManualValues } from "./validation.js";
import { manualInput, mapManualWriteError } from "./manualHelpers.js";

export class ManualProductRecommendationUpdateScript extends BaseScript<
  ManualRecommendationUpdateParams,
  ManualRecommendationResult
> {
  @Transactional()
  protected async execute(
    input: ManualRecommendationUpdateParams,
  ): Promise<ManualRecommendationResult> {
    const existing = await this.repository.manualProductRecommendation.findById(input.id);
    if (!existing)
      return { userErrors: [{ message: "Manual recommendation not found", code: "NOT_FOUND" }] };
    const policy = await this.repository.recommendationPlacementPolicy.lockByPlacement(
      existing.placement,
    );
    if (!policy)
      return {
        userErrors: [{ message: "Recommendation policy not found", code: "POLICY_NOT_FOUND" }],
      };
    await this.repository.recommendationBuildRequest.lockOrCreateMutex(
      existing.anchorProductId,
      existing.placement,
    );
    const locked = await this.repository.manualProductRecommendation.findById(input.id);
    if (!locked)
      return { userErrors: [{ message: "Manual recommendation not found", code: "NOT_FOUND" }] };
    const current = manualInput(locked);
    const normalized = {
      ...current,
      targetProductId:
        input.targetProductId === undefined ? current.targetProductId : input.targetProductId,
      action: input.action === undefined ? current.action : input.action,
      position: input.position === undefined ? current.position : input.position,
      boost: input.boost === undefined ? current.boost : input.boost,
      enabled: input.enabled === undefined ? current.enabled : input.enabled,
      startsAt: input.startsAt === undefined ? current.startsAt : input.startsAt,
      endsAt: input.endsAt === undefined ? current.endsAt : input.endsAt,
    };
    const userErrors = validateManualValues({
      ...normalized,
      maximumResults: policy.maximumResults,
    });
    const owned = await this.repository.manualProductRecommendation.findOwnedProductIds([
      normalized.anchorProductId,
      normalized.targetProductId,
    ]);
    if (owned.size !== 2) userErrors.push({ message: "Product not found", code: "NOT_FOUND" });
    if (userErrors.length > 0) return { userErrors };
    try {
      const recommendation = await this.repository.manualProductRecommendation.update(
        locked.recommendationId,
        {
          targetProductId: normalized.targetProductId,
          action: normalized.action,
          position: normalized.position,
          boost: normalized.boost,
          enabled: normalized.enabled,
          startsAt: normalized.startsAt,
          endsAt: normalized.endsAt,
        },
      );
      if (!recommendation)
        return { userErrors: [{ message: "Manual recommendation not found", code: "NOT_FOUND" }] };
      const triggerKey = `manual:${this.context.requestId}:${recommendation.recommendationId}:update`;
      const request = await this.repository.recommendationBuildRequest.request(
        locked.anchorProductId,
        locked.placement,
        triggerKey,
      );
      return {
        recommendation,
        generation: request.generation,
        triggerKey,
        anchorProductId: locked.anchorProductId,
        placement: locked.placement,
        userErrors: [],
      };
    } catch (error) {
      const mapped = mapManualWriteError(error);
      if (mapped) return { userErrors: mapped };
      throw error;
    }
  }

  protected handleError(error: unknown): ManualRecommendationResult {
    return { userErrors: genericError(error) };
  }
}
