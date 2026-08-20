import { Injectable, Logger } from "@nestjs/common";
import {
  buildIdempotencyKey,
  hashContent,
  InjectBroker,
  ServiceBroker,
  type IdempotencyContext,
} from "@shopana/shared-kernel";
import type { RecommendationGlobalTriggerInput } from "../workflows/RecommendationWorkflows.js";
import { isDuplicateWorkflowStartError } from "../workflows/listingIndexWorkflowHelpers.js";

@Injectable()
export class RecommendationScheduler {
  private readonly logger = new Logger(RecommendationScheduler.name);
  private minuteTimer: ReturnType<typeof setInterval> | null = null;
  private hourTimer: ReturnType<typeof setInterval> | null = null;

  constructor(@InjectBroker("listing") private readonly broker: ServiceBroker) {}

  start(): void {
    if (this.minuteTimer || this.hourTimer) return;
    void this.dispatch("manual");
    void this.dispatch("calculation");
    this.minuteTimer = setInterval(() => void this.dispatch("manual"), 60_000);
    this.hourTimer = setInterval(() => void this.dispatch("calculation"), 60 * 60_000);
  }

  stop(): void {
    if (this.minuteTimer) clearInterval(this.minuteTimer);
    if (this.hourTimer) clearInterval(this.hourTimer);
    this.minuteTimer = null;
    this.hourTimer = null;
  }

  private async dispatch(kind: "calculation" | "manual"): Promise<void> {
    const now = new Date();
    const bucket = kind === "manual"
      ? new Date(Math.floor(now.getTime() / 60_000) * 60_000).toISOString()
      : new Date(Math.floor(now.getTime() / 3_600_000) * 3_600_000).toISOString();
    const input: RecommendationGlobalTriggerInput = { kind, bucket };
    const idempotency: IdempotencyContext = {
      source: "content",
      resourceId: "recommendations",
      operation: `listing.recommendation-${kind}`,
      contentHash: hashContent(input),
    };
    const workflowId = buildIdempotencyKey("listing.recommendationGlobalTrigger", idempotency);
    try {
      await this.broker.startWorkflow("listing.recommendationGlobalTrigger", input, idempotency, { workflowId });
    } catch (error) {
      if (isDuplicateWorkflowStartError(error, workflowId)) return;
      this.logger.error({ error, kind, bucket }, "Failed to start recommendation scheduler trigger");
    }
  }
}
