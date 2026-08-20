import { Transactional } from "../../kernel/BaseScript.js";
import { BaseScript } from "../../kernel/BaseScript.js";
import type { RecommendationPlacement } from "../../repositories/models/recommendationRuntime.js";
import type { RecommendationPolicyResult } from "./dto/index.js";
import { genericError } from "./validation.js";

export class RecommendationPlacementPolicySetEnabledScript extends BaseScript<
  { placement: RecommendationPlacement; enabled: boolean; expectedVersion: number },
  RecommendationPolicyResult
> {
  @Transactional()
  protected async execute(input: {
    placement: RecommendationPlacement;
    enabled: boolean;
    expectedVersion: number;
  }): Promise<RecommendationPolicyResult> {
    const current = await this.repository.recommendationPlacementPolicy.lockByPlacement(
      input.placement,
    );
    if (!current) return { userErrors: [{ message: "Policy not found", code: "NOT_FOUND" }] };
    if (current.version !== input.expectedVersion) {
      return { userErrors: [{ message: "Policy version changed", code: "VERSION_CONFLICT" }] };
    }
    if (current.enabled === input.enabled) return { policy: current, userErrors: [] };
    const policy = await this.repository.recommendationPlacementPolicy.setEnabled(
      current.policyId,
      current.version,
      input.enabled,
    );
    if (!policy)
      return { userErrors: [{ message: "Policy version changed", code: "VERSION_CONFLICT" }] };
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
