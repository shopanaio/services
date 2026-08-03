import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { OrderReviewActions, type Orders } from "@shopana/broker-types";
import { ApolloMutation, ZodResolver } from "@shopana/type-resolver";
import { ReviewCreateScript, ProductQuestionCreateScript } from "../../scripts/create/index.js";
import { ReviewDeleteScript, ProductQuestionDeleteScript } from "../../scripts/delete/index.js";
import {
  StorefrontQuestionAnswerCreateScript,
  StorefrontReviewUpdateScript,
} from "../../scripts/storefront/index.js";
import type { ContentItem, StoreConfiguration } from "../../repositories/models/index.js";
import type { ContentPatch } from "../../repositories/content/ContentRepository.js";
import {
  ProductQuestionAnswerCreateInputSchema,
  ProductQuestionAnswerUpdateInputSchema,
  ProductQuestionCreateInputSchema,
  ProductQuestionSubscriptionSetInputSchema,
  ProductQuestionUpdateInputSchema,
  ReviewContentDeleteInputSchema,
  ReviewContentReportCreateInputSchema,
  ReviewContentVoteRemoveInputSchema,
  ReviewContentVoteSetInputSchema,
  ReviewCreateInputSchema,
  ReviewUpdateInputSchema,
} from "./generated/schemas.js";
import type {
  ProductQuestionAnswerCreateInput,
  ProductQuestionAnswerUpdateInput,
  ProductQuestionCreateInput,
  ProductQuestionSubscriptionSetInput,
  ProductQuestionUpdateInput,
  ReviewContentDeleteInput,
  ReviewContentEditInput,
  ReviewContentReportCreateInput,
  ReviewContentVoteRemoveInput,
  ReviewContentVoteSetInput,
  ReviewCreateInput,
  ReviewUpdateInput,
} from "./generated/types.js";
import { viewerKey } from "./ContentResolver.js";
import { getApplicableCriteria } from "./ConfigurationConnectionResolver.js";
import { ReviewsType } from "./ReviewsType.js";

type UserError = { message: string; code: string; field?: string[] };
type StorefrontCreatedContent = {
  readonly title: string | null;
  readonly body: string;
  readonly locale: string;
  readonly author: {
    readonly type: "CUSTOMER" | "GUEST";
    readonly customerId: string | null;
    readonly principalId: null;
    readonly displayName: string;
    readonly email: string | null;
  };
  readonly source: { readonly channel: "STOREFRONT"; readonly metadata: Record<string, never>; readonly idempotencyKey: string };
  readonly status: "PUBLISHED" | "PENDING";
  readonly moderationNote: null;
};

@ApolloMutation
export class MutationResolver extends ReviewsType<Record<string, never>> {
  @ZodResolver(ReviewCreateInputSchema())
  async reviewCreate(args: { input: ReviewCreateInput }) {
    this.requireWritePermission();
    const config = await this.configuration();
    const errors = this.validateSubmission(config, "review", args.input.content.author) ?? [];
    const productId = this.decodeId(args.input.productId, GlobalIdEntity.Product);
    const variantId = args.input.variantId
      ? this.decodeId(args.input.variantId, GlobalIdEntity.ProductVariant)
      : null;
    if (!args.input.content.idempotencyKey.trim()) errors.push(error("Idempotency key is required", "INVALID_IDEMPOTENCY_KEY", ["input", "content", "idempotencyKey"]));
    if (!config.reviewsEnabled) errors.push(error("Reviews are disabled", "REVIEWS_DISABLED", ["input"]));
    if ((args.input.media?.length ?? 0) > config.maxReviewMediaCount) errors.push(error(`A review may contain at most ${config.maxReviewMediaCount} media items`, "MEDIA_LIMIT_EXCEEDED", ["input", "media"]));
    const purchase = await this.verifyPurchase(args.input, productId, variantId, config.verifiedPurchaseRequired);
    if (purchase.error) errors.push(purchase.error);
    if (this.$ctx.customer && config.reviewDuplicatePolicy !== "ALLOW_MULTIPLE") {
      const orderLineId = args.input.orderLineId ? this.decodeId(args.input.orderLineId, GlobalIdEntity.OrderLine) : null;
      const duplicate = await this.$ctx.kernel.repository.review.getConnection({
        first: 1,
        where: { _and: [
          { authorCustomerId: { _eq: this.$ctx.customer.id } },
          ...(config.reviewDuplicatePolicy === "ONE_PER_ORDER_LINE" && orderLineId
            ? [{ orderLineId: { _eq: orderLineId } }]
            : [{ productId: { _eq: productId } }]),
        ] },
      });
      if (duplicate.totalCount > 0) errors.push(error("A review already exists for this purchase", "DUPLICATE_REVIEW", ["input", config.reviewDuplicatePolicy === "ONE_PER_ORDER_LINE" ? "orderLineId" : "productId"]));
    }
    const applicableCriteria = await getApplicableCriteria(this.$ctx, productId);
    const applicableIds = new Set(applicableCriteria.map((criterion) => criterion.id));
    const submittedIds = new Set<string>();
    for (const [index, rating] of (args.input.ratings ?? []).entries()) {
      const criterionId = this.decodeId(rating.criterionId, GlobalIdEntity.ReviewRatingCriterion);
      if (!applicableIds.has(criterionId)) errors.push(error("Rating criterion is not applicable to this product", "CRITERION_NOT_APPLICABLE", ["input", "ratings", String(index), "criterionId"]));
      submittedIds.add(criterionId);
    }
    for (const criterion of applicableCriteria) {
      if (criterion.isRequired && !submittedIds.has(criterion.id)) errors.push(error("A required rating criterion is missing", "REQUIRED_CRITERION_MISSING", ["input", "ratings"]));
    }
    if (errors.length) return { review: null, userErrors: errors };

    const replay = await this.idempotentContent(args.input.content.idempotencyKey, "REVIEW", args.input.content.author?.email);
    if (replay.error) return { review: null, userErrors: [replay.error] };
    if (replay.id) return { review: await this.resolvers.review(replay.id), userErrors: [] };

    const content = this.createContent(args.input.content, args.input.title, config.reviewModerationMode);
    const params = {
      content,
      productId,
      variantId,
      orderId: args.input.orderId ? this.decodeId(args.input.orderId, GlobalIdEntity.Order) : null,
      orderLineId: args.input.orderLineId ? this.decodeId(args.input.orderLineId, GlobalIdEntity.OrderLine) : null,
      rating: args.input.rating,
      ratings: (args.input.ratings ?? []).map((item) => ({ criterionId: this.decodeId(item.criterionId, GlobalIdEntity.ReviewRatingCriterion), value: item.value })),
      media: (args.input.media ?? []).map((item, index) => ({
        fileId: this.decodeId(item.mediaId, GlobalIdEntity.File),
        sortIndex: item.sortIndex ?? index,
        caption: item.caption,
        moderation: { status: content.status },
      })),
      verification: purchase.verification,
    };
    const result = await this.$ctx.kernel.runScript(ReviewCreateScript, params as never);
    if (!result.review) return { review: null, userErrors: result.userErrors };
    await this.$ctx.kernel.repository.engagement.refreshContentMetrics(result.review.id);
    await this.$ctx.kernel.repository.summary.refreshProductReviewSummary(result.review.productId);
    return { review: await this.resolvers.review(result.review.id), userErrors: result.userErrors };
  }

  @ZodResolver(ReviewUpdateInputSchema())
  async reviewUpdate(args: { input: ReviewUpdateInput }) {
    this.requireWritePermission();
    const id = this.decodeId(args.input.reviewId, GlobalIdEntity.Review);
    const ownership = await this.requireEditable(id, "REVIEW");
    if (ownership.error) return { review: null, userErrors: [ownership.error] };
    const errors = validateEdit(args.input.content, "REVIEW");
    if (args.input.rating != null && (args.input.rating < 1 || args.input.rating > 5)) errors.push(error("Rating must be between 1 and 5", "INVALID_RATING", ["input", "rating"]));
    const config = await this.configuration();
    if ((args.input.media?.length ?? 0) > config.maxReviewMediaCount) errors.push(error(`A review may contain at most ${config.maxReviewMediaCount} media items`, "MEDIA_LIMIT_EXCEEDED", ["input", "media"]));
    const review = await this.$ctx.kernel.repository.review.findById(id);
    if (args.input.ratings && review) {
      errors.push(...await this.validateRatingReplacement(review.review.productId, args.input.ratings));
    }
    if (args.input.media) errors.push(...validateMediaReplacement(args.input.media));
    if (errors.length) return { review: null, userErrors: errors };
    const result = await this.$ctx.kernel.runScript(StorefrontReviewUpdateScript, {
      id,
      expectedRevision: args.input.expectedRevision,
      contentPatch: editPatch(args.input.content),
      rating: args.input.rating ?? undefined,
      ratings: args.input.ratings?.map((item) => ({ criterionId: this.decodeId(item.criterionId, GlobalIdEntity.ReviewRatingCriterion), value: item.value })),
      media: args.input.media?.map((item, index) => ({
        fileId: this.decodeId(item.mediaId, GlobalIdEntity.File),
        sortIndex: item.sortIndex ?? index,
        caption: item.caption?.trim() || null,
        status: ownership.content!.status,
        moderationNote: null,
        moderatedByPrincipalId: null,
        moderatedAt: null,
      })),
    });
    if (result.status === "error") return { review: null, userErrors: result.userErrors };
    if (result.status !== "applied") return { review: null, userErrors: [optimisticError(result.status, "reviewId")] };
    this.clearContent(id);
    this.$ctx.loaders.contentMetrics.clear(id);
    return { review: await this.resolvers.review(id), userErrors: [] };
  }

  @ZodResolver(ReviewContentDeleteInputSchema())
  async reviewDelete(args: { input: ReviewContentDeleteInput }) {
    this.requireWritePermission();
    const id = this.decodeId(args.input.id, GlobalIdEntity.Review);
    const ownership = await this.requireEditable(id, "REVIEW");
    if (ownership.error) return { deletedReviewId: null, userErrors: [ownership.error] };
    const result = await this.$ctx.kernel.runScript(ReviewDeleteScript, { id, expectedRevision: args.input.expectedRevision, permanent: false });
    if (result.productId) await this.$ctx.kernel.repository.summary.refreshProductReviewSummary(result.productId);
    return { deletedReviewId: result.deletedReviewId ? args.input.id : null, userErrors: result.userErrors };
  }

  @ZodResolver(ProductQuestionCreateInputSchema())
  async productQuestionCreate(args: { input: ProductQuestionCreateInput }) {
    this.requireWritePermission();
    const config = await this.configuration();
    const errors = this.validateSubmission(config, "question", args.input.content.author) ?? [];
    if (!args.input.content.idempotencyKey.trim()) errors.push(error("Idempotency key is required", "INVALID_IDEMPOTENCY_KEY", ["input", "content", "idempotencyKey"]));
    if (!config.questionsEnabled) errors.push(error("Product questions are disabled", "QUESTIONS_DISABLED", ["input"]));
    if (errors.length) return { productQuestion: null, userErrors: errors };
    const replay = await this.idempotentContent(args.input.content.idempotencyKey, "PRODUCT_QUESTION", args.input.content.author?.email);
    if (replay.error) return { productQuestion: null, userErrors: [replay.error] };
    if (replay.id) return { productQuestion: await this.resolvers.productQuestion(replay.id), userErrors: [] };
    const params = {
      content: this.createContent(args.input.content, null, config.questionModerationMode),
      productId: this.decodeId(args.input.productId, GlobalIdEntity.Product),
      variantId: args.input.variantId ? this.decodeId(args.input.variantId, GlobalIdEntity.ProductVariant) : null,
    };
    const result = await this.$ctx.kernel.runScript(ProductQuestionCreateScript, params as never);
    if (!result.productQuestion) return { productQuestion: null, userErrors: result.userErrors };
    await this.$ctx.kernel.repository.summary.refreshProductQuestionSummary(result.productQuestion.productId);
    return { productQuestion: await this.resolvers.productQuestion(result.productQuestion.id), userErrors: result.userErrors };
  }

  @ZodResolver(ProductQuestionUpdateInputSchema())
  async productQuestionUpdate(args: { input: ProductQuestionUpdateInput }) {
    this.requireWritePermission();
    const id = this.decodeId(args.input.productQuestionId, GlobalIdEntity.ProductQuestion);
    const ownership = await this.requireEditable(id, "PRODUCT_QUESTION");
    if (ownership.error) return { productQuestion: null, userErrors: [ownership.error] };
    const errors = validateEdit(args.input.content, "PRODUCT_QUESTION");
    if (errors.length) return { productQuestion: null, userErrors: errors };
    const result = await this.$ctx.kernel.repository.content.update(id, args.input.expectedRevision, editPatch(args.input.content));
    if (result.status !== "applied") return { productQuestion: null, userErrors: [optimisticError(result.status, "productQuestionId")] };
    const question = await this.$ctx.kernel.repository.productQuestion.findById(id);
    if (question) await this.$ctx.kernel.repository.summary.refreshProductQuestionSummary(question.question.productId);
    this.clearContent(id);
    return { productQuestion: await this.resolvers.productQuestion(id), userErrors: [] };
  }

  @ZodResolver(ReviewContentDeleteInputSchema())
  async productQuestionDelete(args: { input: ReviewContentDeleteInput }) {
    this.requireWritePermission();
    const id = this.decodeId(args.input.id, GlobalIdEntity.ProductQuestion);
    const ownership = await this.requireEditable(id, "PRODUCT_QUESTION");
    if (ownership.error) return { deletedProductQuestionId: null, userErrors: [ownership.error] };
    const result = await this.$ctx.kernel.runScript(ProductQuestionDeleteScript, { id, expectedRevision: args.input.expectedRevision, permanent: false });
    if (result.productId) await this.$ctx.kernel.repository.summary.refreshProductQuestionSummary(result.productId);
    return { deletedProductQuestionId: result.deletedProductQuestionId ? args.input.id : null, userErrors: result.userErrors };
  }

  @ZodResolver(ProductQuestionAnswerCreateInputSchema())
  async productQuestionAnswerCreate(args: { input: ProductQuestionAnswerCreateInput }) {
    this.requireWritePermission();
    const customer = this.$ctx.customer;
    if (!customer) return { productQuestion: null, answer: null, userErrors: [authenticationError()] };
    const config = await this.configuration();
    if (!config.customerAnswersEnabled) return { productQuestion: null, answer: null, userErrors: [error("Customer answers are disabled", "ANSWERS_DISABLED", ["input"])] };
    const questionId = this.decodeId(args.input.productQuestionId, GlobalIdEntity.ProductQuestion);
    const question = await this.$ctx.kernel.repository.productQuestion.findById(questionId);
    if (!question || question.content.status !== "PUBLISHED" || question.content.redactedAt) return { productQuestion: null, answer: null, userErrors: [error("Product question not found", "NOT_FOUND", ["input", "productQuestionId"])] };
    const validation = validateSubmissionBody(args.input.content.body, "QUESTION_ANSWER");
    if (validation) return { productQuestion: null, answer: null, userErrors: [validation] };
    if (!args.input.content.idempotencyKey.trim()) return { productQuestion: null, answer: null, userErrors: [error("Idempotency key is required", "INVALID_IDEMPOTENCY_KEY", ["input", "content", "idempotencyKey"])] };
    const replay = await this.idempotentContent(args.input.content.idempotencyKey, "QUESTION_ANSWER", args.input.content.author?.email);
    if (replay.error) return { productQuestion: null, answer: null, userErrors: [replay.error] };
    if (replay.id) return { productQuestion: await this.resolvers.productQuestion(questionId), answer: await this.resolvers.productQuestionAnswer(replay.id), userErrors: [] };
    const content = this.createContent(args.input.content, null, config.answerModerationMode);
    const created = await this.$ctx.kernel.runScript(StorefrontQuestionAnswerCreateScript, {
      questionId,
      expectedRevision: args.input.expectedRevision,
      maxAnswers: config.maxAnswersPerQuestion,
      input: {
        content: mapCreatedContent(content),
        answer: { questionId, isOfficial: false, isAccepted: false, sortIndex: 0 },
      },
    });
    if (created.status === "error") return { productQuestion: null, answer: null, userErrors: created.userErrors };
    if (created.status === "limit_exceeded") return { productQuestion: null, answer: null, userErrors: [error("The question has reached its answer limit", "ANSWER_LIMIT_EXCEEDED", ["input"])] };
    if (created.status !== "applied") return { productQuestion: null, answer: null, userErrors: [optimisticError(created.status, "expectedRevision")] };
    this.clearContent(questionId);
    this.$ctx.loaders.contentMetrics.clear(questionId);
    return { productQuestion: await this.resolvers.productQuestion(questionId), answer: await this.resolvers.productQuestionAnswer(created.answerId), userErrors: [] };
  }

  @ZodResolver(ProductQuestionAnswerUpdateInputSchema())
  async productQuestionAnswerUpdate(args: { input: ProductQuestionAnswerUpdateInput }) {
    this.requireWritePermission();
    const id = this.decodeId(args.input.answerId, GlobalIdEntity.ProductQuestionAnswer);
    const ownership = await this.requireEditable(id, "QUESTION_ANSWER");
    if (ownership.error) return { answer: null, userErrors: [ownership.error] };
    const errors = validateEdit(args.input.content, "QUESTION_ANSWER");
    if (errors.length) return { answer: null, userErrors: errors };
    const result = await this.$ctx.kernel.repository.content.update(id, args.input.expectedRevision, editPatch(args.input.content));
    if (result.status !== "applied") return { answer: null, userErrors: [optimisticError(result.status, "answerId")] };
    const answer = await this.$ctx.kernel.repository.productQuestionAnswer.findById(id);
    if (answer) { const question = await this.$ctx.kernel.repository.productQuestion.findById(answer.answer.questionId); if (question) { await this.$ctx.kernel.repository.engagement.refreshContentMetrics(question.question.id); await this.$ctx.kernel.repository.summary.refreshProductQuestionSummary(question.question.productId); } }
    this.clearContent(id);
    return { answer: await this.resolvers.productQuestionAnswer(id), userErrors: [] };
  }

  @ZodResolver(ReviewContentDeleteInputSchema())
  async productQuestionAnswerDelete(args: { input: ReviewContentDeleteInput }) {
    this.requireWritePermission();
    const id = this.decodeId(args.input.id, GlobalIdEntity.ProductQuestionAnswer);
    const ownership = await this.requireEditable(id, "QUESTION_ANSWER");
    if (ownership.error) return { deletedAnswerId: null, userErrors: [ownership.error] };
    const answer = await this.$ctx.kernel.repository.productQuestionAnswer.findById(id);
    const result = await this.$ctx.kernel.repository.content.delete({ id, expectedRevision: args.input.expectedRevision, permanent: false });
    if (result.status !== "applied") return { deletedAnswerId: null, userErrors: [optimisticError(result.status, "id")] };
    if (answer) { const question = await this.$ctx.kernel.repository.productQuestion.findById(answer.answer.questionId); if (question) { await this.$ctx.kernel.repository.engagement.refreshContentMetrics(question.question.id); await this.$ctx.kernel.repository.summary.refreshProductQuestionSummary(question.question.productId); } }
    return { deletedAnswerId: args.input.id, userErrors: [] };
  }

  @ZodResolver(ProductQuestionSubscriptionSetInputSchema())
  async productQuestionSubscriptionSet(args: { input: ProductQuestionSubscriptionSetInput }) {
    this.requireWritePermission();
    const customer = this.$ctx.customer;
    if (!customer) return { subscription: null, userErrors: [authenticationError()] };
    const questionId = this.decodeId(args.input.productQuestionId, GlobalIdEntity.ProductQuestion);
    const question = await this.$ctx.kernel.repository.productQuestion.findById(questionId);
    if (!question || question.content.status !== "PUBLISHED") return { subscription: null, userErrors: [error("Product question not found", "NOT_FOUND", ["input", "productQuestionId"])] };
    const channel = args.input.channel ?? "EMAIL";
    const current = await this.$ctx.kernel.repository.questionSubscription.findByCustomer(questionId, customer.id, channel);
    if (current) {
      const result = await this.$ctx.kernel.repository.questionSubscription.update(current.id, current.updatedAt, {
        status: args.input.subscribed ? "ACTIVE" : "UNSUBSCRIBED",
        locale: args.input.locale ?? this.$ctx.locale ?? this.$ctx.store.defaultLocale,
      });
      return { subscription: result.status === "applied" ? await this.resolvers.questionSubscription(current.id) : null, userErrors: result.status === "applied" ? [] : [optimisticError(result.status, "productQuestionId")] };
    }
    const created = await this.$ctx.kernel.repository.questionSubscription.create({
      questionId, subscriberCustomerId: customer.id, subscriberKey: `customer:${customer.id}`,
      channel, status: args.input.subscribed ? "ACTIVE" : "UNSUBSCRIBED",
      locale: args.input.locale ?? this.$ctx.locale ?? this.$ctx.store.defaultLocale,
      lastNotifiedAt: null,
    });
    return { subscription: await this.resolvers.questionSubscription(created.id), userErrors: [] };
  }

  @ZodResolver(ReviewContentVoteSetInputSchema())
  async reviewContentVoteSet(args: { input: ReviewContentVoteSetInput }) {
    this.requireWritePermission();
    const contentId = this.decodeContentId(args.input.contentId);
    const content = await this.publicContent(contentId);
    if (!content) return { content: null, vote: null, userErrors: [error("Content not found", "NOT_FOUND", ["input", "contentId"])] };
    const key = viewerKey(this.$ctx);
    const vote = await this.$ctx.kernel.repository.engagement.upsertVote({ contentId, voterCustomerId: this.$ctx.customer?.id ?? null, voterKey: key, type: args.input.type });
    await this.$ctx.kernel.repository.engagement.refreshContentMetrics(contentId);
    this.$ctx.loaders.contentMetrics.clear(contentId);
    this.$ctx.loaders.contentVote.prime(vote.id, vote);
    return { content: await this.resolvers.content(contentId), vote: await this.resolvers.contentVote(vote.id), userErrors: [] };
  }

  @ZodResolver(ReviewContentVoteRemoveInputSchema())
  async reviewContentVoteRemove(args: { input: ReviewContentVoteRemoveInput }) {
    this.requireWritePermission();
    const contentId = this.decodeContentId(args.input.contentId);
    const content = await this.publicContent(contentId);
    if (!content) return { content: null, removedVoteId: null, userErrors: [error("Content not found", "NOT_FOUND", ["input", "contentId"])] };
    const removed = await this.$ctx.kernel.repository.engagement.deleteVote(contentId, viewerKey(this.$ctx));
    await this.$ctx.kernel.repository.engagement.refreshContentMetrics(contentId);
    this.$ctx.loaders.contentMetrics.clear(contentId);
    return { content: await this.resolvers.content(contentId), removedVoteId: removed ? this.encodeId(removed.id, GlobalIdEntity.ReviewContentVote) : null, userErrors: [] };
  }

  @ZodResolver(ReviewContentReportCreateInputSchema())
  async reviewContentReportCreate(args: { input: ReviewContentReportCreateInput }) {
    this.requireWritePermission();
    const contentId = this.decodeContentId(args.input.contentId);
    const content = await this.publicContent(contentId);
    if (!content) return { content: null, report: null, userErrors: [error("Content not found", "NOT_FOUND", ["input", "contentId"])] };
    const details = args.input.details?.trim() || null;
    if (args.input.reason === "OTHER" && !details) return { content: null, report: null, userErrors: [error("Details are required when reason is OTHER", "DETAILS_REQUIRED", ["input", "details"])] };
    if (details && details.length > 2000) return { content: null, report: null, userErrors: [error("Details cannot exceed 2000 characters", "INVALID_DETAILS", ["input", "details"])] };
    const key = viewerKey(this.$ctx);
    const existing = await this.$ctx.kernel.repository.engagement.findActiveReportByViewer(contentId, key);
    const report = existing ?? await this.$ctx.kernel.repository.engagement.createReport({
      contentId, reporterCustomerId: this.$ctx.customer?.id ?? null, reporterKey: key,
      reason: args.input.reason, details, status: "OPEN", assignedToPrincipalId: null,
      resolutionNote: null, resolvedByPrincipalId: null, resolvedAt: null,
    });
    await this.$ctx.kernel.repository.engagement.refreshContentMetrics(contentId);
    this.$ctx.loaders.contentMetrics.clear(contentId);
    this.$ctx.loaders.contentReport.prime(report.id, report);
    return { content: await this.resolvers.content(contentId), report: await this.resolvers.contentReport(report.id), userErrors: [] };
  }

  private async configuration() {
    return (await this.$ctx.kernel.repository.configuration.findStoreConfiguration())
      ?? this.$ctx.kernel.repository.configuration.createStoreConfiguration();
  }
  private async verifyPurchase(
    input: ReviewCreateInput,
    productId: string,
    variantId: string | null,
    required: boolean,
  ): Promise<{
    verification?: { status: "VERIFIED"; method: string; verifiedAt: string };
    error?: UserError;
  }> {
    if (!input.orderId && !input.orderLineId) {
      return required
        ? { error: error("A verified order and order line are required", "VERIFIED_PURCHASE_REQUIRED", ["input", "orderLineId"]) }
        : {};
    }
    if (!input.orderId || !input.orderLineId) {
      return { error: error("orderId and orderLineId must be provided together", "INVALID_PURCHASE_REFERENCE", ["input", input.orderId ? "orderLineId" : "orderId"]) };
    }
    const customerId = this.$ctx.customer?.id;
    if (!customerId) {
      return { error: error("Authentication is required to verify a purchase", "UNAUTHENTICATED", ["input", "orderId"]) };
    }
    const result = await this.$ctx.kernel.getServices().broker.call<
      Orders.VerifyReviewPurchaseResult,
      Orders.VerifyReviewPurchaseParams
    >(OrderReviewActions.verifyPurchase, {
      storeId: this.$ctx.store.id,
      customerId,
      orderId: this.decodeId(input.orderId, GlobalIdEntity.Order),
      orderLineId: this.decodeId(input.orderLineId, GlobalIdEntity.OrderLine),
      productId,
      variantId,
    });
    if (!result.eligible) {
      return { error: error("The order line is not eligible for this review", result.code, ["input", "orderLineId"]) };
    }
    return {
      verification: {
        status: "VERIFIED",
        method: result.verificationMethod,
        verifiedAt: new Date().toISOString(),
      },
    };
  }
  private async validateRatingReplacement(
    productId: string,
    ratings: NonNullable<ReviewUpdateInput["ratings"]>,
  ): Promise<UserError[]> {
    const errors: UserError[] = [];
    const criteria = await getApplicableCriteria(this.$ctx, productId);
    const applicableIds = new Set(criteria.map((criterion) => criterion.id));
    const submittedIds = new Set<string>();
    for (const [index, rating] of ratings.entries()) {
      const criterionId = this.decodeId(rating.criterionId, GlobalIdEntity.ReviewRatingCriterion);
      if (rating.value < 1 || rating.value > 5) {
        errors.push(error("Criterion rating must be between 1 and 5", "INVALID_RATING", ["input", "ratings", String(index), "value"]));
      }
      if (submittedIds.has(criterionId)) {
        errors.push(error("A criterion may only be rated once", "DUPLICATE_CRITERION", ["input", "ratings", String(index), "criterionId"]));
      }
      if (!applicableIds.has(criterionId)) {
        errors.push(error("Rating criterion is not applicable to this product", "CRITERION_NOT_APPLICABLE", ["input", "ratings", String(index), "criterionId"]));
      }
      submittedIds.add(criterionId);
    }
    for (const criterion of criteria) {
      if (criterion.isRequired && !submittedIds.has(criterion.id)) {
        errors.push(error("A required rating criterion is missing", "REQUIRED_CRITERION_MISSING", ["input", "ratings"]));
      }
    }
    return errors;
  }
  private validateSubmission(config: StoreConfiguration, kind: "review" | "question", author?: { displayName: string; email?: string | null } | null): UserError[] {
    if (this.$ctx.customer) return [];
    const enabled = kind === "review" ? config.guestReviewsEnabled : config.guestQuestionsEnabled;
    if (!enabled) return [authenticationError()];
    if (!author?.email) return [error("Guest submissions require an email address", "GUEST_EMAIL_REQUIRED", ["input", "content", "author", "email"] )];
    return [];
  }
  private createContent(input: { body: string; locale?: string | null; idempotencyKey: string; author?: { displayName: string; email?: string | null } | null }, title: string | null | undefined, mode: string): StorefrontCreatedContent {
    const customer = this.$ctx.customer;
    const displayName = customer
      ? [customer.firstName, customer.lastName].filter(Boolean).join(" ") || customer.email || "Customer"
      : input.author!.displayName.trim();
    return {
      title: title?.trim() || null, body: input.body, locale: input.locale ?? this.$ctx.locale ?? this.$ctx.store.defaultLocale,
      author: { type: customer ? "CUSTOMER" : "GUEST", customerId: customer?.id ?? null, principalId: null, displayName, email: customer?.email ?? input.author?.email ?? null },
      source: { channel: "STOREFRONT", metadata: {}, idempotencyKey: input.idempotencyKey },
      status: mode === "POSTMODERATION" ? "PUBLISHED" : "PENDING",
      moderationNote: null,
    } as const;
  }
  private async requireEditable(id: string, kind: ContentItem["kind"]): Promise<{ content?: ContentItem; error?: UserError }> {
    const content = await this.$ctx.kernel.repository.content.findById(id);
    if (!content || content.kind !== kind || content.authorCustomerId !== this.$ctx.customer?.id) return { error: error("Content not found", "NOT_FOUND", ["input", "id"]) };
    const config = await this.configuration();
    const hours = kind === "REVIEW" ? config.reviewEditWindowHours : kind === "PRODUCT_QUESTION" ? config.questionEditWindowHours : config.answerEditWindowHours;
    if (Date.now() > Date.parse(content.createdAt) + hours * 3_600_000) return { error: error("The edit window has expired", "EDIT_WINDOW_EXPIRED", ["input", "id"]) };
    return { content };
  }
  private decodeContentId(globalId: string) {
    for (const type of [GlobalIdEntity.Review, GlobalIdEntity.ReviewReply, GlobalIdEntity.ProductQuestion, GlobalIdEntity.ProductQuestionAnswer]) {
      try { return this.decodeId(globalId, type); } catch { continue; }
    }
    throw new Error("Invalid review content ID");
  }
  private async publicContent(id: string) { const row = await this.$ctx.kernel.repository.content.findById(id); return row?.status === "PUBLISHED" && !row.redactedAt ? row : null; }
  private async idempotentContent(key: string, kind: ContentItem["kind"], guestEmail?: string | null): Promise<{ id?: string; error?: UserError }> {
    const existing = await this.$ctx.kernel.repository.content.findByIdempotencyKey("STOREFRONT", key.trim());
    if (!existing) return {};
    const sameAuthor = this.$ctx.customer
      ? existing.authorCustomerId === this.$ctx.customer.id
      : existing.authorType === "GUEST" && existing.authorEmail === guestEmail?.trim();
    return existing.kind === kind && sameAuthor
      ? { id: existing.id }
      : { error: error("The idempotency key is already in use", "IDEMPOTENCY_KEY_CONFLICT", ["input", "content", "idempotencyKey"]) };
  }
  private clearContent(id: string) { this.$ctx.loaders.content.clear(id); }
}

function error(message: string, code: string, field?: string[]): UserError { return { message, code, field }; }
function authenticationError() { return error("Authentication is required", "UNAUTHENTICATED", ["input"]); }
function optimisticError(status: "conflict" | "not_found", field: string) { return status === "conflict" ? error("Content was modified by another request", "REVISION_CONFLICT", ["input", "expectedRevision"]) : error("Content not found", "NOT_FOUND", ["input", field]); }
function validateSubmissionBody(body: string, kind: ContentItem["kind"]) { const min = kind === "REVIEW" ? 20 : kind === "REVIEW_REPLY" ? 1 : 10; const length = body.trim().length; return length < min || length > 5000 ? error(`Content body must contain between ${min} and 5000 characters`, "INVALID_BODY", ["input", "content", "body"]) : null; }
function validateEdit(input: ReviewContentEditInput | null | undefined, kind: ContentItem["kind"]): UserError[] {
  if (!input) return [];
  const errors: UserError[] = [];
  if (input.body != null) { const bodyError = validateSubmissionBody(input.body, kind); if (bodyError) errors.push(bodyError); }
  if (kind !== "REVIEW" && input.title != null) errors.push(error("Only reviews may have a title", "INVALID_TITLE", ["input", "content", "title"]));
  if (input.title != null && input.title.trim().length > 150) errors.push(error("Title cannot exceed 150 characters", "INVALID_TITLE", ["input", "content", "title"]));
  return errors;
}
function validateMediaReplacement(media: NonNullable<ReviewUpdateInput["media"]>): UserError[] {
  const errors: UserError[] = [];
  const fileIds = new Set<string>();
  for (const [index, item] of media.entries()) {
    if (item.sortIndex != null && item.sortIndex < 0) {
      errors.push(error("Media sort index cannot be negative", "INVALID_SORT_INDEX", ["input", "media", String(index), "sortIndex"]));
    }
    if (fileIds.has(item.mediaId)) {
      errors.push(error("A media file may only be attached once", "DUPLICATE_MEDIA", ["input", "media", String(index), "mediaId"]));
    }
    fileIds.add(item.mediaId);
  }
  return errors;
}
function editPatch(input: ReviewContentEditInput | null | undefined): ContentPatch {
  if (!input) return {};
  return {
    ...(input.body != null ? { body: input.body.trim() } : {}),
    ...(input.title !== undefined ? { title: input.title?.trim() || null } : {}),
    ...(input.locale != null ? { locale: input.locale } : {}),
  };
}
function mapCreatedContent(input: StorefrontCreatedContent) {
  const now = new Date().toISOString();
  return {
    title: input.title, body: input.body.trim(), locale: input.locale,
    authorType: input.author.type, authorCustomerId: input.author.customerId,
    authorPrincipalId: null, authorDisplayName: input.author.displayName,
    authorEmail: input.author.email, sourceChannel: "STOREFRONT",
    sourceMetadata: {}, idempotencyKey: input.source.idempotencyKey.trim(),
    status: input.status, moderationNote: null, moderatedByPrincipalId: null,
    moderatedAt: null, publishedAt: input.status === "PUBLISHED" ? now : null,
    unpublishedAt: null,
  };
}
