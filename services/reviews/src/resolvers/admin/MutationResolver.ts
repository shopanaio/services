import {
  decodeGlobalIdByType,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import { ApolloMutation, ZodResolver } from "@shopana/type-resolver";
import type {
  ContentExternalReferenceCreateResult,
  ContentExternalReferenceCreateWorkflowInput,
  ContentExternalReferenceDeleteResult,
  ContentExternalReferenceDeleteWorkflowInput,
  ModerationCaseCreateResult,
  ModerationCaseCreateWorkflowInput,
  ProductQuestionCreateResult,
  ProductQuestionCreateWorkflowInput,
  ProductQuestionDeleteResult,
  ProductQuestionDeleteWorkflowInput,
  RatingCriterionCreateResult,
  RatingCriterionCreateWorkflowInput,
  RatingCriterionDeleteResult,
  RatingCriterionDeleteWorkflowInput,
  ReviewCreateResult,
  ReviewCreateWorkflowInput,
  ReviewDeleteResult,
  ReviewDeleteWorkflowInput,
  ReviewRequestCreateResult,
  ReviewRequestCreateWorkflowInput,
  ReviewsMutationWorkflowContext,
} from "../../scripts/index.js";
import { RatingCriterionResolver } from "./ConfigurationResolver.js";
import { ContentExternalReferenceResolver } from "./ExternalReferenceResolver.js";
import { ModerationCaseResolver } from "./ModerationResolver.js";
import { ProductQuestionResolver } from "./QuestionResolver.js";
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
  ReviewsMutationModerationCaseCreateArgs,
  ReviewsMutationProductQuestionCreateArgs,
  ReviewsMutationProductQuestionDeleteArgs,
  ReviewsMutationRatingCriterionCreateArgs,
  ReviewsMutationRatingCriterionDeleteArgs,
  ReviewsMutationReviewCreateArgs,
  ReviewsMutationReviewDeleteArgs,
  ReviewsMutationReviewRequestCreateArgs,
} from "./generated/types.js";

const updatePayload = (field: string) => ({ [field]: null, operationResults: [], userErrors: [] });

@ApolloMutation
export class MutationResolver extends ReviewsType<Record<string, never>> {
  reviewsMutation() {
    return this.resolvers.reviewsMutation();
  }
}

export class ReviewsMutationResolver extends ReviewsType<Record<string, never>> {
  storeConfigurationUpdate() { return updatePayload("configuration"); }

  @ZodResolver(ReviewRatingCriterionCreateInputSchema())
  async ratingCriterionCreate(args: ReviewsMutationRatingCriterionCreateArgs) {
    const decoded = decodeRatingCriterionInput(args.input);
    if (!decoded.value) return { criterion: null, userErrors: decoded.errors };
    const result = await this.runMutationWorkflow<RatingCriterionCreateResult>(
      "ratingCriterionCreate",
      { params: decoded.value, context: this.mutationWorkflowContext() } satisfies RatingCriterionCreateWorkflowInput
    );
    return {
      criterion: result.criterion ? new RatingCriterionResolver(result.criterion.id, this.$ctx) : null,
      userErrors: result.userErrors,
    };
  }

  ratingCriterionUpdate() { return updatePayload("criterion"); }
  @ZodResolver(ReviewRatingCriterionDeleteInputSchema())
  async ratingCriterionDelete(args: ReviewsMutationRatingCriterionDeleteArgs) {
    const decoded = decodeDeleteInput(args.input, GlobalIdEntity.ReviewRatingCriterion);
    if (!decoded.value) return { deletedCriterionId: null, userErrors: decoded.errors };
    const result = await this.runMutationWorkflow<RatingCriterionDeleteResult>(
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
    const result = await this.runMutationWorkflow<ReviewCreateResult>(
      "reviewCreate",
      { params: decoded.value, context: this.mutationWorkflowContext() } satisfies ReviewCreateWorkflowInput
    );
    return {
      review: result.review ? new ReviewResolver(result.review.id, this.$ctx) : null,
      userErrors: result.userErrors,
    };
  }

  reviewUpdate() { return updatePayload("review"); }
  @ZodResolver(ReviewContentDeleteInputSchema())
  async reviewDelete(args: ReviewsMutationReviewDeleteArgs) {
    const decoded = decodeDeleteInput(args.input, GlobalIdEntity.Review);
    if (!decoded.value) return { deletedReviewId: null, userErrors: decoded.errors };
    const result = await this.runMutationWorkflow<ReviewDeleteResult>(
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
    const result = await this.runMutationWorkflow<ProductQuestionCreateResult>(
      "productQuestionCreate",
      { params: decoded.value, context: this.mutationWorkflowContext() } satisfies ProductQuestionCreateWorkflowInput
    );
    return {
      productQuestion: result.productQuestion ? new ProductQuestionResolver(result.productQuestion.id, this.$ctx) : null,
      userErrors: result.userErrors,
    };
  }

  productQuestionUpdate() { return updatePayload("productQuestion"); }
  @ZodResolver(ReviewContentDeleteInputSchema())
  async productQuestionDelete(args: ReviewsMutationProductQuestionDeleteArgs) {
    const decoded = decodeDeleteInput(args.input, GlobalIdEntity.ProductQuestion);
    if (!decoded.value) return { deletedProductQuestionId: null, userErrors: decoded.errors };
    const result = await this.runMutationWorkflow<ProductQuestionDeleteResult>(
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
  productQuestionSubscriptionUpdate() { return updatePayload("subscription"); }
  contentRedact() { return updatePayload("content"); }
  contentRevisionRestore() { return updatePayload("content"); }

  @ZodResolver(ReviewRequestCreateInputSchema())
  async reviewRequestCreate(args: ReviewsMutationReviewRequestCreateArgs) {
    const decoded = decodeReviewRequestInput(args.input);
    if (!decoded.value) return { reviewRequest: null, userErrors: decoded.errors };
    const result = await this.runMutationWorkflow<ReviewRequestCreateResult>(
      "reviewRequestCreate",
      { params: decoded.value, context: this.mutationWorkflowContext() } satisfies ReviewRequestCreateWorkflowInput
    );
    return {
      reviewRequest: result.reviewRequest ? new ReviewRequestResolver(result.reviewRequest.id, this.$ctx) : null,
      userErrors: result.userErrors,
    };
  }

  reviewRequestUpdate() { return updatePayload("reviewRequest"); }
  contentReportUpdate() { return updatePayload("contentReport"); }

  @ZodResolver(ReviewModerationCaseCreateInputSchema())
  async moderationCaseCreate(args: ReviewsMutationModerationCaseCreateArgs) {
    const decoded = decodeModerationCaseInput(args.input);
    if (!decoded.value) return { moderationCase: null, userErrors: decoded.errors };
    const result = await this.runMutationWorkflow<ModerationCaseCreateResult>(
      "moderationCaseCreate",
      { params: decoded.value, context: this.mutationWorkflowContext() } satisfies ModerationCaseCreateWorkflowInput
    );
    return {
      moderationCase: result.moderationCase ? new ModerationCaseResolver(result.moderationCase.id, this.$ctx) : null,
      userErrors: result.userErrors,
    };
  }

  moderationCaseUpdate() { return updatePayload("moderationCase"); }

  @ZodResolver(ReviewContentExternalReferenceCreateInputSchema())
  async contentExternalReferenceCreate(args: ReviewsMutationContentExternalReferenceCreateArgs) {
    const decoded = decodeExternalReferenceInput(args.input);
    if (!decoded.value) return { externalReference: null, userErrors: decoded.errors };
    const result = await this.runMutationWorkflow<ContentExternalReferenceCreateResult>(
      "contentExternalReferenceCreate",
      { params: decoded.value, context: this.mutationWorkflowContext() } satisfies ContentExternalReferenceCreateWorkflowInput
    );
    return {
      externalReference: result.externalReference ? new ContentExternalReferenceResolver(result.externalReference.id, this.$ctx) : null,
      userErrors: result.userErrors,
    };
  }

  contentExternalReferenceUpdate() { return updatePayload("externalReference"); }
  @ZodResolver(ReviewContentExternalReferenceDeleteInputSchema())
  async contentExternalReferenceDelete(args: ReviewsMutationContentExternalReferenceDeleteArgs) {
    const decoded = decodeExternalReferenceDeleteInput(args.input);
    if (!decoded.value) return { deletedExternalReferenceId: null, userErrors: decoded.errors };
    const result = await this.runMutationWorkflow<ContentExternalReferenceDeleteResult>(
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

  private async runMutationWorkflow<TResult>(operation: string, input: unknown): Promise<TResult> {
    return (await this.$ctx.kernel.getServices().broker.runWorkflow(
      `reviews.${operation}`,
      input,
      {
        source: "workflow",
        workflowId: `${operation}:${this.$ctx.store.id}:${this.$ctx.requestId}`,
        stepId: "start",
      }
    )) as TResult;
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
