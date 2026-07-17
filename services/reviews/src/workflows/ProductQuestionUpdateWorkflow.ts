import { Injectable } from "@nestjs/common";
import {
  InjectBroker,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import type { RunScriptContext } from "../kernel/types.js";
import {
  ProductQuestionAnswerCreateScript,
  ProductQuestionAnswerDeleteScript,
  ProductQuestionAnswerUpdateScript,
  ProductQuestionSectionUpdateScript,
  type ReviewSectionResult,
} from "../scripts/index.js";
import type {
  ProductQuestionUpdateOperation,
  ProductQuestionUpdateOperationResult,
  ProductQuestionUpdateWorkflowInput,
  ProductQuestionUpdateWorkflowResult,
} from "./dto/index.js";
import { ReviewsMutationWorkflow } from "./ReviewsMutationWorkflow.js";

@Injectable()
export class ProductQuestionUpdateWorkflow extends ReviewsMutationWorkflow {
  constructor(@InjectBroker("reviews") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("productQuestionUpdate")
  async run(
    input: ProductQuestionUpdateWorkflowInput
  ): Promise<ProductQuestionUpdateWorkflowResult> {
    const acquired = await this.stepAcquireRevision(
      input.productQuestionId,
      input.expectedRevision
    );
    if ("error" in acquired) {
      return {
        productQuestion: null,
        operationResults: [],
        userErrors: [acquired.error],
      };
    }

    const context = this.toScriptContext(input.context);
    const operationResults: ProductQuestionUpdateOperationResult[] = [];
    for (const operation of input.operations) {
      const result = await this.runOperation(
        input.productQuestionId,
        operation,
        context
      );
      const errors = prefixErrors(result.userErrors, operation);
      operationResults.push({
        type: operation.type,
        applied: errors.length === 0,
        clientMutationId:
          operation.type === "productQuestionAnswerCreate"
            ? operation.params.clientMutationId ?? undefined
            : undefined,
        entityId:
          result.entityId ??
          (operation.type === "productQuestionAnswerUpdate" ||
          operation.type === "productQuestionAnswerDelete"
            ? operation.params.answerId
            : undefined),
        errors,
      });
    }

    if (operationResults.some((result) => result.applied)) {
      await this.stepRefreshProductQuestionSummary({
        context: input.context,
        productId: acquired.productId,
      });
    }

    return {
      productQuestion: {
        id: input.productQuestionId,
        revision: acquired.revision,
      },
      operationResults,
      userErrors: operationResults.flatMap((result) => result.errors),
    };
  }

  @WorkflowStep()
  private async stepAcquireRevision(
    productQuestionId: string,
    expectedRevision: number
  ): Promise<
    | { revision: number; productId: string }
    | { error: { message: string; code: string; field: string[] } }
  > {
    const question = await this.kernel.repository.productQuestion.findById(
      productQuestionId
    );
    if (!question) {
      return {
        error: {
          message: "Product question not found",
          code: "NOT_FOUND",
          field: ["productQuestionId"],
        },
      };
    }

    const acquired = await this.kernel.repository.content.update(
      productQuestionId,
      expectedRevision,
      {}
    );
    if (acquired.status === "applied") {
      return {
        revision: acquired.value.revision,
        productId: question.question.productId,
      };
    }
    if (acquired.status === "conflict") {
      return {
        error: {
          message: "Product question was modified by another user",
          code: "REVISION_CONFLICT",
          field: ["expectedRevision"],
        },
      };
    }
    return {
      error: {
        message: "Product question not found",
        code: "NOT_FOUND",
        field: ["productQuestionId"],
      },
    };
  }

  private runOperation(
    productQuestionId: string,
    operation: ProductQuestionUpdateOperation,
    context: RunScriptContext
  ): Promise<ReviewSectionResult> {
    switch (operation.type) {
      case "productQuestionAnswerCreate":
        return this.stepAnswerCreate(productQuestionId, operation, context);
      case "productQuestionAnswerUpdate":
        return this.stepAnswerUpdate(productQuestionId, operation, context);
      case "productQuestionAnswerDelete":
        return this.stepAnswerDelete(productQuestionId, operation, context);
      default:
        return this.stepSectionUpdate(productQuestionId, operation, context);
    }
  }

  @WorkflowStep()
  private stepSectionUpdate(
    productQuestionId: string,
    operation: Exclude<
      ProductQuestionUpdateOperation,
      | { type: "productQuestionAnswerCreate" }
      | { type: "productQuestionAnswerUpdate" }
      | { type: "productQuestionAnswerDelete" }
    >,
    context: RunScriptContext
  ) {
    return this.kernel.runScript(
      ProductQuestionSectionUpdateScript,
      { productQuestionId, operation },
      context
    );
  }

  @WorkflowStep()
  private stepAnswerCreate(
    productQuestionId: string,
    operation: Extract<
      ProductQuestionUpdateOperation,
      { type: "productQuestionAnswerCreate" }
    >,
    context: RunScriptContext
  ) {
    return this.kernel.runScript(
      ProductQuestionAnswerCreateScript,
      { productQuestionId, operation },
      context
    );
  }

  @WorkflowStep()
  private stepAnswerUpdate(
    productQuestionId: string,
    operation: Extract<
      ProductQuestionUpdateOperation,
      { type: "productQuestionAnswerUpdate" }
    >,
    context: RunScriptContext
  ) {
    return this.kernel.runScript(
      ProductQuestionAnswerUpdateScript,
      { productQuestionId, operation },
      context
    );
  }

  @WorkflowStep()
  private stepAnswerDelete(
    productQuestionId: string,
    operation: Extract<
      ProductQuestionUpdateOperation,
      { type: "productQuestionAnswerDelete" }
    >,
    context: RunScriptContext
  ) {
    return this.kernel.runScript(
      ProductQuestionAnswerDeleteScript,
      { productQuestionId, operation },
      context
    );
  }
}

function prefixErrors(
  errors: ReviewSectionResult["userErrors"],
  operation: ProductQuestionUpdateOperation
) {
  return errors.map((error) => ({
    ...error,
    field: error.field
      ? [...operation.meta.fieldPrefix, ...error.field]
      : operation.meta.fieldPrefix,
  }));
}
