import { Transactional } from "../../kernel/BaseScript.js";
import { BaseScript } from "../../kernel/BaseScript.js";
import { MAX_MANUAL_ROWS_PER_ANCHOR_PLACEMENT } from "../../recommendation/constants.js";
import type { ManualRecommendationCreateParams, ManualRecommendationResult } from "./dto/index.js";
import { genericError, validateManualValues } from "./validation.js";
import { mapManualWriteError } from "./manualHelpers.js";

export class ManualProductRecommendationCreateScript extends BaseScript<
  ManualRecommendationCreateParams,
  ManualRecommendationResult
> {
  @Transactional()
  protected async execute(
    input: ManualRecommendationCreateParams,
  ): Promise<ManualRecommendationResult> {
    const policy = await this.repository.recommendationPlacementPolicy.lockByPlacement(
      input.placement,
    );
    if (!policy)
      return {
        userErrors: [{ message: "Recommendation policy not found", code: "POLICY_NOT_FOUND" }],
      };
    await this.repository.recommendationBuildRequest.lockOrCreateMutex(
      input.anchorProductId,
      input.placement,
    );
    const normalized = {
      anchorProductId: input.anchorProductId,
      targetProductId: input.targetProductId,
      placement: input.placement,
      action: input.action,
      position: input.position ?? null,
      boost: input.boost ?? null,
      enabled: input.enabled,
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
    };
    const userErrors = validateManualValues({
      ...normalized,
      maximumResults: policy.maximumResults,
    });
    const owned = await this.repository.manualProductRecommendation.findOwnedProductIds([
      input.anchorProductId,
      input.targetProductId,
    ]);
    if (owned.size !== 2) userErrors.push({ message: "Product not found", code: "NOT_FOUND" });
    if (
      (await this.repository.manualProductRecommendation.countForAnchorPlacement(
        input.anchorProductId,
        input.placement,
      )) >= MAX_MANUAL_ROWS_PER_ANCHOR_PLACEMENT
    ) {
      userErrors.push({
        message: "Manual recommendation row limit reached",
        code: "MANUAL_ROW_LIMIT_EXCEEDED",
      });
    }
    if (userErrors.length > 0) return { userErrors };
    try {
      const recommendation = await this.repository.manualProductRecommendation.create(normalized);
      const triggerKey = `manual:${this.context.requestId}:${recommendation.recommendationId}:create`;
      const request = await this.repository.recommendationBuildRequest.request(
        input.anchorProductId,
        input.placement,
        triggerKey,
      );
      return {
        recommendation,
        generation: request.generation,
        triggerKey,
        anchorProductId: input.anchorProductId,
        placement: input.placement,
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
