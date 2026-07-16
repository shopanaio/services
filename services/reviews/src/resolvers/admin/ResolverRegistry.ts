import type { ServiceContext } from "../../context/types.js";

const registries = new WeakMap<ServiceContext, ResolverRegistry>();

export function getResolverRegistry(ctx: ServiceContext): ResolverRegistry {
  const existing = registries.get(ctx);
  if (existing) return existing;
  const registry = new ResolverRegistry(ctx);
  registries.set(ctx, registry);
  return registry;
}

export class ResolverRegistry {
  constructor(private readonly ctx: ServiceContext) {}

  async reviewsQuery() {
    const { ReviewsQueryResolver } = await import("./QueryResolver.js");
    return new ReviewsQueryResolver({}, this.ctx);
  }

  async reviewsMutation() {
    const { ReviewsMutationResolver } = await import("./MutationResolver.js");
    return new ReviewsMutationResolver({}, this.ctx);
  }

  async content(id: string) {
    const content = await this.ctx.loaders.content.load(id);
    if (!content) return null;
    switch (content.kind) {
      case "REVIEW": return this.review(id);
      case "REVIEW_REPLY": return this.reviewReply(id);
      case "PRODUCT_QUESTION": return this.productQuestion(id);
      case "QUESTION_ANSWER": return this.productQuestionAnswer(id);
    }
  }

  async ratingCriterion(id: string) {
    const { RatingCriterionResolver } = await import("./ConfigurationResolver.js");
    return new RatingCriterionResolver(id, this.ctx);
  }
  async ratingCriterionAssignment(id: string) {
    const { RatingCriterionAssignmentResolver } = await import("./ConfigurationResolver.js");
    return new RatingCriterionAssignmentResolver(id, this.ctx);
  }
  async review(id: string) {
    const { ReviewResolver } = await import("./ReviewResolver.js");
    return new ReviewResolver(id, this.ctx);
  }
  async reviewMedia(id: string) {
    const { ReviewMediaResolver } = await import("./ReviewResolver.js");
    return new ReviewMediaResolver(id, this.ctx);
  }
  async reviewReply(id: string) {
    const { ReviewReplyResolver } = await import("./ReviewResolver.js");
    return new ReviewReplyResolver(id, this.ctx);
  }
  async productQuestion(id: string) {
    const { ProductQuestionResolver } = await import("./QuestionResolver.js");
    return new ProductQuestionResolver(id, this.ctx);
  }
  async productQuestionAnswer(id: string) {
    const { ProductQuestionAnswerResolver } = await import("./QuestionResolver.js");
    return new ProductQuestionAnswerResolver(id, this.ctx);
  }
  async questionSubscription(id: string) {
    const { QuestionSubscriptionResolver } = await import("./QuestionResolver.js");
    return new QuestionSubscriptionResolver(id, this.ctx);
  }
  async contentTranslation(id: string) {
    const { ContentTranslationResolver } = await import("./ContentResolver.js");
    return new ContentTranslationResolver(id, this.ctx);
  }
  async contentPublication(id: string) {
    const { ContentPublicationResolver } = await import("./ContentResolver.js");
    return new ContentPublicationResolver(id, this.ctx);
  }
  async contentVote(id: string) {
    const { ContentVoteResolver } = await import("./EngagementResolver.js");
    return new ContentVoteResolver(id, this.ctx);
  }
  async contentReport(id: string) {
    const { ContentReportResolver } = await import("./EngagementResolver.js");
    return new ContentReportResolver(id, this.ctx);
  }
  async moderationCase(id: string) {
    const { ModerationCaseResolver } = await import("./ModerationResolver.js");
    return new ModerationCaseResolver(id, this.ctx);
  }
  async moderationEvent(id: string) {
    const { ModerationEventResolver } = await import("./ModerationResolver.js");
    return new ModerationEventResolver(id, this.ctx);
  }
  async contentRevision(id: string) {
    const { ContentRevisionResolver } = await import("./ModerationResolver.js");
    return new ContentRevisionResolver(id, this.ctx);
  }
  async moderationSignal(id: string) {
    const { ModerationSignalResolver } = await import("./ModerationResolver.js");
    return new ModerationSignalResolver(id, this.ctx);
  }
  async contentExternalReference(id: string) {
    const { ContentExternalReferenceResolver } = await import("./ExternalReferenceResolver.js");
    return new ContentExternalReferenceResolver(id, this.ctx);
  }
  async reviewRequest(id: string) {
    const { ReviewRequestResolver } = await import("./ReviewRequestResolver.js");
    return new ReviewRequestResolver(id, this.ctx);
  }
  async reviewRequestEvent(id: string) {
    const { ReviewRequestEventResolver } = await import("./ReviewRequestResolver.js");
    return new ReviewRequestEventResolver(id, this.ctx);
  }
}
