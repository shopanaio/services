import { Injectable } from "@nestjs/common";
import type { ReviewRequestCreatedEvent } from "@shopana/events";
import {
  DBOS,
  InjectBroker,
  Policy,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { ReviewRequestCreateScript } from "../scripts/index.js";
import type {
  ReviewRequestCreateWorkflowInput,
  ReviewRequestCreateWorkflowResult,
} from "./dto/index.js";
import { ReviewsMutationWorkflow } from "./ReviewsMutationWorkflow.js";

@Injectable()
export class ReviewRequestCreateWorkflow extends ReviewsMutationWorkflow {
  constructor(@InjectBroker("reviews") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("reviewRequestCreate")
  @Policy<ReviewRequestCreateWorkflowInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  async run(input: ReviewRequestCreateWorkflowInput): Promise<ReviewRequestCreateWorkflowResult> {
    const result = await this.stepCreate(input);
    if (result.reviewRequest && result.userErrors.length === 0) {
      await this.workflowEmitEvent(input, result.reviewRequest);
    }
    return result;
  }

  @WorkflowStep()
  private stepCreate(input: ReviewRequestCreateWorkflowInput) {
    return this.kernel.runScript(
      ReviewRequestCreateScript,
      input.params,
      this.toScriptContext(input.context),
    );
  }

  private async workflowEmitEvent(
    input: ReviewRequestCreateWorkflowInput,
    request: { id: string; customerId: string; productId: string },
  ): Promise<void> {
    const payload: ReviewRequestCreatedEvent["payload"] = {
      reviewRequestId: request.id,
      storeId: input.context.storeId,
      customerId: request.customerId,
      productId: request.productId,
    };
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "reviewRequestCreated",
        payload,
        context: {
          organizationId: input.context.organizationId,
          userId: input.context.userId,
        },
        subject: { type: "reviewRequest", id: request.id },
        actor: input.context.userId
          ? { type: "user" as const, id: input.context.userId }
          : undefined,
        emitKey: `reviewRequest:${request.id}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitReviewRequestCreated",
        callId: request.id,
      },
    );
  }
}
