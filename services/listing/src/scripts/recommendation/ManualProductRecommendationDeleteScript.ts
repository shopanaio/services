import { Transactional } from "../../kernel/BaseScript.js";
import { BaseScript } from "../../kernel/BaseScript.js";
import type { ManualRecommendationResult } from "./dto/index.js";
import { genericError } from "./validation.js";

export class ManualProductRecommendationDeleteScript extends BaseScript<
  { id: string },
  ManualRecommendationResult
> {
  @Transactional()
  protected async execute(input: { id: string }): Promise<ManualRecommendationResult> {
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
    const deletedId = await this.repository.manualProductRecommendation.delete(input.id);
    if (!deletedId)
      return { userErrors: [{ message: "Manual recommendation not found", code: "NOT_FOUND" }] };
    const triggerKey = `manual:${this.context.requestId}:${deletedId}:delete`;
    const request = await this.repository.recommendationBuildRequest.request(
      existing.anchorProductId,
      existing.placement,
      triggerKey,
    );
    return {
      deletedId,
      generation: request.generation,
      triggerKey,
      anchorProductId: existing.anchorProductId,
      placement: existing.placement,
      userErrors: [],
    };
  }

  protected handleError(error: unknown): ManualRecommendationResult {
    return { userErrors: genericError(error) };
  }
}
