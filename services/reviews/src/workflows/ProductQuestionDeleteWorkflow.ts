import { Injectable } from "@nestjs/common";
import type { ProductQuestionDeletedEvent } from "@shopana/events";
import {
  DBOS,
  InjectBroker,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { ProductQuestionDeleteScript } from "../scripts/index.js";
import type {
  ProductQuestionDeleteWorkflowInput,
  ProductQuestionDeleteWorkflowResult,
} from "./dto/index.js";
import { ReviewsMutationWorkflow } from "./ReviewsMutationWorkflow.js";

@Injectable()
export class ProductQuestionDeleteWorkflow extends ReviewsMutationWorkflow {
  constructor(@InjectBroker("reviews") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("productQuestionDelete")
  async run(
    input: ProductQuestionDeleteWorkflowInput
  ): Promise<ProductQuestionDeleteWorkflowResult> {
    const result = await this.stepDelete(input);
    if (result.deletedProductQuestionId && result.productId && result.permanent !== undefined && result.userErrors.length === 0) {
      await this.workflowEmitEvent(input, {
        productQuestionId: result.deletedProductQuestionId,
        productId: result.productId,
        permanent: result.permanent,
      });
    }
    return result;
  }

  @WorkflowStep()
  private stepDelete(input: ProductQuestionDeleteWorkflowInput) {
    return this.kernel.runScript(
      ProductQuestionDeleteScript,
      input.params,
      this.toScriptContext(input.context)
    );
  }

  private async workflowEmitEvent(
    input: ProductQuestionDeleteWorkflowInput,
    deleted: { productQuestionId: string; productId: string; permanent: boolean }
  ): Promise<void> {
    const payload: ProductQuestionDeletedEvent["payload"] = {
      ...deleted,
      storeId: input.context.storeId,
    };
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "productQuestionDeleted",
        payload,
        source: "reviews",
        context: {
          organizationId: input.context.organizationId,
          userId: input.context.userId,
        },
        subject: { type: "productQuestion", id: deleted.productQuestionId },
        actor: input.context.userId
          ? { type: "user" as const, id: input.context.userId }
          : undefined,
        emitKey: `productQuestion:${deleted.productQuestionId}:deleted`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitProductQuestionDeleted",
        callId: deleted.productQuestionId,
      }
    );
  }
}
