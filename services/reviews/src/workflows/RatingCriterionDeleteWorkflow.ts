import { Injectable } from "@nestjs/common";
import type { ReviewRatingCriterionDeletedEvent } from "@shopana/events";
import {
  DBOS,
  InjectBroker,
  Policy,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { RatingCriterionDeleteScript } from "../scripts/index.js";
import type {
  RatingCriterionDeleteWorkflowInput,
  RatingCriterionDeleteWorkflowResult,
} from "./dto/index.js";
import { ReviewsMutationWorkflow } from "./ReviewsMutationWorkflow.js";

@Injectable()
export class RatingCriterionDeleteWorkflow extends ReviewsMutationWorkflow {
  constructor(@InjectBroker("reviews") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("ratingCriterionDelete")
  @Policy<RatingCriterionDeleteWorkflowInput>({
    resource: "store.data",
    action: "admin",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  async run(
    input: RatingCriterionDeleteWorkflowInput
  ): Promise<RatingCriterionDeleteWorkflowResult> {
    const result = await this.stepDelete(input);
    if (result.deletedCriterionId && result.permanent !== undefined && result.userErrors.length === 0) {
      await this.workflowEmitEvent(input, {
        criterionId: result.deletedCriterionId,
        permanent: result.permanent,
      });
    }
    return result;
  }

  @WorkflowStep()
  private stepDelete(input: RatingCriterionDeleteWorkflowInput) {
    return this.kernel.runScript(
      RatingCriterionDeleteScript,
      input.params,
      this.toScriptContext(input.context)
    );
  }

  private async workflowEmitEvent(
    input: RatingCriterionDeleteWorkflowInput,
    deleted: { criterionId: string; permanent: boolean }
  ): Promise<void> {
    const payload: ReviewRatingCriterionDeletedEvent["payload"] = {
      ...deleted,
      storeId: input.context.storeId,
    };
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "reviewRatingCriterionDeleted",
        payload,
        context: {
          organizationId: input.context.organizationId,
          userId: input.context.userId,
        },
        subject: { type: "reviewRatingCriterion", id: deleted.criterionId },
        actor: input.context.userId
          ? { type: "user" as const, id: input.context.userId }
          : undefined,
        emitKey: `reviewRatingCriterion:${deleted.criterionId}:deleted`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitReviewRatingCriterionDeleted",
        callId: deleted.criterionId,
      }
    );
  }
}
