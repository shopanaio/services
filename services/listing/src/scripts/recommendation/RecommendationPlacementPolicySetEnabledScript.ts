import { Transactional } from "../../kernel/BaseScript.js";
import { BaseScript } from "../../kernel/BaseScript.js";
import type { RecommendationPlacement } from "../../repositories/models/recommendationRuntime.js";
import type { RecommendationPolicyResult } from "./dto/index.js";
import { genericError } from "./validation.js";

export class RecommendationPlacementPolicySetEnabledScript extends BaseScript<
  { placement: RecommendationPlacement; enabled: boolean },
  RecommendationPolicyResult
> {
  @Transactional()
  protected async execute(input: {
    placement: RecommendationPlacement;
    enabled: boolean;
  }): Promise<RecommendationPolicyResult> {
    const current = await this.repository.recommendationPlacementPolicy.lockByPlacement(
      input.placement,
    );
    if (!current) return { userErrors: [{ message: "Policy not found", code: "NOT_FOUND" }] };
    if (current.enabled === input.enabled) return { policy: current, userErrors: [] };
    const policy = await this.repository.recommendationPlacementPolicy.setEnabled(
      current.policyId,
      input.enabled,
    );
    if (!policy) return { userErrors: [{ message: "Policy not found", code: "NOT_FOUND" }] };
    return {
      policy,
      generationTrigger: policy.enabled ? `policy:${policy.policyId}` : undefined,
      userErrors: [],
    };
  }

  protected handleError(error: unknown): RecommendationPolicyResult {
    return { userErrors: genericError(error) };
  }
}
