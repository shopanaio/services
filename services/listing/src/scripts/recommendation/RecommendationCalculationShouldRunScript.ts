import { Transactional } from "../../kernel/BaseScript.js";
import { BaseScript } from "../../kernel/BaseScript.js";
import { FBT_RULES_V1 } from "../../recommendation/constants.js";

export class RecommendationCalculationShouldRunScript extends BaseScript<
  Record<string, never>,
  { shouldRun: boolean }
> {
  @Transactional()
  protected async execute(): Promise<{ shouldRun: boolean }> {
    const cursor = await this.repository.recommendationIngestionCursor.lockOrCreate();
    const window = await this.repository.recommendationCalculationRun.currentWindow(
      FBT_RULES_V1.windowDays,
    );
    const latest = await this.repository.recommendationCalculationRun.findLatestCurrentDay(
      window.windowEndedAt,
    );
    if (!latest || !["BUILDING", "READY", "ACTIVE"].includes(latest.status)) {
      return { shouldRun: true };
    }
    if (latest.sourceIngestionWatermark >= cursor.lastPosition) {
      return { shouldRun: false };
    }
    return {
      shouldRun: await this.repository.recommendationOrderFact.hasClosedWindowChanges({
        afterWatermark: latest.sourceIngestionWatermark,
        windowEndedAt: latest.windowEndedAt,
      }),
    };
  }

  protected handleError(error: unknown): never {
    throw error;
  }
}
