import { Transactional } from "../../kernel/BaseScript.js";
import { BaseScript } from "../../kernel/BaseScript.js";

export class RecommendationCalculationRunTransitionScript extends BaseScript<
  {
    runId: string;
    transition: "READY" | "ACTIVE" | "FAILED";
    counts?: { productCount: number; pairCount: string };
    failureCode?: "CALCULATION_FAILED" | "INVALID_CALCULATION_RESULT";
  },
  { ok: true }
> {
  @Transactional()
  protected async execute(input: {
    runId: string;
    transition: "READY" | "ACTIVE" | "FAILED";
    counts?: { productCount: number; pairCount: string };
    failureCode?: "CALCULATION_FAILED" | "INVALID_CALCULATION_RESULT";
  }): Promise<{ ok: true }> {
    if (input.transition === "READY") {
      if (!input.counts) throw new Error("Calculation counts are required");
      await this.repository.recommendationCalculationRun.markReady(
        input.runId,
        input.counts.productCount,
        BigInt(input.counts.pairCount),
      );
    } else if (input.transition === "ACTIVE") {
      await this.repository.recommendationCalculationRun.activate(input.runId);
    } else {
      await this.repository.recommendationCalculationRun.markFailed(
        input.runId,
        input.failureCode ?? "CALCULATION_FAILED",
      );
    }
    return { ok: true };
  }

  protected handleError(error: unknown): never {
    throw error;
  }
}
