import { Transactional } from "../../kernel/BaseScript.js";
import { BaseScript } from "../../kernel/BaseScript.js";
import { RecommendationIntegrityError } from "../../recommendation/errors.js";

export interface RecommendationCalculationComputeResult {
  phase: "ACCUMULATE" | "PRODUCTS" | "PAIRS" | "COMPLETE";
  processed: number;
  counts?: { productCount: number; pairCount: string };
}

export class RecommendationCalculationRunComputeScript extends BaseScript<
  { runId: string },
  RecommendationCalculationComputeResult
> {
  @Transactional()
  protected async execute({
    runId,
  }: {
    runId: string;
  }): Promise<RecommendationCalculationComputeResult> {
    const run = await this.repository.recommendationCalculationRun.findById(runId);
    if (!run || run.status !== "BUILDING") {
      throw new RecommendationIntegrityError("STALE_INPUT", "Calculation run is not BUILDING");
    }
    if (run.materializationPhase === "COMPLETE") {
      return {
        phase: "COMPLETE",
        processed: 0,
        counts: { productCount: run.productCount, pairCount: run.pairCount.toString() },
      };
    }
    if (run.materializationPhase === "ACCUMULATE") {
      const page = await this.repository.recommendationCalculationAccumulator.accumulateNext(run);
      if (page.done) {
        await this.repository.recommendationCalculationRun.setPhase(
          runId,
          "ACCUMULATE",
          "PRODUCTS",
        );
        return { phase: "PRODUCTS", processed: 0 };
      }
      return { phase: "ACCUMULATE", processed: page.consideredOrders };
    }
    if (run.materializationPhase === "PRODUCTS") {
      const page =
        await this.repository.recommendationCalculationAccumulator.materializeProducts(run);
      if (page.done) {
        await this.repository.recommendationCalculationRun.setPhase(runId, "PRODUCTS", "PAIRS");
        return { phase: "PAIRS", processed: 0 };
      }
      return { phase: "PRODUCTS", processed: page.inserted };
    }
    const page = await this.repository.recommendationCalculationAccumulator.materializePairs(run);
    if (!page.done) return { phase: "PAIRS", processed: page.inserted };
    const counts = await this.repository.recommendationCalculationAccumulator.finalize(runId);
    return {
      phase: "COMPLETE",
      processed: 0,
      counts: { productCount: counts.productCount, pairCount: counts.pairCount.toString() },
    };
  }

  protected handleError(error: unknown): never {
    throw error;
  }
}
