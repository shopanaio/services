import { Injectable } from "@nestjs/common";
import type { ReviewDeletedEvent } from "@shopana/events";
import {
  DBOS,
  InjectBroker,
  Policy,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { ReviewDeleteScript } from "../scripts/index.js";
import type {
  ReviewDeleteWorkflowInput,
  ReviewDeleteWorkflowResult,
} from "./dto/index.js";
import { ReviewsMutationWorkflow } from "./ReviewsMutationWorkflow.js";

@Injectable()
export class ReviewDeleteWorkflow extends ReviewsMutationWorkflow {
  constructor(@InjectBroker("reviews") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("reviewDelete")
  @Policy<ReviewDeleteWorkflowInput>({
    resource: "store.data",
    action: "admin",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  async run(input: ReviewDeleteWorkflowInput): Promise<ReviewDeleteWorkflowResult> {
    const result = await this.stepDelete(input);
    if (result.deletedReviewId && result.productId && result.permanent !== undefined && result.userErrors.length === 0) {
      await this.stepRefreshProductReviewSummary({
        context: input.context,
        productId: result.productId,
      });
      await this.workflowEmitEvent(input, {
        reviewId: result.deletedReviewId,
        productId: result.productId,
        permanent: result.permanent,
      });
    }
    return result;
  }

  @WorkflowStep()
  private stepDelete(input: ReviewDeleteWorkflowInput) {
    return this.kernel.runScript(
      ReviewDeleteScript,
      input.params,
      this.toScriptContext(input.context)
    );
  }

  private async workflowEmitEvent(
    input: ReviewDeleteWorkflowInput,
    deleted: { reviewId: string; productId: string; permanent: boolean }
  ): Promise<void> {
    const payload: ReviewDeletedEvent["payload"] = {
      ...deleted,
      storeId: input.context.storeId,
    };
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "reviewDeleted",
        payload,
        context: {
          organizationId: input.context.organizationId,
          userId: input.context.userId,
        },
        subject: { type: "review", id: deleted.reviewId },
        actor: input.context.userId
          ? { type: "user" as const, id: input.context.userId }
          : undefined,
        emitKey: `review:${deleted.reviewId}:deleted`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitReviewDeleted",
        callId: deleted.reviewId,
      }
    );
  }
}
