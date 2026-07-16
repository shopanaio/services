import { Injectable } from "@nestjs/common";
import {
  InjectBroker,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import type { RunScriptContext } from "../kernel/types.js";
import {
  RatingCriterionSectionUpdateScript,
  type ReviewSectionResult,
} from "../scripts/index.js";
import type {
  RatingCriterionUpdateOperation,
  RatingCriterionUpdateWorkflowInput,
  RatingCriterionUpdateWorkflowResult,
  ReviewsUpdateOperationResult,
} from "./dto/index.js";
import { ReviewsMutationWorkflow } from "./ReviewsMutationWorkflow.js";

@Injectable()
export class RatingCriterionUpdateWorkflow extends ReviewsMutationWorkflow {
  constructor(@InjectBroker("reviews") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("ratingCriterionUpdate")
  async run(
    input: RatingCriterionUpdateWorkflowInput
  ): Promise<RatingCriterionUpdateWorkflowResult> {
    const acquired = await this.stepAcquireVersion(
      input.criterionId,
      input.expectedUpdatedAt
    );
    if (acquired) {
      return {
        criterion: null,
        operationResults: [],
        userErrors: [acquired],
      };
    }

    const context = this.toScriptContext(input.context);
    const operationResults: ReviewsUpdateOperationResult[] = [];
    for (const operation of input.operations) {
      const result = await this.stepUpdateSection(
        input.criterionId,
        operation,
        context
      );
      const errors = prefixErrors(result.userErrors, operation);
      operationResults.push({
        type: operation.type,
        applied: errors.length === 0,
        errors,
      });
    }

    return {
      criterion: { id: input.criterionId },
      operationResults,
      userErrors: operationResults.flatMap((result) => result.errors),
    };
  }

  @WorkflowStep()
  private async stepAcquireVersion(
    criterionId: string,
    expectedUpdatedAt: string
  ) {
    const acquired = await this.kernel.repository.configuration.updateCriterion(
      criterionId,
      expectedUpdatedAt,
      {}
    );
    if (acquired.status === "applied") return null;
    if (acquired.status === "conflict") {
      return {
        message: "Rating criterion was modified by another user",
        code: "VERSION_CONFLICT",
        field: ["expectedUpdatedAt"],
      };
    }
    return {
      message: "Rating criterion not found",
      code: "NOT_FOUND",
      field: ["criterionId"],
    };
  }

  @WorkflowStep()
  private stepUpdateSection(
    criterionId: string,
    operation: RatingCriterionUpdateOperation,
    context: RunScriptContext
  ) {
    return this.kernel.runScript(
      RatingCriterionSectionUpdateScript,
      { criterionId, operation },
      context
    );
  }
}

function prefixErrors(
  errors: ReviewSectionResult["userErrors"],
  operation: RatingCriterionUpdateOperation
) {
  return errors.map((error) => ({
    ...error,
    field: error.field
      ? [...operation.meta.fieldPrefix, ...error.field]
      : operation.meta.fieldPrefix,
  }));
}
