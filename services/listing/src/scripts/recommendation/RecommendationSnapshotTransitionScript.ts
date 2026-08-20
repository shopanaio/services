import { Transactional } from "../../kernel/BaseScript.js";
import { BaseScript } from "../../kernel/BaseScript.js";
import { manualConfigurationHash } from "../../recommendation/manualConfigurationHash.js";
import { recommendationModelVersion } from "../../recommendation/constants.js";
import type { RecommendationBuildInputs } from "../../repositories/recommendation/types.js";
import type { RecommendationRequestGeneration } from "../../repositories/recommendation/types.js";

export type RecommendationSnapshotTransitionParams =
  | { snapshotId: string; transition: "READY" }
  | { snapshotId: string; transition: "ACTIVE" }
  | { snapshotId: string; transition: "FAILED"; failureCode: string };

export class RecommendationSnapshotTransitionScript extends BaseScript<
  RecommendationSnapshotTransitionParams,
  { status: "applied" | "stale"; rebuildRequest?: RecommendationRequestGeneration }
> {
  @Transactional()
  protected async execute(input: RecommendationSnapshotTransitionParams) {
    if (input.transition === "READY") {
      await this.repository.recommendationSnapshot.markReady(input.snapshotId);
      return { status: "applied" as const };
    }
    if (input.transition === "FAILED") {
      const snapshot = await this.repository.recommendationSnapshot.findById(input.snapshotId);
      let rebuildRequest: RecommendationRequestGeneration | undefined;
      if (snapshot && input.failureCode === "STALE_INPUT") {
        const policy = await this.repository.recommendationPlacementPolicy.lockByPlacement(
          snapshot.placement,
        );
        if (policy?.enabled) {
          rebuildRequest = await this.repository.recommendationBuildRequest.request(
            snapshot.anchorProductId,
            snapshot.placement,
            `stale-rebuild:${snapshot.snapshotId}:${snapshot.policyVersion}`,
          );
        }
      }
      await this.repository.recommendationSnapshot.markFailed(input.snapshotId, input.failureCode);
      return { status: "applied" as const, rebuildRequest };
    }
    const snapshot = await this.repository.recommendationSnapshot.findById(input.snapshotId);
    if (!snapshot) return { status: "stale" as const };
    const locks = await this.repository.recommendationSnapshot.lockActivationLineage({
      snapshotId: snapshot.snapshotId,
      anchorProductId: snapshot.anchorProductId,
      placement: snapshot.placement,
      calculationRunId: snapshot.calculationRunId,
    });
    const fixed = snapshot.sourceWatermarks as unknown as RecommendationBuildInputs;
    const items = await this.repository.recommendationSnapshot.listItems(snapshot.snapshotId);
    const eligible = await this.repository.recommendationCandidateSource.eligibleTargetIds(
      items.map((item) => item.targetProductId),
    );
    const currentHash = await manualConfigurationHash({
      repository: this.repository.manualProductRecommendation,
      anchorProductId: snapshot.anchorProductId,
      placement: snapshot.placement,
      asOf: locks.activationAsOf,
    });
    const valid = locks.snapshot?.status === "READY" &&
      locks.policy?.enabled === true &&
      locks.policy.policyId === snapshot.policyId &&
      locks.policy.version === snapshot.policyVersion &&
      locks.request?.generation.toString() === fixed.requestedGeneration &&
      locks.request.triggerKey === fixed.triggerKey &&
      snapshot.modelVersion === recommendationModelVersion(snapshot.placement) &&
      items.length === snapshot.itemCount &&
      items.length <= (locks.policy?.maximumResults ?? -1) &&
      items.every((item, index) =>
        item.rank === index + 1 &&
        item.targetProductId !== snapshot.anchorProductId &&
        eligible.has(item.targetProductId)
      ) &&
      currentHash === fixed.manualConfigurationHash &&
      (snapshot.calculationRunId === null || locks.run?.status === "ACTIVE");
    if (!valid) {
      await this.repository.recommendationSnapshot.markFailed(snapshot.snapshotId, "STALE_INPUT");
      let rebuildRequest: RecommendationRequestGeneration | undefined;
      if (locks.policy?.enabled) {
        const requestAlreadyAdvanced = locks.request && (
          locks.request.generation.toString() !== fixed.requestedGeneration ||
          locks.request.triggerKey !== fixed.triggerKey
        );
        rebuildRequest = requestAlreadyAdvanced
          ? {
              requestId: locks.request!.requestId,
              anchorProductId: locks.request!.anchorProductId,
              placement: locks.request!.placement,
              generation: locks.request!.generation.toString(),
              triggerKey: locks.request!.triggerKey,
            }
          : await this.repository.recommendationBuildRequest.request(
              snapshot.anchorProductId,
              snapshot.placement,
              `stale-rebuild:${snapshot.snapshotId}:${currentHash}`,
            );
      }
      return { status: "stale" as const, rebuildRequest };
    }
    await this.repository.recommendationSnapshot.activate(snapshot.snapshotId);
    return { status: "applied" as const };
  }

  protected handleError(error: unknown): never {
    throw error;
  }
}
