import { Injectable } from "@nestjs/common";
import type {
  ProductQuestionCreatedEvent,
  ReviewContentExternalReferenceCreatedEvent,
  ReviewCreatedEvent,
  ReviewModerationCaseCreatedEvent,
  ReviewRatingCriterionCreatedEvent,
  ReviewRequestCreatedEvent,
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
  ContentExternalReferenceCreateScript,
  ModerationCaseCreateScript,
  ProductQuestionCreateScript,
  RatingCriterionCreateScript,
  ReviewCreateScript,
  ReviewRequestCreateScript,
  type ContentExternalReferenceCreateResult,
  type ContentExternalReferenceCreateWorkflowInput,
  type ModerationCaseCreateResult,
  type ModerationCaseCreateWorkflowInput,
  type ProductQuestionCreateResult,
  type ProductQuestionCreateWorkflowInput,
  type RatingCriterionCreateResult,
  type RatingCriterionCreateWorkflowInput,
  type ReviewCreateResult,
  type ReviewCreateWorkflowInput,
  type ReviewRequestCreateResult,
  type ReviewRequestCreateWorkflowInput,
  type ReviewsMutationWorkflowContext,
} from "../scripts/index.js";

type ReviewsCreatedEvent =
  | ReviewRatingCriterionCreatedEvent
  | ReviewCreatedEvent
  | ProductQuestionCreatedEvent
  | ReviewRequestCreatedEvent
  | ReviewModerationCaseCreatedEvent
  | ReviewContentExternalReferenceCreatedEvent;

abstract class ReviewsCreateWorkflow extends BrokerWorkflows {
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

  protected async emitCreated<TEvent extends ReviewsCreatedEvent>(
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
        emitKey: `${subject.type}:${subject.id}`,
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
export class RatingCriterionCreateWorkflow extends ReviewsCreateWorkflow {
  constructor(@InjectBroker("reviews") broker: ServiceBroker) { super(broker); }

  @Workflow("ratingCriterionCreate")
  async run(input: RatingCriterionCreateWorkflowInput): Promise<RatingCriterionCreateResult> {
    const result = await this.stepCreate(input);
    if (result.criterion && result.userErrors.length === 0) {
      await this.emitCreated<ReviewRatingCriterionCreatedEvent>(input.context, "reviewRatingCriterionCreated", {
        criterionId: result.criterion.id,
        storeId: input.context.storeId,
      }, { type: "reviewRatingCriterion", id: result.criterion.id });
    }
    return result;
  }

  @WorkflowStep()
  private stepCreate(input: RatingCriterionCreateWorkflowInput) {
    return this.kernel.runScript(RatingCriterionCreateScript, input.params, this.toScriptContext(input.context));
  }
}

@Injectable()
export class ReviewCreateWorkflow extends ReviewsCreateWorkflow {
  constructor(@InjectBroker("reviews") broker: ServiceBroker) { super(broker); }

  @Workflow("reviewCreate")
  async run(input: ReviewCreateWorkflowInput): Promise<ReviewCreateResult> {
    const result = await this.stepCreate(input);
    if (result.review && result.userErrors.length === 0) {
      await this.emitCreated<ReviewCreatedEvent>(input.context, "reviewCreated", {
        reviewId: result.review.id,
        storeId: input.context.storeId,
        productId: result.review.productId,
      }, { type: "review", id: result.review.id });
    }
    return result;
  }

  @WorkflowStep()
  private stepCreate(input: ReviewCreateWorkflowInput) {
    return this.kernel.runScript(ReviewCreateScript, input.params, this.toScriptContext(input.context));
  }
}

@Injectable()
export class ProductQuestionCreateWorkflow extends ReviewsCreateWorkflow {
  constructor(@InjectBroker("reviews") broker: ServiceBroker) { super(broker); }

  @Workflow("productQuestionCreate")
  async run(input: ProductQuestionCreateWorkflowInput): Promise<ProductQuestionCreateResult> {
    const result = await this.stepCreate(input);
    if (result.productQuestion && result.userErrors.length === 0) {
      await this.emitCreated<ProductQuestionCreatedEvent>(input.context, "productQuestionCreated", {
        productQuestionId: result.productQuestion.id,
        storeId: input.context.storeId,
        productId: result.productQuestion.productId,
      }, { type: "productQuestion", id: result.productQuestion.id });
    }
    return result;
  }

  @WorkflowStep()
  private stepCreate(input: ProductQuestionCreateWorkflowInput) {
    return this.kernel.runScript(ProductQuestionCreateScript, input.params, this.toScriptContext(input.context));
  }
}

@Injectable()
export class ReviewRequestCreateWorkflow extends ReviewsCreateWorkflow {
  constructor(@InjectBroker("reviews") broker: ServiceBroker) { super(broker); }

  @Workflow("reviewRequestCreate")
  async run(input: ReviewRequestCreateWorkflowInput): Promise<ReviewRequestCreateResult> {
    const result = await this.stepCreate(input);
    if (result.reviewRequest && result.userErrors.length === 0) {
      await this.emitCreated<ReviewRequestCreatedEvent>(input.context, "reviewRequestCreated", {
        reviewRequestId: result.reviewRequest.id,
        storeId: input.context.storeId,
        customerId: result.reviewRequest.customerId,
        productId: result.reviewRequest.productId,
      }, { type: "reviewRequest", id: result.reviewRequest.id });
    }
    return result;
  }

  @WorkflowStep()
  private stepCreate(input: ReviewRequestCreateWorkflowInput) {
    return this.kernel.runScript(ReviewRequestCreateScript, input.params, this.toScriptContext(input.context));
  }
}

@Injectable()
export class ModerationCaseCreateWorkflow extends ReviewsCreateWorkflow {
  constructor(@InjectBroker("reviews") broker: ServiceBroker) { super(broker); }

  @Workflow("moderationCaseCreate")
  async run(input: ModerationCaseCreateWorkflowInput): Promise<ModerationCaseCreateResult> {
    const result = await this.stepCreate(input);
    if (result.moderationCase && result.userErrors.length === 0) {
      await this.emitCreated<ReviewModerationCaseCreatedEvent>(input.context, "reviewModerationCaseCreated", {
        moderationCaseId: result.moderationCase.id,
        storeId: input.context.storeId,
        contentId: result.moderationCase.contentId,
      }, { type: "reviewModerationCase", id: result.moderationCase.id });
    }
    return result;
  }

  @WorkflowStep()
  private stepCreate(input: ModerationCaseCreateWorkflowInput) {
    return this.kernel.runScript(ModerationCaseCreateScript, input.params, this.toScriptContext(input.context));
  }
}

@Injectable()
export class ContentExternalReferenceCreateWorkflow extends ReviewsCreateWorkflow {
  constructor(@InjectBroker("reviews") broker: ServiceBroker) { super(broker); }

  @Workflow("contentExternalReferenceCreate")
  async run(input: ContentExternalReferenceCreateWorkflowInput): Promise<ContentExternalReferenceCreateResult> {
    const result = await this.stepCreate(input);
    if (result.externalReference && result.userErrors.length === 0) {
      await this.emitCreated<ReviewContentExternalReferenceCreatedEvent>(input.context, "reviewContentExternalReferenceCreated", {
        externalReferenceId: result.externalReference.id,
        storeId: input.context.storeId,
        contentId: result.externalReference.contentId,
      }, { type: "reviewContentExternalReference", id: result.externalReference.id });
    }
    return result;
  }

  @WorkflowStep()
  private stepCreate(input: ContentExternalReferenceCreateWorkflowInput) {
    return this.kernel.runScript(ContentExternalReferenceCreateScript, input.params, this.toScriptContext(input.context));
  }
}
