import { Transactional } from "../../kernel/BaseScript.js";
import { BaseScript } from "../../kernel/BaseScript.js";
import { RECOMMENDATION_FAN_OUT_PAGE_SIZE } from "../../recommendation/constants.js";
import type { RecommendationPlacement } from "../../repositories/models/recommendationRuntime.js";
import type { RecommendationRequestGeneration } from "../../repositories/recommendation/types.js";

export interface RecommendationFanOutPageParams {
  placement: RecommendationPlacement;
  triggerKey: string;
  afterProductId?: string;
  calculationRunId?: string;
  includePopularityPolicies?: boolean;
}

export interface RecommendationFanOutPageResult {
  requests: RecommendationRequestGeneration[];
  nextCursor: string | null;
}

export class RecommendationFanOutPageScript extends BaseScript<
  RecommendationFanOutPageParams,
  RecommendationFanOutPageResult
> {
  @Transactional()
  protected async execute(input: RecommendationFanOutPageParams): Promise<RecommendationFanOutPageResult> {
    const page = input.calculationRunId
      ? await this.repository.recommendationAnchorCollector.forCalculation({
          runId: input.calculationRunId,
          placement: input.placement,
          includePopularityPolicies: input.includePopularityPolicies ?? false,
          afterProductId: input.afterProductId,
          first: RECOMMENDATION_FAN_OUT_PAGE_SIZE,
        })
      : await this.repository.recommendationAnchorCollector.forPlacement({
          placement: input.placement,
          afterProductId: input.afterProductId,
          first: RECOMMENDATION_FAN_OUT_PAGE_SIZE,
        });
    const requests: RecommendationRequestGeneration[] = [];
    for (const anchorProductId of page.anchorProductIds) {
      requests.push(await this.repository.recommendationBuildRequest.request(
        anchorProductId,
        input.placement,
        input.triggerKey,
      ));
    }
    return { requests, nextCursor: page.nextCursor };
  }

  protected handleError(error: unknown): never {
    throw error;
  }
}
