import { Injectable } from "@nestjs/common";
import type { ReviewModerationCaseCreatedEvent } from "@shopana/events";
import {
  DBOS,
  InjectBroker,
  Policy,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { ModerationCaseCreateScript } from "../scripts/index.js";
import type {
  ModerationCaseCreateWorkflowInput,
  ModerationCaseCreateWorkflowResult,
} from "./dto/index.js";
import { ReviewsMutationWorkflow } from "./ReviewsMutationWorkflow.js";

@Injectable()
export class ModerationCaseCreateWorkflow extends ReviewsMutationWorkflow {
  constructor(@InjectBroker("reviews") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("moderationCaseCreate")
  @Policy<ModerationCaseCreateWorkflowInput>({
    resource: "store.data",
    action: "admin",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  async run(input: ModerationCaseCreateWorkflowInput): Promise<ModerationCaseCreateWorkflowResult> {
    const result = await this.stepCreate(input);
    if (result.moderationCase && result.userErrors.length === 0) {
      await this.workflowEmitEvent(input, result.moderationCase);
    }
    return result;
  }

  @WorkflowStep()
  private stepCreate(input: ModerationCaseCreateWorkflowInput) {
    return this.kernel.runScript(
      ModerationCaseCreateScript,
      input.params,
      this.toScriptContext(input.context),
    );
  }

  private async workflowEmitEvent(
    input: ModerationCaseCreateWorkflowInput,
    moderationCase: { id: string; contentId: string },
  ): Promise<void> {
    const payload: ReviewModerationCaseCreatedEvent["payload"] = {
      moderationCaseId: moderationCase.id,
      storeId: input.context.storeId,
      contentId: moderationCase.contentId,
    };
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "reviewModerationCaseCreated",
        payload,
        context: {
          organizationId: input.context.organizationId,
          userId: input.context.userId,
        },
        subject: { type: "reviewModerationCase", id: moderationCase.id },
        actor: input.context.userId
          ? { type: "user" as const, id: input.context.userId }
          : undefined,
        emitKey: `reviewModerationCase:${moderationCase.id}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitReviewModerationCaseCreated",
        callId: moderationCase.id,
      },
    );
  }
}
