import { Injectable } from "@nestjs/common";
import type { ReviewContentExternalReferenceCreatedEvent } from "@shopana/events";
import {
  DBOS,
  InjectBroker,
  Policy,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { ContentExternalReferenceCreateScript } from "../scripts/index.js";
import type {
  ContentExternalReferenceCreateWorkflowInput,
  ContentExternalReferenceCreateWorkflowResult,
} from "./dto/index.js";
import { ReviewsMutationWorkflow } from "./ReviewsMutationWorkflow.js";

@Injectable()
export class ContentExternalReferenceCreateWorkflow extends ReviewsMutationWorkflow {
  constructor(@InjectBroker("reviews") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("contentExternalReferenceCreate")
  @Policy<ContentExternalReferenceCreateWorkflowInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  async run(
    input: ContentExternalReferenceCreateWorkflowInput,
  ): Promise<ContentExternalReferenceCreateWorkflowResult> {
    const result = await this.stepCreate(input);
    if (result.externalReference && result.userErrors.length === 0) {
      await this.workflowEmitEvent(input, result.externalReference);
    }
    return result;
  }

  @WorkflowStep()
  private stepCreate(input: ContentExternalReferenceCreateWorkflowInput) {
    return this.kernel.runScript(
      ContentExternalReferenceCreateScript,
      input.params,
      this.toScriptContext(input.context),
    );
  }

  private async workflowEmitEvent(
    input: ContentExternalReferenceCreateWorkflowInput,
    reference: { id: string; contentId: string },
  ): Promise<void> {
    const payload: ReviewContentExternalReferenceCreatedEvent["payload"] = {
      externalReferenceId: reference.id,
      storeId: input.context.storeId,
      contentId: reference.contentId,
    };
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "reviewContentExternalReferenceCreated",
        payload,
        context: {
          organizationId: input.context.organizationId,
          userId: input.context.userId,
        },
        subject: { type: "reviewContentExternalReference", id: reference.id },
        actor: input.context.userId
          ? { type: "user" as const, id: input.context.userId }
          : undefined,
        emitKey: `reviewContentExternalReference:${reference.id}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitReviewContentExternalReferenceCreated",
        callId: reference.id,
      },
    );
  }
}
