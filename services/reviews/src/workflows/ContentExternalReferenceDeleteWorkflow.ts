import { Injectable } from "@nestjs/common";
import type { ReviewContentExternalReferenceDeletedEvent } from "@shopana/events";
import {
  DBOS,
  InjectBroker,
  Policy,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { ContentExternalReferenceDeleteScript } from "../scripts/index.js";
import type {
  ContentExternalReferenceDeleteWorkflowInput,
  ContentExternalReferenceDeleteWorkflowResult,
} from "./dto/index.js";
import { ReviewsMutationWorkflow } from "./ReviewsMutationWorkflow.js";

@Injectable()
export class ContentExternalReferenceDeleteWorkflow extends ReviewsMutationWorkflow {
  constructor(@InjectBroker("reviews") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("contentExternalReferenceDelete")
  @Policy<ContentExternalReferenceDeleteWorkflowInput>({
    resource: "store.data",
    action: "admin",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  async run(
    input: ContentExternalReferenceDeleteWorkflowInput
  ): Promise<ContentExternalReferenceDeleteWorkflowResult> {
    const result = await this.stepDelete(input);
    if (result.deletedExternalReferenceId && result.contentId && result.permanent !== undefined && result.userErrors.length === 0) {
      await this.workflowEmitEvent(input, {
        externalReferenceId: result.deletedExternalReferenceId,
        contentId: result.contentId,
        permanent: result.permanent,
      });
    }
    return result;
  }

  @WorkflowStep()
  private stepDelete(input: ContentExternalReferenceDeleteWorkflowInput) {
    return this.kernel.runScript(
      ContentExternalReferenceDeleteScript,
      input.params,
      this.toScriptContext(input.context)
    );
  }

  private async workflowEmitEvent(
    input: ContentExternalReferenceDeleteWorkflowInput,
    deleted: {
      externalReferenceId: string;
      contentId: string;
      permanent: boolean;
    }
  ): Promise<void> {
    const payload: ReviewContentExternalReferenceDeletedEvent["payload"] = {
      ...deleted,
      storeId: input.context.storeId,
    };
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "reviewContentExternalReferenceDeleted",
        payload,
        context: {
          organizationId: input.context.organizationId,
          userId: input.context.userId,
        },
        subject: {
          type: "reviewContentExternalReference",
          id: deleted.externalReferenceId,
        },
        actor: input.context.userId
          ? { type: "user" as const, id: input.context.userId }
          : undefined,
        emitKey: `reviewContentExternalReference:${deleted.externalReferenceId}:deleted`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitReviewContentExternalReferenceDeleted",
        callId: deleted.externalReferenceId,
      }
    );
  }
}
