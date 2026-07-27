import { Injectable } from "@nestjs/common";
import type { ProductQuestionCreatedEvent } from "@shopana/events";
import {
  DBOS,
  InjectBroker,
  Policy,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { ProductQuestionCreateScript } from "../scripts/index.js";
import type {
  ProductQuestionCreateWorkflowInput,
  ProductQuestionCreateWorkflowResult,
} from "./dto/index.js";
import { ReviewsMutationWorkflow } from "./ReviewsMutationWorkflow.js";

@Injectable()
export class ProductQuestionCreateWorkflow extends ReviewsMutationWorkflow {
  constructor(@InjectBroker("reviews") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("productQuestionCreate")
  @Policy<ProductQuestionCreateWorkflowInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  async run(
    input: ProductQuestionCreateWorkflowInput
  ): Promise<ProductQuestionCreateWorkflowResult> {
    const result = await this.stepCreate(input);
    if (result.productQuestion && result.userErrors.length === 0) {
      await this.stepRefreshProductQuestionSummary({
        context: input.context,
        productId: result.productQuestion.productId,
      });
      await this.workflowEmitEvent(input, result.productQuestion);
    }
    return result;
  }

  @WorkflowStep()
  private stepCreate(input: ProductQuestionCreateWorkflowInput) {
    return this.kernel.runScript(
      ProductQuestionCreateScript,
      input.params,
      this.toScriptContext(input.context)
    );
  }

  private async workflowEmitEvent(
    input: ProductQuestionCreateWorkflowInput,
    question: { id: string; productId: string }
  ): Promise<void> {
    const payload: ProductQuestionCreatedEvent["payload"] = {
      productQuestionId: question.id,
      storeId: input.context.storeId,
      productId: question.productId,
    };
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType: "productQuestionCreated",
        payload,
        context: {
          organizationId: input.context.organizationId,
          userId: input.context.userId,
        },
        subject: { type: "productQuestion", id: question.id },
        actor: input.context.userId
          ? { type: "user" as const, id: input.context.userId }
          : undefined,
        emitKey: `productQuestion:${question.id}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitProductQuestionCreated",
        callId: question.id,
      }
    );
  }
}
