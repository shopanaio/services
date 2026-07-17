import { Injectable } from "@nestjs/common";
import {
  InjectBroker,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import type { RunScriptContext } from "../kernel/types.js";
import {
  ReviewReplyCreateScript,
  ReviewReplyDeleteScript,
  ReviewReplyUpdateScript,
  ReviewSectionUpdateScript,
  type ReviewSectionResult,
} from "../scripts/index.js";
import type {
  ReviewUpdateOperation,
  ReviewUpdateOperationResult,
  ReviewUpdateWorkflowInput,
  ReviewUpdateWorkflowResult,
} from "./dto/index.js";
import { ReviewsMutationWorkflow } from "./ReviewsMutationWorkflow.js";

@Injectable()
export class ReviewUpdateWorkflow extends ReviewsMutationWorkflow {
  constructor(@InjectBroker("reviews") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("reviewUpdate")
  async run(
    input: ReviewUpdateWorkflowInput
  ): Promise<ReviewUpdateWorkflowResult> {
    const acquired = await this.stepAcquireRevision(
      input.reviewId,
      input.expectedRevision
    );
    if ("error" in acquired) {
      return {
        review: null,
        operationResults: [],
        userErrors: [acquired.error],
      };
    }

    const context = this.toScriptContext(input.context);
    const operationResults: ReviewUpdateOperationResult[] = [];
    for (const operation of input.operations) {
      const result = await this.runOperation(
        input.reviewId,
        operation,
        context
      );
      const errors = prefixErrors(result.userErrors, operation);
      operationResults.push({
        type: operation.type,
        applied: errors.length === 0,
        clientMutationId:
          operation.type === "reviewReplyCreate"
            ? operation.params.clientMutationId ?? undefined
            : undefined,
        entityId:
          result.entityId ??
          (operation.type === "reviewReplyUpdate" ||
          operation.type === "reviewReplyDelete"
            ? operation.params.replyId
            : undefined),
        errors,
      });
    }

    if (operationResults.some((result) => result.applied)) {
      await this.stepRefreshProductReviewSummary({
        context: input.context,
        productId: acquired.productId,
      });
    }

    return {
      review: { id: input.reviewId, revision: acquired.revision },
      operationResults,
      userErrors: operationResults.flatMap((result) => result.errors),
    };
  }

  @WorkflowStep()
  private async stepAcquireRevision(
    reviewId: string,
    expectedRevision: number
  ): Promise<
    | { revision: number; productId: string }
    | { error: { message: string; code: string; field: string[] } }
  > {
    const review = await this.kernel.repository.review.findById(reviewId);
    if (!review) {
      return {
        error: {
          message: "Review not found",
          code: "NOT_FOUND",
          field: ["reviewId"],
        },
      };
    }

    const acquired = await this.kernel.repository.content.update(
      reviewId,
      expectedRevision,
      {}
    );
    if (acquired.status === "applied") {
      return {
        revision: acquired.value.revision,
        productId: review.review.productId,
      };
    }
    if (acquired.status === "conflict") {
      return {
        error: {
          message: "Review was modified by another user",
          code: "REVISION_CONFLICT",
          field: ["expectedRevision"],
        },
      };
    }
    return {
      error: {
        message: "Review not found",
        code: "NOT_FOUND",
        field: ["reviewId"],
      },
    };
  }

  private runOperation(
    reviewId: string,
    operation: ReviewUpdateOperation,
    context: RunScriptContext
  ): Promise<ReviewSectionResult> {
    switch (operation.type) {
      case "reviewReplyCreate":
        return this.stepReplyCreate(reviewId, operation, context);
      case "reviewReplyUpdate":
        return this.stepReplyUpdate(reviewId, operation, context);
      case "reviewReplyDelete":
        return this.stepReplyDelete(reviewId, operation, context);
      default:
        return this.stepSectionUpdate(reviewId, operation, context);
    }
  }

  @WorkflowStep()
  private stepSectionUpdate(
    reviewId: string,
    operation: Exclude<
      ReviewUpdateOperation,
      | { type: "reviewReplyCreate" }
      | { type: "reviewReplyUpdate" }
      | { type: "reviewReplyDelete" }
    >,
    context: RunScriptContext
  ) {
    return this.kernel.runScript(
      ReviewSectionUpdateScript,
      { reviewId, operation },
      context
    );
  }

  @WorkflowStep()
  private stepReplyCreate(
    reviewId: string,
    operation: Extract<
      ReviewUpdateOperation,
      { type: "reviewReplyCreate" }
    >,
    context: RunScriptContext
  ) {
    return this.kernel.runScript(
      ReviewReplyCreateScript,
      { reviewId, operation },
      context
    );
  }

  @WorkflowStep()
  private stepReplyUpdate(
    reviewId: string,
    operation: Extract<
      ReviewUpdateOperation,
      { type: "reviewReplyUpdate" }
    >,
    context: RunScriptContext
  ) {
    return this.kernel.runScript(
      ReviewReplyUpdateScript,
      { reviewId, operation },
      context
    );
  }

  @WorkflowStep()
  private stepReplyDelete(
    reviewId: string,
    operation: Extract<
      ReviewUpdateOperation,
      { type: "reviewReplyDelete" }
    >,
    context: RunScriptContext
  ) {
    return this.kernel.runScript(
      ReviewReplyDeleteScript,
      { reviewId, operation },
      context
    );
  }
}

function prefixErrors(
  errors: ReviewSectionResult["userErrors"],
  operation: ReviewUpdateOperation
) {
  return errors.map((error) => ({
    ...error,
    field: error.field
      ? [...operation.meta.fieldPrefix, ...error.field]
      : operation.meta.fieldPrefix,
  }));
}
