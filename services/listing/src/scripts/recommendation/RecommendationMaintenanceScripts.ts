import { Transactional } from "../../kernel/BaseScript.js";
import { BaseScript } from "../../kernel/BaseScript.js";
import { RECOMMENDATION_FAN_OUT_PAGE_SIZE } from "../../recommendation/constants.js";
import type { RecommendationPlacement } from "../../repositories/models/recommendationRuntime.js";
import type { RecommendationRequestGeneration } from "../../repositories/recommendation/types.js";

export class RecommendationMaintenanceOpenScript extends BaseScript<
  { toBoundary: string },
  | { status: "BOOTSTRAPPING"; cutoff: string }
  | { status: "ACTIVE"; fromBoundary: string; toBoundary: string }
> {
  @Transactional()
  protected async execute(input: { toBoundary: string }) {
    const cursor = await this.repository.recommendationMaintenance.lockOrCreate();
    if (cursor.status === "BOOTSTRAPPING") {
      return { status: "BOOTSTRAPPING" as const, cutoff: cursor.bootstrapCutoffAt };
    }
    if (!cursor.lastManualBoundaryAt) throw new Error("Active recommendation maintenance cursor has no boundary");
    return {
      status: "ACTIVE" as const,
      fromBoundary: cursor.lastManualBoundaryAt,
      toBoundary: input.toBoundary,
    };
  }
  protected handleError(error: unknown): never { throw error; }
}

export class RecommendationMaintenanceRequestPageScript extends BaseScript<
  {
    mode: "bootstrap" | "interval";
    triggerKey: string;
    fromBoundary?: string;
    toBoundary?: string;
    after?: { anchorProductId: string; placement: RecommendationPlacement };
  },
  { requests: RecommendationRequestGeneration[]; nextCursor: { anchorProductId: string; placement: RecommendationPlacement } | null }
> {
  @Transactional()
  protected async execute(input: {
    mode: "bootstrap" | "interval";
    triggerKey: string;
    fromBoundary?: string;
    toBoundary?: string;
    after?: { anchorProductId: string; placement: RecommendationPlacement };
  }) {
    const page = input.mode === "bootstrap"
      ? await this.repository.recommendationMaintenance.listBootstrapAnchors({ after: input.after, first: RECOMMENDATION_FAN_OUT_PAGE_SIZE })
      : await this.repository.recommendationMaintenance.listBoundaries({
          fromBoundary: input.fromBoundary!,
          toBoundary: input.toBoundary!,
          after: input.after,
          first: RECOMMENDATION_FAN_OUT_PAGE_SIZE,
        });
    const requests: RecommendationRequestGeneration[] = [];
    for (const row of page.rows) {
      requests.push(await this.repository.recommendationBuildRequest.request(
        row.anchorProductId,
        row.placement,
        input.triggerKey,
      ));
    }
    return { requests, nextCursor: page.nextCursor };
  }
  protected handleError(error: unknown): never { throw error; }
}

export class RecommendationMaintenanceCompleteScript extends BaseScript<
  | { mode: "bootstrap"; cutoff: string }
  | { mode: "interval"; fromBoundary: string; toBoundary: string },
  { status: string }
> {
  @Transactional()
  protected async execute(input: { mode: "bootstrap"; cutoff: string } | { mode: "interval"; fromBoundary: string; toBoundary: string }) {
    if (input.mode === "bootstrap") {
      const activated = await this.repository.recommendationMaintenance.activateBootstrap(input.cutoff);
      return { status: activated ? "ACTIVATED" : "ALREADY_ACTIVE" };
    }
    return { status: await this.repository.recommendationMaintenance.advance(input.fromBoundary, input.toBoundary) };
  }
  protected handleError(error: unknown): never { throw error; }
}
