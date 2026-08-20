import { Transactional } from "../../kernel/BaseScript.js";
import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  RecommendationPolicyResult,
  RecommendationPolicyUpsertParams,
} from "./dto/index.js";
import { genericError, validatePolicy } from "./validation.js";

export class RecommendationPlacementPolicyUpsertScript extends BaseScript<
  RecommendationPolicyUpsertParams,
  RecommendationPolicyResult
> {
  @Transactional()
  protected async execute(input: RecommendationPolicyUpsertParams): Promise<RecommendationPolicyResult> {
    const userErrors = validatePolicy(input);
    if (userErrors.length > 0) return { userErrors };
    const current = await this.repository.recommendationPlacementPolicy.lockByPlacement(input.placement);
    if (!current) {
      if (input.expectedVersion != null) {
        return { userErrors: [{ message: "Policy does not exist", field: ["input", "expectedVersion"], code: "VERSION_CONFLICT" }] };
      }
      const policy = await this.repository.recommendationPlacementPolicy.create(input);
      return { policy, generationTrigger: `policy:${policy.policyId}:${policy.version}`, userErrors: [] };
    }
    if (input.expectedVersion == null || input.expectedVersion !== current.version) {
      return { userErrors: [{ message: "Policy version changed", field: ["input", "expectedVersion"], code: "VERSION_CONFLICT" }] };
    }
    if (
      input.maximumResults < current.maximumResults &&
      await this.repository.manualProductRecommendation.hasPinBeyondMaximum(input.placement, input.maximumResults)
    ) {
      return { userErrors: [{ message: "A current or future PIN exceeds maximumResults", field: ["input", "maximumResults"], code: "PIN_POSITION_OUT_OF_RANGE" }] };
    }
    const policy = await this.repository.recommendationPlacementPolicy.update(
      current.policyId,
      current.version,
      {
        strategy: input.strategy,
        minimumResults: input.minimumResults,
        maximumResults: input.maximumResults,
        fallbackChain: input.fallbackChain,
      },
    );
    if (!policy) return { userErrors: [{ message: "Policy version changed", code: "VERSION_CONFLICT" }] };
    return {
      policy,
      generationTrigger: policy.enabled ? `policy:${policy.policyId}:${policy.version}` : undefined,
      userErrors: [],
    };
  }

  protected handleError(error: unknown): RecommendationPolicyResult {
    return { userErrors: genericError(error) };
  }
}
