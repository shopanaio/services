import {
  decodeGlobalIdByType,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import { ApolloMutation, ZodResolver } from "@shopana/type-resolver";
import type {
  ContentExternalReferenceCreateResult,
  ContentExternalReferenceCreateWorkflowInput,
  ModerationCaseCreateResult,
  ModerationCaseCreateWorkflowInput,
  ProductQuestionCreateResult,
  ProductQuestionCreateWorkflowInput,
  RatingCriterionCreateResult,
  RatingCriterionCreateWorkflowInput,
  ReviewCreateResult,
  ReviewCreateWorkflowInput,
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
  ReviewContentExternalReferenceCreateInputSchema,
  ReviewCreateInputSchema,
  ReviewModerationCaseCreateInputSchema,
  ReviewRatingCriterionCreateInputSchema,
  ReviewRequestCreateInputSchema,
} from "./generated/schemas.js";
import type {
  ProductQuestionCreateInput,
  ReviewContentCreateInput,
  ReviewContentExternalReferenceCreateInput,
  ReviewCreateInput,
  ReviewModerationCaseCreateInput,
  ReviewRatingCriterionCreateInput,
  ReviewRequestCreateInput,
  ReviewsMutationContentExternalReferenceCreateArgs,
  ReviewsMutationModerationCaseCreateArgs,
  ReviewsMutationProductQuestionCreateArgs,
  ReviewsMutationRatingCriterionCreateArgs,
  ReviewsMutationReviewCreateArgs,
  ReviewsMutationReviewRequestCreateArgs,
} from "./generated/types.js";

const updatePayload = (field: string) => ({ [field]: null, operationResults: [], userErrors: [] });
const deletePayload = (field: string) => ({ [field]: null, userErrors: [] });

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
    const result = await this.runCreateWorkflow<RatingCriterionCreateResult>(
      "ratingCriterionCreate",
      { params: decoded.value, context: this.mutationWorkflowContext() } satisfies RatingCriterionCreateWorkflowInput
    );
    return {
      criterion: result.criterion ? new RatingCriterionResolver(result.criterion.id, this.$ctx) : null,
      userErrors: result.userErrors,
    };
  }

  ratingCriterionUpdate() { return updatePayload("criterion"); }
  ratingCriterionDelete() { return deletePayload("deletedCriterionId"); }

  @ZodResolver(ReviewCreateInputSchema())
  async reviewCreate(args: ReviewsMutationReviewCreateArgs) {
    const decoded = decodeReviewInput(args.input);
    if (!decoded.value) return { review: null, userErrors: decoded.errors };
    const result = await this.runCreateWorkflow<ReviewCreateResult>(
      "reviewCreate",
      { params: decoded.value, context: this.mutationWorkflowContext() } satisfies ReviewCreateWorkflowInput
    );
    return {
      review: result.review ? new ReviewResolver(result.review.id, this.$ctx) : null,
      userErrors: result.userErrors,
    };
  }

  reviewUpdate() { return updatePayload("review"); }
  reviewDelete() { return deletePayload("deletedReviewId"); }

  @ZodResolver(ProductQuestionCreateInputSchema())
  async productQuestionCreate(args: ReviewsMutationProductQuestionCreateArgs) {
    const decoded = decodeProductQuestionInput(args.input);
    if (!decoded.value) return { productQuestion: null, userErrors: decoded.errors };
    const result = await this.runCreateWorkflow<ProductQuestionCreateResult>(
      "productQuestionCreate",
      { params: decoded.value, context: this.mutationWorkflowContext() } satisfies ProductQuestionCreateWorkflowInput
    );
    return {
      productQuestion: result.productQuestion ? new ProductQuestionResolver(result.productQuestion.id, this.$ctx) : null,
      userErrors: result.userErrors,
    };
  }

  productQuestionUpdate() { return updatePayload("productQuestion"); }
  productQuestionDelete() { return deletePayload("deletedProductQuestionId"); }
  productQuestionSubscriptionUpdate() { return updatePayload("subscription"); }
  contentRedact() { return updatePayload("content"); }
  contentRevisionRestore() { return updatePayload("content"); }

  @ZodResolver(ReviewRequestCreateInputSchema())
  async reviewRequestCreate(args: ReviewsMutationReviewRequestCreateArgs) {
    const decoded = decodeReviewRequestInput(args.input);
    if (!decoded.value) return { reviewRequest: null, userErrors: decoded.errors };
    const result = await this.runCreateWorkflow<ReviewRequestCreateResult>(
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
    const result = await this.runCreateWorkflow<ModerationCaseCreateResult>(
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
    const result = await this.runCreateWorkflow<ContentExternalReferenceCreateResult>(
      "contentExternalReferenceCreate",
      { params: decoded.value, context: this.mutationWorkflowContext() } satisfies ContentExternalReferenceCreateWorkflowInput
    );
    return {
      externalReference: result.externalReference ? new ContentExternalReferenceResolver(result.externalReference.id, this.$ctx) : null,
      userErrors: result.userErrors,
    };
  }

  contentExternalReferenceUpdate() { return updatePayload("externalReference"); }
  contentExternalReferenceDelete() { return deletePayload("deletedExternalReferenceId"); }

  private mutationWorkflowContext(): ReviewsMutationWorkflowContext {
    return {
      organizationId: this.$ctx.store.organizationId,
      storeId: this.$ctx.store.id,
      userId: this.$ctx.hasUser ? this.$ctx.user.id : undefined,
      locale: this.$ctx.locale ?? this.$ctx.store.defaultLocale,
      requestId: this.$ctx.requestId,
    };
  }

  private async runCreateWorkflow<TResult>(operation: string, input: unknown): Promise<TResult> {
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
