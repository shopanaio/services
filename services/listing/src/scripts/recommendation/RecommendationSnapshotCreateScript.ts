import { Transactional } from "../../kernel/BaseScript.js";
import { BaseScript } from "../../kernel/BaseScript.js";
import { manualConfigurationHash } from "../../recommendation/manualConfigurationHash.js";
import { recommendationModelVersion } from "../../recommendation/constants.js";
import { sha256Canonical } from "../../recommendation/canonical.js";
import type { RecommendationPlacement } from "../../repositories/models/recommendationRuntime.js";
import type { RecommendationBuildInputs } from "../../repositories/recommendation/types.js";

export interface RecommendationSnapshotCreateParams {
  anchorProductId: string;
  placement: RecommendationPlacement;
  requestedGeneration: string;
  triggerKey: string;
}

export type RecommendationSnapshotCreateResult =
  { status: "stale" | "disabled" } | { status: "created"; snapshotId: string; buildKey: string };

export class RecommendationSnapshotCreateScript extends BaseScript<
  RecommendationSnapshotCreateParams,
  RecommendationSnapshotCreateResult
> {
  @Transactional()
  protected async execute(
    input: RecommendationSnapshotCreateParams,
  ): Promise<RecommendationSnapshotCreateResult> {
    const policy = await this.repository.recommendationPlacementPolicy.lockByPlacement(
      input.placement,
    );
    if (!policy?.enabled) return { status: "disabled" };
    const request = await this.repository.recommendationBuildRequest.lockOrCreateMutex(
      input.anchorProductId,
      input.placement,
    );
    if (
      request.generation.toString() !== input.requestedGeneration ||
      request.triggerKey !== input.triggerKey
    ) {
      return { status: "stale" };
    }
    const asOf = await this.repository.recommendationCalculationRun.databaseNow();
    const run = await this.repository.recommendationCalculationRun.findActive();
    const buildInputs: RecommendationBuildInputs = {
      asOf,
      policyId: policy.policyId,
      policyVersion: policy.version,
      calculationRunId: run?.runId ?? null,
      sourceIngestionWatermark: run?.sourceIngestionWatermark.toString() ?? null,
      manualConfigurationHash: await manualConfigurationHash({
        repository: this.repository.manualProductRecommendation,
        anchorProductId: input.anchorProductId,
        placement: input.placement,
        asOf,
      }),
      requestedGeneration: input.requestedGeneration,
      triggerKey: input.triggerKey,
      modelVersion: recommendationModelVersion(input.placement),
    };
    const buildKey = sha256Canonical({
      version: 1,
      anchorProductId: input.anchorProductId,
      placement: input.placement,
      ...buildInputs,
    });
    const snapshot = await this.repository.recommendationSnapshot.create({
      anchorProductId: input.anchorProductId,
      placement: input.placement,
      policy,
      buildInputs,
      buildKey,
    });
    return { status: "created", snapshotId: snapshot.snapshotId, buildKey };
  }

  protected handleError(error: unknown): never {
    throw error;
  }
}
