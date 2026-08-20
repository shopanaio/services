import { Transactional } from "../../kernel/BaseScript.js";
import { BaseScript } from "../../kernel/BaseScript.js";
import { RECOMMENDATION_FAN_OUT_PAGE_SIZE } from "../../recommendation/constants.js";
import type { RecommendationLifecyclePlan } from "../ListingWriteIndexActionScript.js";
import type { RecommendationPlacement } from "../../repositories/models/recommendationRuntime.js";
import type { RecommendationRequestGeneration } from "../../repositories/recommendation/types.js";

const PLACEMENTS = ["PRODUCT_RELATED", "FREQUENTLY_BOUGHT_TOGETHER"] as const;

export class RecommendationReferenceStateSyncScript extends BaseScript<
  { plan: RecommendationLifecyclePlan },
  { requests: RecommendationRequestGeneration[] }
> {
  @Transactional()
  protected async execute({ plan }: { plan: RecommendationLifecyclePlan }) {
    const stateChanged =
      plan.oldState.published !== plan.newState.published ||
      plan.oldState.available !== plan.newState.available ||
      plan.oldState.categoryIds.join("\0") !== plan.newState.categoryIds.join("\0");
    if (!stateChanged) return { requests: [] };
    await this.repository.manualProductRecommendation.markReferenceStatus({
      productId: plan.productId,
      status: plan.newState.published ? "VALID" : "STALE",
    });
    if (!plan.newState.published) {
      await this.repository.recommendationSnapshot.supersedeAnchor(plan.productId);
    }
    const requests: RecommendationRequestGeneration[] = [];
    for (const placement of PLACEMENTS) {
      const policy = await this.repository.recommendationPlacementPolicy.findByPlacement(placement);
      if (!policy?.enabled) continue;
      requests.push(
        await this.repository.recommendationBuildRequest.request(
          plan.productId,
          placement,
          `lifecycle:${plan.productId}:${plan.eventSequence}`,
        ),
      );
    }
    return { requests };
  }
  protected handleError(error: unknown): never {
    throw error;
  }
}

export class RecommendationLifecycleAffectedPageScript extends BaseScript<
  {
    plan: RecommendationLifecyclePlan;
    mode: "reverse" | "category";
    afterProductId?: string;
  },
  { requests: RecommendationRequestGeneration[]; nextCursor: string | null }
> {
  @Transactional()
  protected async execute(input: {
    plan: RecommendationLifecyclePlan;
    mode: "reverse" | "category";
    afterProductId?: string;
  }) {
    const categoryIds = [
      ...new Set([...input.plan.oldState.categoryIds, ...input.plan.newState.categoryIds]),
    ];
    const page =
      input.mode === "reverse"
        ? await this.repository.recommendationAnchorCollector.reverseReferences({
            targetProductId: input.plan.productId,
            afterProductId: input.afterProductId,
            first: RECOMMENDATION_FAN_OUT_PAGE_SIZE,
          })
        : await this.repository.recommendationAnchorCollector.anchorsInCategories({
            categoryIds,
            afterProductId: input.afterProductId,
            first: RECOMMENDATION_FAN_OUT_PAGE_SIZE,
          });
    const requests: RecommendationRequestGeneration[] = [];
    for (const anchorProductId of page.anchorProductIds) {
      for (const placement of PLACEMENTS) {
        const policy =
          await this.repository.recommendationPlacementPolicy.findByPlacement(placement);
        if (!policy?.enabled) continue;
        if (
          input.mode === "category" &&
          (policy.strategy === "CURATED_ONLY" ||
            policy.minimumResults === 0 ||
            !policy.fallbackChain.includes("category_popularity"))
        )
          continue;
        requests.push(
          await this.repository.recommendationBuildRequest.request(
            anchorProductId,
            placement,
            `lifecycle:${input.plan.productId}:${input.plan.eventSequence}`,
          ),
        );
      }
    }
    return { requests, nextCursor: page.nextCursor };
  }
  protected handleError(error: unknown): never {
    throw error;
  }
}
