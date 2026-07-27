import {
  decodeGlobalIdByType,
  encodeGlobalIdByType,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import { ApolloMutation, ZodResolver } from "@shopana/type-resolver";
import type {
  ContentExternalReferenceCreateWorkflowInput,
  ContentExternalReferenceCreateWorkflowResult,
  ContentExternalReferenceDeleteWorkflowInput,
  ContentExternalReferenceDeleteWorkflowResult,
  ContentExternalReferenceUpdateWorkflowInput,
  ContentExternalReferenceUpdateWorkflowResult,
  ContentRedactWorkflowInput,
  ContentRedactWorkflowResult,
  ContentReportUpdateWorkflowInput,
  ContentReportUpdateWorkflowResult,
  ContentRevisionRestoreWorkflowInput,
  ContentRevisionRestoreWorkflowResult,
  ModerationCaseCreateWorkflowInput,
  ModerationCaseCreateWorkflowResult,
  ModerationCaseUpdateWorkflowInput,
  ModerationCaseUpdateWorkflowResult,
  ProductQuestionCreateWorkflowInput,
  ProductQuestionCreateWorkflowResult,
  ProductQuestionDeleteWorkflowInput,
  ProductQuestionDeleteWorkflowResult,
  ProductQuestionUpdateOperation,
  ProductQuestionUpdateWorkflowInput,
  ProductQuestionUpdateWorkflowResult,
  QuestionSubscriptionUpdateWorkflowInput,
  QuestionSubscriptionUpdateWorkflowResult,
  RatingCriterionCreateWorkflowInput,
  RatingCriterionCreateWorkflowResult,
  RatingCriterionDeleteWorkflowInput,
  RatingCriterionDeleteWorkflowResult,
  RatingCriterionUpdateWorkflowInput,
  RatingCriterionUpdateWorkflowResult,
  ReviewCreateWorkflowInput,
  ReviewCreateWorkflowResult,
  ReviewDeleteWorkflowInput,
  ReviewDeleteWorkflowResult,
  ReviewUpdateOperation,
  ReviewUpdateWorkflowInput,
  ReviewUpdateWorkflowResult,
  ReviewRequestCreateWorkflowInput,
  ReviewRequestCreateWorkflowResult,
  ReviewRequestUpdateWorkflowInput,
  ReviewRequestUpdateWorkflowResult,
  ReviewsMutationWorkflowContext,
  ReviewsUpdateOperationResult,
  ReviewsUpdateOperationType,
  StoreConfigurationUpdateWorkflowInput,
  StoreConfigurationUpdateWorkflowResult,
} from "../../workflows/dto/index.js";
import {
  RatingCriterionResolver,
  StoreConfigurationResolver,
} from "./ConfigurationResolver.js";
import { ContentReportResolver } from "./EngagementResolver.js";
import { ContentExternalReferenceResolver } from "./ExternalReferenceResolver.js";
import { ModerationCaseResolver } from "./ModerationResolver.js";
import {
  ProductQuestionResolver,
  QuestionSubscriptionResolver,
} from "./QuestionResolver.js";
import { ReviewRequestResolver } from "./ReviewRequestResolver.js";
import { ReviewResolver } from "./ReviewResolver.js";
import { ReviewsType } from "./ReviewsType.js";
import {
  ProductQuestionCreateInputSchema,
  ReviewContentDeleteInputSchema,
  ReviewContentExternalReferenceCreateInputSchema,
  ReviewContentExternalReferenceDeleteInputSchema,
  ReviewCreateInputSchema,
  ReviewModerationCaseCreateInputSchema,
  ReviewRatingCriterionCreateInputSchema,
  ReviewRatingCriterionDeleteInputSchema,
  ReviewRequestCreateInputSchema,
} from "./generated/schemas.js";
import type {
  ProductQuestionCreateInput,
  ReviewContentCreateInput,
  ReviewContentDeleteInput,
  ReviewContentExternalReferenceCreateInput,
  ReviewContentExternalReferenceDeleteInput,
  ReviewCreateInput,
  ReviewModerationCaseCreateInput,
  ReviewRatingCriterionCreateInput,
  ReviewRatingCriterionDeleteInput,
  ReviewRequestCreateInput,
  ReviewsMutationContentExternalReferenceCreateArgs,
  ReviewsMutationContentExternalReferenceDeleteArgs,
  ReviewsMutationContentExternalReferenceUpdateArgs,
  ReviewsMutationContentRedactArgs,
  ReviewsMutationContentReportUpdateArgs,
  ReviewsMutationContentRevisionRestoreArgs,
  ReviewsMutationModerationCaseCreateArgs,
  ReviewsMutationModerationCaseUpdateArgs,
  ReviewsMutationProductQuestionCreateArgs,
  ReviewsMutationProductQuestionDeleteArgs,
  ReviewsMutationProductQuestionSubscriptionUpdateArgs,
  ReviewsMutationProductQuestionUpdateArgs,
  ReviewsMutationRatingCriterionCreateArgs,
  ReviewsMutationRatingCriterionDeleteArgs,
  ReviewsMutationRatingCriterionUpdateArgs,
  ReviewsMutationReviewCreateArgs,
  ReviewsMutationReviewDeleteArgs,
  ReviewsMutationReviewRequestCreateArgs,
  ReviewsMutationReviewRequestUpdateArgs,
  ReviewsMutationReviewUpdateArgs,
  ReviewsMutationStoreConfigurationUpdateArgs,
} from "./generated/types.js";
import {
  mapProductQuestionUpdateInput,
  type ProductQuestionUpdateMappedEntry,
} from "./productQuestionUpdateMapper.js";
import {
  mapRatingCriterionUpdateInput,
  type RatingCriterionUpdateMappedEntry,
} from "./ratingCriterionUpdateMapper.js";
import {
  mapReviewUpdateInput,
  type ReviewUpdateMappedEntry,
} from "./reviewUpdateMapper.js";

@ApolloMutation
export class MutationResolver extends ReviewsType<Record<string, never>> {
  reviewsMutation() {
    return this.resolvers.reviewsMutation();
  }
}

export class ReviewsMutationResolver extends ReviewsType<Record<string, never>> {
  async storeConfigurationUpdate(args: ReviewsMutationStoreConfigurationUpdateArgs) {
    const configurationId = safeDecodeId(
      args.configurationId,
      GlobalIdEntity.ReviewStoreConfiguration
    );
    if (!configurationId) {
      return invalidSingleUpdate("configuration", "storeConfigurationUpdate", "configurationId");
    }
    const result = await this.runMutationWorkflow<StoreConfigurationUpdateWorkflowResult>(
      "storeConfigurationUpdate",
      {
        params: {
          configurationId,
          expectedRevision: args.expectedRevision,
          operations: args.operations,
        },
        context: this.mutationWorkflowContext(),
      } satisfies StoreConfigurationUpdateWorkflowInput,
      configurationId
    );
    return {
      configuration: result.configuration
        ? new StoreConfigurationResolver(result.configuration, this.$ctx)
        : null,
      operationResults: mapOperationResults(result.operationResults),
      userErrors: result.userErrors,
    };
  }

  @ZodResolver(ReviewRatingCriterionCreateInputSchema())
  async ratingCriterionCreate(args: ReviewsMutationRatingCriterionCreateArgs) {
    const decoded = decodeRatingCriterionInput(args.input);
    if (!decoded.value) return { criterion: null, userErrors: decoded.errors };
    const result = await this.runMutationWorkflow<RatingCriterionCreateWorkflowResult>(
      "ratingCriterionCreate",
      { params: decoded.value, context: this.mutationWorkflowContext() } satisfies RatingCriterionCreateWorkflowInput
    );
    return {
      criterion: result.criterion ? new RatingCriterionResolver(result.criterion.id, this.$ctx) : null,
      userErrors: result.userErrors,
    };
  }

  async ratingCriterionUpdate(args: ReviewsMutationRatingCriterionUpdateArgs) {
    const mapped = mapRatingCriterionUpdateInput(args.operations);
    const criterionId = safeDecodeId(
      args.criterionId,
      GlobalIdEntity.ReviewRatingCriterion
    );
    if (!criterionId) {
      const error = invalidIdError("criterionId");
      return {
        criterion: null,
        operationResults: mapped.entries.map(mapRatingCriterionPreflightResult),
        userErrors: [error, ...mapped.errors],
      };
    }
    if (mapped.errors.length > 0) {
      return {
        criterion: null,
        operationResults: mapped.entries.map(mapRatingCriterionPreflightResult),
        userErrors: mapped.errors,
      };
    }
    const result = await this.runMutationWorkflow<RatingCriterionUpdateWorkflowResult>(
      "ratingCriterionUpdate",
      {
        criterionId,
        expectedUpdatedAt: args.expectedUpdatedAt,
        operations: mapped.operations,
        context: this.mutationWorkflowContext(),
      } satisfies RatingCriterionUpdateWorkflowInput,
      criterionId
    );
    this.$ctx.loaders.ratingCriterion.clear(criterionId);
    this.$ctx.loaders.ratingCriterionTranslations.clear(criterionId);
    this.$ctx.loaders.ratingCriterionAssignments.clear(criterionId);
    return {
      criterion: result.criterion
        ? new RatingCriterionResolver(result.criterion.id, this.$ctx)
        : null,
      operationResults: mapOperationResults(result.operationResults),
      userErrors: result.userErrors,
    };
  }
  @ZodResolver(ReviewRatingCriterionDeleteInputSchema())
  async ratingCriterionDelete(args: ReviewsMutationRatingCriterionDeleteArgs) {
    const decoded = decodeDeleteInput(args.input, GlobalIdEntity.ReviewRatingCriterion);
    if (!decoded.value) return { deletedCriterionId: null, userErrors: decoded.errors };
    const result = await this.runMutationWorkflow<RatingCriterionDeleteWorkflowResult>(
      "ratingCriterionDelete",
      { params: decoded.value, context: this.mutationWorkflowContext() } satisfies RatingCriterionDeleteWorkflowInput
    );
    if (result.deletedCriterionId) this.$ctx.loaders.ratingCriterion.clear(result.deletedCriterionId);
    return {
      deletedCriterionId: result.deletedCriterionId
        ? this.encodeId(result.deletedCriterionId, GlobalIdEntity.ReviewRatingCriterion)
        : null,
      userErrors: result.userErrors,
    };
  }

  @ZodResolver(ReviewCreateInputSchema())
  async reviewCreate(args: ReviewsMutationReviewCreateArgs) {
    const decoded = decodeReviewInput(args.input);
    if (!decoded.value) return { review: null, userErrors: decoded.errors };
    const result = await this.runMutationWorkflow<ReviewCreateWorkflowResult>(
      "reviewCreate",
      { params: decoded.value, context: this.mutationWorkflowContext() } satisfies ReviewCreateWorkflowInput
    );
    return {
      review: result.review ? new ReviewResolver(result.review.id, this.$ctx) : null,
      userErrors: result.userErrors,
    };
  }

  async reviewUpdate(args: ReviewsMutationReviewUpdateArgs) {
    const mapped = mapReviewUpdateInput(args.operations);
    const reviewId = safeDecodeId(args.reviewId, GlobalIdEntity.Review);
    if (!reviewId) {
      const error = {
        message: "Invalid ID format",
        field: ["reviewId"],
        code: "INVALID_ID",
      };
      return {
        review: null,
        operationResults: mapped.entries.map(mapPreflightOperationResult),
        userErrors: [error, ...mapped.errors],
      };
    }

    if (mapped.errors.length > 0) {
      return {
        review: null,
        operationResults: mapped.entries.map(mapPreflightOperationResult),
        userErrors: mapped.errors,
      };
    }

    const workflowInput: ReviewUpdateWorkflowInput = {
      reviewId,
      expectedRevision: args.expectedRevision,
      operations: mapped.operations,
      context: this.mutationWorkflowContext(),
    };
    const result = await this.runMutationWorkflow<ReviewUpdateWorkflowResult>(
      "reviewUpdate",
      workflowInput,
      reviewId
    );

    this.clearReviewUpdateLoaders(reviewId, result);
    return {
      review: result.review ? new ReviewResolver(result.review.id, this.$ctx) : null,
      operationResults: result.operationResults.map((operation) => ({
        type: toGraphqlReviewOperationType(operation.type),
        applied: operation.applied,
        clientMutationId: operation.clientMutationId,
        entityId: operation.entityId
          ? this.encodeId(operation.entityId, GlobalIdEntity.ReviewReply)
          : undefined,
        errors: operation.errors,
      })),
      userErrors: result.userErrors,
    };
  }
  @ZodResolver(ReviewContentDeleteInputSchema())
  async reviewDelete(args: ReviewsMutationReviewDeleteArgs) {
    const decoded = decodeDeleteInput(args.input, GlobalIdEntity.Review);
    if (!decoded.value) return { deletedReviewId: null, userErrors: decoded.errors };
    const result = await this.runMutationWorkflow<ReviewDeleteWorkflowResult>(
      "reviewDelete",
      { params: decoded.value, context: this.mutationWorkflowContext() } satisfies ReviewDeleteWorkflowInput
    );
    if (result.deletedReviewId) {
      this.$ctx.loaders.review.clear(result.deletedReviewId);
      this.$ctx.loaders.content.clear(result.deletedReviewId);
    }
    return {
      deletedReviewId: result.deletedReviewId
        ? this.encodeId(result.deletedReviewId, GlobalIdEntity.Review)
        : null,
      userErrors: result.userErrors,
    };
  }

  @ZodResolver(ProductQuestionCreateInputSchema())
  async productQuestionCreate(args: ReviewsMutationProductQuestionCreateArgs) {
    const decoded = decodeProductQuestionInput(args.input);
    if (!decoded.value) return { productQuestion: null, userErrors: decoded.errors };
    const result = await this.runMutationWorkflow<ProductQuestionCreateWorkflowResult>(
      "productQuestionCreate",
      { params: decoded.value, context: this.mutationWorkflowContext() } satisfies ProductQuestionCreateWorkflowInput
    );
    return {
      productQuestion: result.productQuestion ? new ProductQuestionResolver(result.productQuestion.id, this.$ctx) : null,
      userErrors: result.userErrors,
    };
  }

  async productQuestionUpdate(args: ReviewsMutationProductQuestionUpdateArgs) {
    const mapped = mapProductQuestionUpdateInput(args.operations);
    const productQuestionId = safeDecodeId(
      args.productQuestionId,
      GlobalIdEntity.ProductQuestion
    );
    if (!productQuestionId) {
      const error = {
        message: "Invalid ID format",
        field: ["productQuestionId"],
        code: "INVALID_ID",
      };
      return {
        productQuestion: null,
        operationResults: mapped.entries.map(
          mapProductQuestionPreflightOperationResult
        ),
        userErrors: [error, ...mapped.errors],
      };
    }

    if (mapped.errors.length > 0) {
      return {
        productQuestion: null,
        operationResults: mapped.entries.map(
          mapProductQuestionPreflightOperationResult
        ),
        userErrors: mapped.errors,
      };
    }

    const workflowInput: ProductQuestionUpdateWorkflowInput = {
      productQuestionId,
      expectedRevision: args.expectedRevision,
      operations: mapped.operations,
      context: this.mutationWorkflowContext(),
    };
    const result =
      await this.runMutationWorkflow<ProductQuestionUpdateWorkflowResult>(
        "productQuestionUpdate",
        workflowInput,
        productQuestionId
      );

    this.clearProductQuestionUpdateLoaders(productQuestionId, result);
    return {
      productQuestion: result.productQuestion
        ? new ProductQuestionResolver(result.productQuestion.id, this.$ctx)
        : null,
      operationResults: result.operationResults.map((operation) => ({
        type: toGraphqlProductQuestionOperationType(operation.type),
        applied: operation.applied,
        clientMutationId: operation.clientMutationId,
        entityId: operation.entityId
          ? this.encodeId(
              operation.entityId,
              GlobalIdEntity.ProductQuestionAnswer
            )
          : undefined,
        errors: operation.errors,
      })),
      userErrors: result.userErrors,
    };
  }
  @ZodResolver(ReviewContentDeleteInputSchema())
  async productQuestionDelete(args: ReviewsMutationProductQuestionDeleteArgs) {
    const decoded = decodeDeleteInput(args.input, GlobalIdEntity.ProductQuestion);
    if (!decoded.value) return { deletedProductQuestionId: null, userErrors: decoded.errors };
    const result = await this.runMutationWorkflow<ProductQuestionDeleteWorkflowResult>(
      "productQuestionDelete",
      { params: decoded.value, context: this.mutationWorkflowContext() } satisfies ProductQuestionDeleteWorkflowInput
    );
    if (result.deletedProductQuestionId) {
      this.$ctx.loaders.productQuestion.clear(result.deletedProductQuestionId);
      this.$ctx.loaders.content.clear(result.deletedProductQuestionId);
    }
    return {
      deletedProductQuestionId: result.deletedProductQuestionId
        ? this.encodeId(result.deletedProductQuestionId, GlobalIdEntity.ProductQuestion)
        : null,
      userErrors: result.userErrors,
    };
  }
  async productQuestionSubscriptionUpdate(
    args: ReviewsMutationProductQuestionSubscriptionUpdateArgs
  ) {
    const subscriptionId = safeDecodeId(
      args.subscriptionId,
      GlobalIdEntity.ProductQuestionSubscription
    );
    if (!subscriptionId) {
      return invalidSingleUpdate(
        "subscription",
        "productQuestionSubscriptionUpdate",
        "subscriptionId"
      );
    }
    const result = await this.runMutationWorkflow<QuestionSubscriptionUpdateWorkflowResult>(
      "productQuestionSubscriptionUpdate",
      {
        params: {
          subscriptionId,
          expectedUpdatedAt: args.expectedUpdatedAt,
          operations: args.operations,
        },
        context: this.mutationWorkflowContext(),
      } satisfies QuestionSubscriptionUpdateWorkflowInput,
      subscriptionId
    );
    this.$ctx.loaders.questionSubscription.clear(subscriptionId);
    return {
      subscription: result.subscription
        ? new QuestionSubscriptionResolver(result.subscription.id, this.$ctx)
        : null,
      operationResults: mapOperationResults(result.operationResults),
      userErrors: result.userErrors,
    };
  }

  async contentRedact(args: ReviewsMutationContentRedactArgs) {
    const contentId = safeDecodeId(args.contentId, undefined);
    if (!contentId) {
      return invalidSingleUpdate("content", "contentRedact", "contentId");
    }
    const result = await this.runMutationWorkflow<ContentRedactWorkflowResult>(
      "contentRedact",
      {
        params: { contentId, expectedRevision: args.expectedRevision },
        context: this.mutationWorkflowContext(),
      } satisfies ContentRedactWorkflowInput,
      contentId
    );
    this.clearContentLoaders(contentId);
    return {
      content: result.content ? await this.resolvers.content(result.content.id) : null,
      operationResults: mapOperationResults(result.operationResults),
      userErrors: result.userErrors,
    };
  }

  async contentRevisionRestore(args: ReviewsMutationContentRevisionRestoreArgs) {
    const contentId = safeDecodeId(args.contentId, undefined);
    if (!contentId) {
      return invalidSingleUpdate(
        "content",
        "contentRevisionRestore",
        "contentId"
      );
    }
    const result = await this.runMutationWorkflow<ContentRevisionRestoreWorkflowResult>(
      "contentRevisionRestore",
      {
        params: {
          contentId,
          revision: args.revision,
          expectedRevision: args.expectedRevision,
        },
        context: this.mutationWorkflowContext(),
      } satisfies ContentRevisionRestoreWorkflowInput,
      contentId
    );
    this.clearContentLoaders(contentId);
    return {
      content: result.content ? await this.resolvers.content(result.content.id) : null,
      operationResults: mapOperationResults(result.operationResults),
      userErrors: result.userErrors,
    };
  }

  @ZodResolver(ReviewRequestCreateInputSchema())
  async reviewRequestCreate(args: ReviewsMutationReviewRequestCreateArgs) {
    const decoded = decodeReviewRequestInput(args.input);
    if (!decoded.value) return { reviewRequest: null, userErrors: decoded.errors };
    const result = await this.runMutationWorkflow<ReviewRequestCreateWorkflowResult>(
      "reviewRequestCreate",
      { params: decoded.value, context: this.mutationWorkflowContext() } satisfies ReviewRequestCreateWorkflowInput
    );
    return {
      reviewRequest: result.reviewRequest ? new ReviewRequestResolver(result.reviewRequest.id, this.$ctx) : null,
      userErrors: result.userErrors,
    };
  }

  async reviewRequestUpdate(args: ReviewsMutationReviewRequestUpdateArgs) {
    const reviewRequestId = safeDecodeId(
      args.reviewRequestId,
      GlobalIdEntity.ReviewRequest
    );
    if (!reviewRequestId) {
      return invalidSingleUpdate(
        "reviewRequest",
        "reviewRequestUpdate",
        "reviewRequestId"
      );
    }
    const result = await this.runMutationWorkflow<ReviewRequestUpdateWorkflowResult>(
      "reviewRequestUpdate",
      {
        params: {
          reviewRequestId,
          expectedUpdatedAt: args.expectedUpdatedAt,
          operations: args.operations,
        },
        context: this.mutationWorkflowContext(),
      } satisfies ReviewRequestUpdateWorkflowInput,
      reviewRequestId
    );
    this.$ctx.loaders.reviewRequest.clear(reviewRequestId);
    return {
      reviewRequest: result.reviewRequest
        ? new ReviewRequestResolver(result.reviewRequest.id, this.$ctx)
        : null,
      operationResults: mapOperationResults(result.operationResults),
      userErrors: result.userErrors,
    };
  }

  async contentReportUpdate(args: ReviewsMutationContentReportUpdateArgs) {
    const contentReportId = safeDecodeId(
      args.contentReportId,
      GlobalIdEntity.ReviewContentReport
    );
    if (!contentReportId) {
      return invalidSingleUpdate(
        "contentReport",
        "contentReportUpdate",
        "contentReportId"
      );
    }
    const result = await this.runMutationWorkflow<ContentReportUpdateWorkflowResult>(
      "contentReportUpdate",
      {
        params: {
          contentReportId,
          expectedUpdatedAt: args.expectedUpdatedAt,
          operations: args.operations,
        },
        context: this.mutationWorkflowContext(),
      } satisfies ContentReportUpdateWorkflowInput,
      contentReportId
    );
    this.$ctx.loaders.contentReport.clear(contentReportId);
    if (result.contentReport) {
      this.$ctx.loaders.contentMetrics.clear(result.contentReport.contentId);
    }
    return {
      contentReport: result.contentReport
        ? new ContentReportResolver(result.contentReport.id, this.$ctx)
        : null,
      operationResults: mapOperationResults(result.operationResults),
      userErrors: result.userErrors,
    };
  }

  @ZodResolver(ReviewModerationCaseCreateInputSchema())
  async moderationCaseCreate(args: ReviewsMutationModerationCaseCreateArgs) {
    const decoded = decodeModerationCaseInput(args.input);
    if (!decoded.value) return { moderationCase: null, userErrors: decoded.errors };
    const result = await this.runMutationWorkflow<ModerationCaseCreateWorkflowResult>(
      "moderationCaseCreate",
      { params: decoded.value, context: this.mutationWorkflowContext() } satisfies ModerationCaseCreateWorkflowInput
    );
    return {
      moderationCase: result.moderationCase ? new ModerationCaseResolver(result.moderationCase.id, this.$ctx) : null,
      userErrors: result.userErrors,
    };
  }

  async moderationCaseUpdate(args: ReviewsMutationModerationCaseUpdateArgs) {
    const moderationCaseId = safeDecodeId(
      args.moderationCaseId,
      GlobalIdEntity.ReviewModerationCase
    );
    if (!moderationCaseId) {
      return invalidSingleUpdate(
        "moderationCase",
        "moderationCaseUpdate",
        "moderationCaseId"
      );
    }
    const result = await this.runMutationWorkflow<ModerationCaseUpdateWorkflowResult>(
      "moderationCaseUpdate",
      {
        params: {
          moderationCaseId,
          expectedUpdatedAt: args.expectedUpdatedAt,
          operations: args.operations,
        },
        context: this.mutationWorkflowContext(),
      } satisfies ModerationCaseUpdateWorkflowInput,
      moderationCaseId
    );
    this.$ctx.loaders.moderationCase.clear(moderationCaseId);
    return {
      moderationCase: result.moderationCase
        ? new ModerationCaseResolver(result.moderationCase.id, this.$ctx)
        : null,
      operationResults: mapOperationResults(result.operationResults),
      userErrors: result.userErrors,
    };
  }

  @ZodResolver(ReviewContentExternalReferenceCreateInputSchema())
  async contentExternalReferenceCreate(args: ReviewsMutationContentExternalReferenceCreateArgs) {
    const decoded = decodeExternalReferenceInput(args.input);
    if (!decoded.value) return { externalReference: null, userErrors: decoded.errors };
    const result = await this.runMutationWorkflow<ContentExternalReferenceCreateWorkflowResult>(
      "contentExternalReferenceCreate",
      { params: decoded.value, context: this.mutationWorkflowContext() } satisfies ContentExternalReferenceCreateWorkflowInput
    );
    return {
      externalReference: result.externalReference ? new ContentExternalReferenceResolver(result.externalReference.id, this.$ctx) : null,
      userErrors: result.userErrors,
    };
  }

  async contentExternalReferenceUpdate(
    args: ReviewsMutationContentExternalReferenceUpdateArgs
  ) {
    const externalReferenceId = safeDecodeId(
      args.externalReferenceId,
      GlobalIdEntity.ReviewContentExternalReference
    );
    if (!externalReferenceId) {
      return invalidSingleUpdate(
        "externalReference",
        "contentExternalReferenceUpdate",
        "externalReferenceId"
      );
    }
    const result = await this.runMutationWorkflow<ContentExternalReferenceUpdateWorkflowResult>(
      "contentExternalReferenceUpdate",
      {
        params: {
          externalReferenceId,
          expectedUpdatedAt: args.expectedUpdatedAt,
          operations: args.operations,
        },
        context: this.mutationWorkflowContext(),
      } satisfies ContentExternalReferenceUpdateWorkflowInput,
      externalReferenceId
    );
    this.$ctx.loaders.contentExternalReference.clear(externalReferenceId);
    return {
      externalReference: result.externalReference
        ? new ContentExternalReferenceResolver(
            result.externalReference.id,
            this.$ctx
          )
        : null,
      operationResults: mapOperationResults(result.operationResults),
      userErrors: result.userErrors,
    };
  }
  @ZodResolver(ReviewContentExternalReferenceDeleteInputSchema())
  async contentExternalReferenceDelete(args: ReviewsMutationContentExternalReferenceDeleteArgs) {
    const decoded = decodeExternalReferenceDeleteInput(args.input);
    if (!decoded.value) return { deletedExternalReferenceId: null, userErrors: decoded.errors };
    const result = await this.runMutationWorkflow<ContentExternalReferenceDeleteWorkflowResult>(
      "contentExternalReferenceDelete",
      { params: decoded.value, context: this.mutationWorkflowContext() } satisfies ContentExternalReferenceDeleteWorkflowInput
    );
    if (result.deletedExternalReferenceId) {
      this.$ctx.loaders.contentExternalReference.clear(result.deletedExternalReferenceId);
    }
    return {
      deletedExternalReferenceId: result.deletedExternalReferenceId
        ? this.encodeId(result.deletedExternalReferenceId, GlobalIdEntity.ReviewContentExternalReference)
        : null,
      userErrors: result.userErrors,
    };
  }

  private mutationWorkflowContext(): ReviewsMutationWorkflowContext {
    return {
      organizationId: this.$ctx.store.organizationId,
      storeId: this.$ctx.store.id,
      userId: this.$ctx.hasUser ? this.$ctx.user.id : undefined,
      locale: this.$ctx.locale ?? this.$ctx.store.defaultLocale,
      requestId: this.$ctx.requestId,
    };
  }

  private async runMutationWorkflow<TResult>(
    operation: string,
    input: unknown,
    resourceId?: string
  ): Promise<TResult> {
    return (await this.$ctx.kernel.getServices().broker.runWorkflow(
      `reviews.${operation}`,
      input,
      {
        source: "workflow",
        workflowId: `${operation}:${resourceId ?? this.$ctx.store.id}:${this.$ctx.requestId}`,
        stepId: "start",
      },
      { adminContext: this.$ctx.adminContext },
    )) as TResult;
  }

  private clearReviewUpdateLoaders(
    reviewId: string,
    result: ReviewUpdateWorkflowResult
  ) {
    this.$ctx.loaders.review.clear(reviewId);
    this.$ctx.loaders.content.clear(reviewId);
    this.$ctx.loaders.contentMetrics.clear(reviewId);
    this.$ctx.loaders.contentTranslations.clear(reviewId);
    this.$ctx.loaders.contentPublications.clear(reviewId);
    this.$ctx.loaders.reviewRatings.clear(reviewId);
    this.$ctx.loaders.reviewMedia.clear(reviewId);

    for (const operation of result.operationResults) {
      if (!operation.entityId) continue;
      this.$ctx.loaders.reviewReply.clear(operation.entityId);
      this.$ctx.loaders.content.clear(operation.entityId);
      this.$ctx.loaders.contentMetrics.clear(operation.entityId);
      this.$ctx.loaders.contentTranslations.clear(operation.entityId);
      this.$ctx.loaders.contentPublications.clear(operation.entityId);
    }
  }

  private clearProductQuestionUpdateLoaders(
    productQuestionId: string,
    result: ProductQuestionUpdateWorkflowResult
  ) {
    this.$ctx.loaders.productQuestion.clear(productQuestionId);
    this.$ctx.loaders.content.clear(productQuestionId);
    this.$ctx.loaders.contentMetrics.clear(productQuestionId);
    this.$ctx.loaders.contentTranslations.clear(productQuestionId);
    this.$ctx.loaders.contentPublications.clear(productQuestionId);

    for (const operation of result.operationResults) {
      if (!operation.entityId) continue;
      this.$ctx.loaders.productQuestionAnswer.clear(operation.entityId);
      this.$ctx.loaders.content.clear(operation.entityId);
      this.$ctx.loaders.contentMetrics.clear(operation.entityId);
      this.$ctx.loaders.contentTranslations.clear(operation.entityId);
      this.$ctx.loaders.contentPublications.clear(operation.entityId);
    }
  }

  private clearContentLoaders(contentId: string) {
    this.$ctx.loaders.content.clear(contentId);
    this.$ctx.loaders.contentMetrics.clear(contentId);
    this.$ctx.loaders.contentTranslations.clear(contentId);
    this.$ctx.loaders.contentPublications.clear(contentId);
    this.$ctx.loaders.review.clear(contentId);
    this.$ctx.loaders.reviewReply.clear(contentId);
    this.$ctx.loaders.productQuestion.clear(contentId);
    this.$ctx.loaders.productQuestionAnswer.clear(contentId);
  }
}

interface DecodeResult<T> {
  value?: T;
  errors: Array<{ message: string; field: string[]; code: string }>;
}

function decodeRatingCriterionInput(input: ReviewRatingCriterionCreateInput): DecodeResult<ReviewRatingCriterionCreateInput> {
  const errors: DecodeResult<never>["errors"] = [];
  const assignments = (input.assignments ?? []).map((item, index) => ({
    ...item,
    targetId: decodeId(item.targetId, item.targetType === "PRODUCT" ? GlobalIdEntity.Product : GlobalIdEntity.Category, ["input", "assignments", String(index), "targetId"], errors),
  }));
  return errors.length ? { errors } : { value: { ...input, assignments }, errors };
}

function decodeReviewInput(input: ReviewCreateInput): DecodeResult<ReviewCreateInput> {
  const errors: DecodeResult<never>["errors"] = [];
  const value: ReviewCreateInput = {
    ...input,
    content: decodeContentInput(input.content, errors),
    productId: decodeId(input.productId, GlobalIdEntity.Product, ["input", "productId"], errors),
    variantId: decodeOptionalId(input.variantId, GlobalIdEntity.Variant, ["input", "variantId"], errors),
    orderId: decodeOptionalId(input.orderId, GlobalIdEntity.Order, ["input", "orderId"], errors),
    orderLineId: decodeOptionalId(input.orderLineId, GlobalIdEntity.OrderLine, ["input", "orderLineId"], errors),
    ratings: input.ratings?.map((item, index) => ({
      ...item,
      criterionId: decodeId(item.criterionId, GlobalIdEntity.ReviewRatingCriterion, ["input", "ratings", String(index), "criterionId"], errors),
    })),
    media: input.media?.map((item, index) => ({
      ...item,
      fileId: decodeId(item.fileId, GlobalIdEntity.File, ["input", "media", String(index), "fileId"], errors),
    })),
  };
  return errors.length ? { errors } : { value, errors };
}

function decodeProductQuestionInput(input: ProductQuestionCreateInput): DecodeResult<ProductQuestionCreateInput> {
  const errors: DecodeResult<never>["errors"] = [];
  const value = {
    ...input,
    content: decodeContentInput(input.content, errors),
    productId: decodeId(input.productId, GlobalIdEntity.Product, ["input", "productId"], errors),
    variantId: decodeOptionalId(input.variantId, GlobalIdEntity.Variant, ["input", "variantId"], errors),
  };
  return errors.length ? { errors } : { value, errors };
}

function decodeReviewRequestInput(input: ReviewRequestCreateInput): DecodeResult<ReviewRequestCreateInput> {
  const errors: DecodeResult<never>["errors"] = [];
  const value = {
    ...input,
    customerId: decodeId(input.customerId, GlobalIdEntity.Customer, ["input", "customerId"], errors),
    orderId: decodeId(input.orderId, GlobalIdEntity.Order, ["input", "orderId"], errors),
    orderLineId: decodeId(input.orderLineId, GlobalIdEntity.OrderLine, ["input", "orderLineId"], errors),
    productId: decodeId(input.productId, GlobalIdEntity.Product, ["input", "productId"], errors),
    variantId: decodeOptionalId(input.variantId, GlobalIdEntity.Variant, ["input", "variantId"], errors),
  };
  return errors.length ? { errors } : { value, errors };
}

function decodeModerationCaseInput(input: ReviewModerationCaseCreateInput): DecodeResult<ReviewModerationCaseCreateInput> {
  const errors: DecodeResult<never>["errors"] = [];
  const value = { ...input, contentId: decodeId(input.contentId, undefined, ["input", "contentId"], errors) };
  return errors.length ? { errors } : { value, errors };
}

function decodeExternalReferenceInput(input: ReviewContentExternalReferenceCreateInput): DecodeResult<ReviewContentExternalReferenceCreateInput> {
  const errors: DecodeResult<never>["errors"] = [];
  const value = { ...input, contentId: decodeId(input.contentId, undefined, ["input", "contentId"], errors) };
  return errors.length ? { errors } : { value, errors };
}

function decodeDeleteInput<
  TInput extends ReviewContentDeleteInput | ReviewRatingCriterionDeleteInput
>(
  input: TInput,
  type: GlobalIdType
): DecodeResult<TInput> {
  const errors: DecodeResult<never>["errors"] = [];
  const value = {
    ...input,
    id: decodeId(input.id, type, ["input", "id"], errors),
  };
  return errors.length ? { errors } : { value: value as TInput, errors };
}

function decodeExternalReferenceDeleteInput(
  input: ReviewContentExternalReferenceDeleteInput
): DecodeResult<ReviewContentExternalReferenceDeleteInput> {
  const errors: DecodeResult<never>["errors"] = [];
  const value = {
    ...input,
    id: decodeId(
      input.id,
      GlobalIdEntity.ReviewContentExternalReference,
      ["input", "id"],
      errors
    ),
  };
  return errors.length ? { errors } : { value, errors };
}

function decodeContentInput(input: ReviewContentCreateInput, errors: DecodeResult<never>["errors"]): ReviewContentCreateInput {
  return {
    ...input,
    author: {
      ...input.author,
      customerId: decodeOptionalId(input.author.customerId, GlobalIdEntity.Customer, ["input", "content", "author", "customerId"], errors),
    },
  };
}

function decodeOptionalId(value: string | null | undefined, type: GlobalIdType, field: string[], errors: DecodeResult<never>["errors"]): string | null | undefined {
  return value == null ? value : decodeId(value, type, field, errors);
}

function decodeId(value: string, type: GlobalIdType | undefined, field: string[], errors: DecodeResult<never>["errors"]): string {
  try {
    return decodeGlobalIdByType(value, type);
  } catch {
    errors.push({ message: "Invalid ID format", field, code: "INVALID_ID" });
    return value;
  }
}

function safeDecodeId(
  value: string,
  type: GlobalIdType | undefined
): string | null {
  try {
    return decodeGlobalIdByType(value, type);
  } catch {
    return null;
  }
}

function invalidIdError(field: string) {
  return {
    message: "Invalid ID format",
    field: [field],
    code: "INVALID_ID",
  };
}

function invalidSingleUpdate(
  field: string,
  type: ReviewsUpdateOperationType,
  idField: string
) {
  const error = invalidIdError(idField);
  return {
    [field]: null,
    operationResults: [{
      type: toGraphqlReviewsUpdateOperationType(type),
      applied: false,
      errors: [error],
    }],
    userErrors: [error],
  };
}

function mapOperationResults(results: ReviewsUpdateOperationResult[]) {
  return results.map((result) => ({
    type: toGraphqlReviewsUpdateOperationType(result.type),
    applied: result.applied,
    errors: result.errors,
  }));
}

function mapRatingCriterionPreflightResult(
  entry: RatingCriterionUpdateMappedEntry
) {
  return {
    type: toGraphqlReviewsUpdateOperationType(entry.type),
    applied: false,
    errors: entry.errors,
  };
}

function toGraphqlReviewsUpdateOperationType(
  type: ReviewsUpdateOperationType
): string {
  const types: Record<ReviewsUpdateOperationType, string> = {
    storeConfigurationUpdate: "STORE_CONFIGURATION_UPDATE",
    ratingCriterionDefinitionUpdate: "RATING_CRITERION_DEFINITION_UPDATE",
    ratingCriterionApplicabilityUpdate: "RATING_CRITERION_APPLICABILITY_UPDATE",
    ratingCriterionTranslationsSync: "RATING_CRITERION_TRANSLATIONS_SYNC",
    ratingCriterionAssignmentsSync: "RATING_CRITERION_ASSIGNMENTS_SYNC",
    productQuestionSubscriptionUpdate: "PRODUCT_QUESTION_SUBSCRIPTION_UPDATE",
    contentRedact: "CONTENT_REDACT",
    contentRevisionRestore: "CONTENT_REVISION_RESTORE",
    reviewRequestUpdate: "REVIEW_REQUEST_UPDATE",
    contentReportUpdate: "CONTENT_REPORT_UPDATE",
    moderationCaseUpdate: "MODERATION_CASE_UPDATE",
    contentExternalReferenceUpdate: "CONTENT_EXTERNAL_REFERENCE_UPDATE",
  };
  return types[type];
}

function mapPreflightOperationResult(entry: ReviewUpdateMappedEntry) {
  return {
    type: toGraphqlReviewOperationType(entry.type),
    applied: false,
    clientMutationId: entry.clientMutationId,
    entityId: entry.entityId
      ? encodeReviewReplyId(entry.entityId)
      : undefined,
    errors: entry.errors,
  };
}

function encodeReviewReplyId(id: string): string {
  return encodeGlobalIdByType(id, GlobalIdEntity.ReviewReply);
}

function toGraphqlReviewOperationType(
  type: ReviewUpdateOperation["type"]
): string {
  const types: Record<ReviewUpdateOperation["type"], string> = {
    contentUpdate: "CONTENT_UPDATE",
    contentAuthorUpdate: "CONTENT_AUTHOR_UPDATE",
    contentSourceUpdate: "CONTENT_SOURCE_UPDATE",
    contentModerationUpdate: "CONTENT_MODERATION_UPDATE",
    contentTranslationsSync: "CONTENT_TRANSLATIONS_SYNC",
    contentPublicationsSync: "CONTENT_PUBLICATIONS_SYNC",
    reviewSubjectUpdate: "REVIEW_SUBJECT_UPDATE",
    reviewRatingUpdate: "REVIEW_RATING_UPDATE",
    reviewVerificationUpdate: "REVIEW_VERIFICATION_UPDATE",
    reviewIncentiveUpdate: "REVIEW_INCENTIVE_UPDATE",
    reviewMediaSync: "REVIEW_MEDIA_SYNC",
    reviewReplyCreate: "REVIEW_REPLY_CREATE",
    reviewReplyUpdate: "REVIEW_REPLY_UPDATE",
    reviewReplyDelete: "REVIEW_REPLY_DELETE",
  };
  return types[type];
}

function mapProductQuestionPreflightOperationResult(
  entry: ProductQuestionUpdateMappedEntry
) {
  return {
    type: toGraphqlProductQuestionOperationType(entry.type),
    applied: false,
    clientMutationId: entry.clientMutationId,
    entityId: entry.entityId
      ? encodeGlobalIdByType(
          entry.entityId,
          GlobalIdEntity.ProductQuestionAnswer
        )
      : undefined,
    errors: entry.errors,
  };
}

function toGraphqlProductQuestionOperationType(
  type: ProductQuestionUpdateOperation["type"]
): string {
  const types: Record<ProductQuestionUpdateOperation["type"], string> = {
    contentUpdate: "CONTENT_UPDATE",
    contentAuthorUpdate: "CONTENT_AUTHOR_UPDATE",
    contentSourceUpdate: "CONTENT_SOURCE_UPDATE",
    contentModerationUpdate: "CONTENT_MODERATION_UPDATE",
    contentTranslationsSync: "CONTENT_TRANSLATIONS_SYNC",
    contentPublicationsSync: "CONTENT_PUBLICATIONS_SYNC",
    productQuestionUpdate: "PRODUCT_QUESTION_UPDATE",
    productQuestionAnswerCreate: "PRODUCT_QUESTION_ANSWER_CREATE",
    productQuestionAnswerUpdate: "PRODUCT_QUESTION_ANSWER_UPDATE",
    productQuestionAnswerDelete: "PRODUCT_QUESTION_ANSWER_DELETE",
  };
  return types[type];
}
