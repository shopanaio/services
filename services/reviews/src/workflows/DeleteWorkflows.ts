import { Injectable } from "@nestjs/common";
import type {
  ProductQuestionDeletedEvent,
  ReviewContentExternalReferenceDeletedEvent,
  ReviewDeletedEvent,
  ReviewRatingCriterionDeletedEvent,
} from "@shopana/events";
import {
  BrokerWorkflows,
  DBOS,
  InjectBroker,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";
import type { RunScriptContext } from "../kernel/types.js";
import {
  ContentExternalReferenceDeleteScript,
  ProductQuestionDeleteScript,
  RatingCriterionDeleteScript,
  ReviewDeleteScript,
  type ContentExternalReferenceDeleteResult,
  type ContentExternalReferenceDeleteWorkflowInput,
  type ProductQuestionDeleteResult,
  type ProductQuestionDeleteWorkflowInput,
  type RatingCriterionDeleteResult,
  type RatingCriterionDeleteWorkflowInput,
  type ReviewDeleteResult,
  type ReviewDeleteWorkflowInput,
  type ReviewsMutationWorkflowContext,
} from "../scripts/index.js";

type ReviewsDeletedEvent =
  | ReviewRatingCriterionDeletedEvent
  | ReviewDeletedEvent
  | ProductQuestionDeletedEvent
  | ReviewContentExternalReferenceDeletedEvent;

abstract class ReviewsDeleteWorkflow extends BrokerWorkflows {
  protected constructor(broker: ServiceBroker) {
    super(broker);
  }

  protected get kernel(): Kernel {
    return Kernel.getInstance();
  }

  protected toScriptContext(context: ReviewsMutationWorkflowContext): RunScriptContext {
    return {
      storeId: context.storeId,
      organizationId: context.organizationId,
      locale: context.locale,
      userId: context.userId,
      requestId: context.requestId,
    };
  }

  protected async emitDeleted<TEvent extends ReviewsDeletedEvent>(
    context: ReviewsMutationWorkflowContext,
    eventType: TEvent["eventType"],
    payload: TEvent["payload"],
    subject: { type: string; id: string }
  ): Promise<void> {
    await this.broker.runWorkflow(
      "events.emit",
      {
        eventType,
        payload,
        source: "reviews",
        context: {
          organizationId: context.organizationId,
          userId: context.userId,
        },
        subject,
        actor: context.userId
          ? { type: "user" as const, id: context.userId }
          : { type: "service" as const, id: "reviews" },
        emitKey: `${subject.type}:${subject.id}:deleted`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: `emit:${eventType}`,
        callId: subject.id,
      }
    );
  }
}

@Injectable()
export class RatingCriterionDeleteWorkflow extends ReviewsDeleteWorkflow {
  constructor(@InjectBroker("reviews") broker: ServiceBroker) { super(broker); }

  @Workflow("ratingCriterionDelete")
  async run(input: RatingCriterionDeleteWorkflowInput): Promise<RatingCriterionDeleteResult> {
    const result = await this.stepDelete(input);
    if (result.deletedCriterionId && result.permanent !== undefined && result.userErrors.length === 0) {
      await this.emitDeleted<ReviewRatingCriterionDeletedEvent>(input.context, "reviewRatingCriterionDeleted", {
        criterionId: result.deletedCriterionId,
        storeId: input.context.storeId,
        permanent: result.permanent,
      }, { type: "reviewRatingCriterion", id: result.deletedCriterionId });
    }
    return result;
  }

  @WorkflowStep()
  private stepDelete(input: RatingCriterionDeleteWorkflowInput) {
    return this.kernel.runScript(RatingCriterionDeleteScript, input.params, this.toScriptContext(input.context));
  }
}

@Injectable()
export class ReviewDeleteWorkflow extends ReviewsDeleteWorkflow {
  constructor(@InjectBroker("reviews") broker: ServiceBroker) { super(broker); }

  @Workflow("reviewDelete")
  async run(input: ReviewDeleteWorkflowInput): Promise<ReviewDeleteResult> {
    const result = await this.stepDelete(input);
    if (result.deletedReviewId && result.productId && result.permanent !== undefined && result.userErrors.length === 0) {
      await this.emitDeleted<ReviewDeletedEvent>(input.context, "reviewDeleted", {
        reviewId: result.deletedReviewId,
        storeId: input.context.storeId,
        productId: result.productId,
        permanent: result.permanent,
      }, { type: "review", id: result.deletedReviewId });
    }
    return result;
  }

  @WorkflowStep()
  private stepDelete(input: ReviewDeleteWorkflowInput) {
    return this.kernel.runScript(ReviewDeleteScript, input.params, this.toScriptContext(input.context));
  }
}

@Injectable()
export class ProductQuestionDeleteWorkflow extends ReviewsDeleteWorkflow {
  constructor(@InjectBroker("reviews") broker: ServiceBroker) { super(broker); }

  @Workflow("productQuestionDelete")
  async run(input: ProductQuestionDeleteWorkflowInput): Promise<ProductQuestionDeleteResult> {
    const result = await this.stepDelete(input);
    if (result.deletedProductQuestionId && result.productId && result.permanent !== undefined && result.userErrors.length === 0) {
      await this.emitDeleted<ProductQuestionDeletedEvent>(input.context, "productQuestionDeleted", {
        productQuestionId: result.deletedProductQuestionId,
        storeId: input.context.storeId,
        productId: result.productId,
        permanent: result.permanent,
      }, { type: "productQuestion", id: result.deletedProductQuestionId });
    }
    return result;
  }

  @WorkflowStep()
  private stepDelete(input: ProductQuestionDeleteWorkflowInput) {
    return this.kernel.runScript(ProductQuestionDeleteScript, input.params, this.toScriptContext(input.context));
  }
}

@Injectable()
export class ContentExternalReferenceDeleteWorkflow extends ReviewsDeleteWorkflow {
  constructor(@InjectBroker("reviews") broker: ServiceBroker) { super(broker); }

  @Workflow("contentExternalReferenceDelete")
  async run(input: ContentExternalReferenceDeleteWorkflowInput): Promise<ContentExternalReferenceDeleteResult> {
    const result = await this.stepDelete(input);
    if (result.deletedExternalReferenceId && result.contentId && result.permanent !== undefined && result.userErrors.length === 0) {
      await this.emitDeleted<ReviewContentExternalReferenceDeletedEvent>(input.context, "reviewContentExternalReferenceDeleted", {
        externalReferenceId: result.deletedExternalReferenceId,
        storeId: input.context.storeId,
        contentId: result.contentId,
        permanent: result.permanent,
      }, { type: "reviewContentExternalReference", id: result.deletedExternalReferenceId });
    }
    return result;
  }

  @WorkflowStep()
  private stepDelete(input: ContentExternalReferenceDeleteWorkflowInput) {
    return this.kernel.runScript(ContentExternalReferenceDeleteScript, input.params, this.toScriptContext(input.context));
  }
}
