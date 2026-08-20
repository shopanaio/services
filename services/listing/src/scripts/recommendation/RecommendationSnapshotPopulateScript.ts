import { Transactional } from "../../kernel/BaseScript.js";
import { BaseScript } from "../../kernel/BaseScript.js";
import { buildRecommendation } from "../../recommendation/buildRecommendation.js";
import { RecommendationIntegrityError } from "../../recommendation/errors.js";

export class RecommendationSnapshotPopulateScript extends BaseScript<
  { snapshotId: string },
  { itemCount: number; contentHash: string }
> {
  @Transactional()
  protected async execute(input: { snapshotId: string }) {
    const snapshot = await this.repository.recommendationSnapshot.findById(input.snapshotId);
    if (!snapshot || snapshot.status !== "BUILDING") {
      throw new RecommendationIntegrityError("STALE_INPUT", "Snapshot is not BUILDING");
    }
    const policy = await this.repository.recommendationPlacementPolicy.findById(snapshot.policyId);
    if (!policy || !policy.enabled || policy.version !== snapshot.policyVersion) {
      throw new RecommendationIntegrityError("STALE_INPUT", "Snapshot policy is stale");
    }
    const manualRows = await this.repository.manualProductRecommendation.listEffective({
      anchorProductId: snapshot.anchorProductId,
      placement: snapshot.placement,
      asOf: snapshot.generatedAt,
    });
    const result = await buildRecommendation({
      anchorProductId: snapshot.anchorProductId,
      policy,
      manualRows,
      loadFbt: (limit) =>
        snapshot.calculationRunId
          ? this.repository.recommendationCandidateSource.fbt({
              anchorProductId: snapshot.anchorProductId,
              limit,
              runId: snapshot.calculationRunId,
            })
          : Promise.resolve([]),
      loadCategoryPopularity: (limit) =>
        snapshot.calculationRunId
          ? this.repository.recommendationCandidateSource.categoryPopularity({
              anchorProductId: snapshot.anchorProductId,
              limit,
              runId: snapshot.calculationRunId,
            })
          : Promise.resolve([]),
      loadStorePopularity: (limit) =>
        snapshot.calculationRunId
          ? this.repository.recommendationCandidateSource.storePopularity({
              anchorProductId: snapshot.anchorProductId,
              limit,
              runId: snapshot.calculationRunId,
            })
          : Promise.resolve([]),
      eligibility: (ids) => this.repository.recommendationCandidateSource.currentEligibility(ids),
    });
    return this.repository.recommendationSnapshot.populate(input.snapshotId, result.candidates);
  }

  protected handleError(error: unknown): never {
    throw error;
  }
}
