import { Injectable } from "@nestjs/common";
import type { ReviewCreatedEvent } from "@shopana/events";
import {
  DBOS,
  InjectBroker,
  Policy,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { ReviewCreateScript } from "../scripts/index.js";
import type {
  ReviewCreateWorkflowInput,
  ReviewCreateWorkflowResult,
} from "./dto/index.js";
import { ReviewsMutationWorkflow } from "./ReviewsMutationWorkflow.js";

@Injectable()
export class ReviewCreateWorkflow extends ReviewsMutationWorkflow {
  constructor(@InjectBroker("reviews") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("reviewCreate")
  @Policy<ReviewCreateWorkflowInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  async run(input: ReviewCreateWorkflowInput): Promise<ReviewCreateWorkflowResult> {
    const result = await this.stepCreate(input);
    if (result.review && result.userErrors.length === 0) {
      await this.stepRefreshProductReviewSummary({
        context: input.context,
        productId: result.review.productId,
      });
      await this.workflowEmitEvent(input, result.review);
    }
    return result;
  }

  @WorkflowStep()
  private stepCreate(input: ReviewCreateWorkflowInput) {
    return this.kernel.runScript(
      ReviewCreateScript,
      input.params,
      this.toScriptContext(input.context)
    );
  }

  private async workflowEmitEvent(
    input: ReviewCreateWorkflowInput,
    review: { id: string; productId: string }
  ): Promise<void> {
    const payload: ReviewCreatedEvent["payload"] = {
      reviewId: review.id,
      storeId: input.context.storeId,
      productId: review.productId,
    };
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "reviewCreated",
        payload,
        context: {
          organizationId: input.context.organizationId,
          userId: input.context.userId,
        },
        subject: { type: "review", id: review.id },
        actor: input.context.userId
          ? { type: "user" as const, id: input.context.userId }
          : undefined,
        emitKey: `review:${review.id}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitReviewCreated",
        callId: review.id,
      }
    );
  }
}
