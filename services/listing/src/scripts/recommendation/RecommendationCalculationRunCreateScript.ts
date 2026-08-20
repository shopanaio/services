import { Transactional } from "../../kernel/BaseScript.js";
import { BaseScript } from "../../kernel/BaseScript.js";
import { sha256Canonical } from "../../recommendation/canonical.js";
import { FBT_ALGORITHM_VERSION, FBT_RULES_V1 } from "../../recommendation/constants.js";
import type { RecommendationCalculationRunResult } from "./dto/index.js";
import { genericError } from "./validation.js";

export class RecommendationCalculationRunCreateScript extends BaseScript<
  Record<string, never>,
  RecommendationCalculationRunResult
> {
  @Transactional()
  protected async execute(): Promise<RecommendationCalculationRunResult> {
    const cursor = await this.repository.recommendationIngestionCursor.lockOrCreate();
    const window = await this.repository.recommendationCalculationRun.currentWindow(
      FBT_RULES_V1.windowDays,
    );
    const idempotencyKey = sha256Canonical({
      version: 1,
      calculationType: "FREQUENTLY_BOUGHT_TOGETHER",
      algorithmVersion: FBT_ALGORITHM_VERSION,
      ...window,
      sourceIngestionWatermark: cursor.lastPosition.toString(),
    });
    const run = await this.repository.recommendationCalculationRun.create({
      algorithmVersion: FBT_ALGORITHM_VERSION,
      ...window,
      sourceIngestionWatermark: cursor.lastPosition,
      idempotencyKey,
    });
    return { run, userErrors: [] };
  }

  protected handleError(error: unknown): RecommendationCalculationRunResult {
    return { userErrors: genericError(error) };
  }
}
