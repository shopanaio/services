import { Injectable } from "@nestjs/common";
import type { ReviewRatingCriterionCreatedEvent } from "@shopana/events";
import {
  DBOS,
  InjectBroker,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { RatingCriterionCreateScript } from "../scripts/index.js";
import type {
  RatingCriterionCreateWorkflowInput,
  RatingCriterionCreateWorkflowResult,
} from "./dto/index.js";
import { ReviewsMutationWorkflow } from "./ReviewsMutationWorkflow.js";

@Injectable()
export class RatingCriterionCreateWorkflow extends ReviewsMutationWorkflow {
  constructor(@InjectBroker("reviews") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("ratingCriterionCreate")
  async run(
    input: RatingCriterionCreateWorkflowInput
  ): Promise<RatingCriterionCreateWorkflowResult> {
    const result = await this.stepCreate(input);
    if (result.criterion && result.userErrors.length === 0) {
      await this.workflowEmitEvent(input, result.criterion.id);
    }
    return result;
  }

  @WorkflowStep()
  private stepCreate(input: RatingCriterionCreateWorkflowInput) {
    return this.kernel.runScript(
      RatingCriterionCreateScript,
      input.params,
      this.toScriptContext(input.context)
    );
  }

  private async workflowEmitEvent(
    input: RatingCriterionCreateWorkflowInput,
    criterionId: string
  ): Promise<void> {
    const payload: ReviewRatingCriterionCreatedEvent["payload"] = {
      criterionId,
      storeId: input.context.storeId,
    };
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "reviewRatingCriterionCreated",
        payload,
        source: "reviews",
        context: {
          organizationId: input.context.organizationId,
          userId: input.context.userId,
        },
        subject: { type: "reviewRatingCriterion", id: criterionId },
        actor: input.context.userId
          ? { type: "user" as const, id: input.context.userId }
          : undefined,
        emitKey: `reviewRatingCriterion:${criterionId}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitReviewRatingCriterionCreated",
        callId: criterionId,
      }
    );
  }
}
