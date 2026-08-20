import { decodeGlobalId, GlobalIdEntity, type GlobalIdType } from "@shopana/shared-graphql-guid";
import { ApolloQuery } from "@shopana/type-resolver";
import type { RatingCriterionRelayInput } from "../../repositories/configuration/ConfigurationRepository.js";
import type { ContentConnectionInput } from "../../repositories/content/ContentRepository.js";
import type { ContentReportRelayInput } from "../../repositories/engagement/EngagementRepository.js";
import type { ContentExternalReferenceRelayInput } from "../../repositories/integration/ExternalReferenceRepository.js";
import type { ModerationCaseRelayInput } from "../../repositories/moderation/ModerationRepository.js";
import type { ProductQuestionAnswerConnectionInput } from "../../repositories/question/ProductQuestionAnswerRepository.js";
import type { ProductQuestionConnectionInput } from "../../repositories/question/ProductQuestionRepository.js";
import type { ReviewReplyConnectionInput } from "../../repositories/review/ReviewReplyRepository.js";
import type { ReviewConnectionInput } from "../../repositories/review/ReviewRepository.js";
import type { ReviewRequestRelayInput } from "../../repositories/request/ReviewRequestRepository.js";
import { RatingCriterionConnectionResolver } from "./ConfigurationConnectionResolver.js";
import { StoreConfigurationResolver } from "./ConfigurationResolver.js";
import {
  ContentConnectionResolver,
  ContentExternalReferenceConnectionResolver,
  ContentReportConnectionResolver,
  ModerationCaseConnectionResolver,
} from "./ContentConnectionResolver.js";
import {
  ProductQuestionAnswerConnectionResolver,
  ProductQuestionConnectionResolver,
} from "./QuestionConnectionResolver.js";
import {
  ReviewConnectionResolver,
  ReviewReplyConnectionResolver,
} from "./ReviewConnectionResolver.js";
import { ReviewRequestConnectionResolver } from "./ReviewRequestConnectionResolver.js";
import { ReviewsType } from "./ReviewsType.js";
import { WidgetQueryResolver } from "./ProductReviewsWidgetResolver.js";

@ApolloQuery
export class QueryResolver extends ReviewsType<Record<string, never>> {
  reviewsQuery() {
    return this.resolvers.reviewsQuery();
  }

  widgetQuery() {
    return new WidgetQueryResolver({}, this.$ctx);
  }
}

export class ReviewsQueryResolver extends ReviewsType<Record<string, never>> {
  private safeDecodeId(globalId: string, expectedType: GlobalIdType) {
    try {
      return this.decodeId(globalId, expectedType);
    } catch {
      return null;
    }
  }

  async node(args: { id: string }): Promise<unknown | null> {
    let typeName: string;
    try {
      typeName = decodeGlobalId(args.id).typeName;
    } catch {
      return null;
    }

    const id = this.safeDecodeId(args.id, typeName as GlobalIdType);
    if (!id) return null;

    switch (typeName) {
      case GlobalIdEntity.ReviewStoreConfiguration: {
        const row = await this.$ctx.kernel.repository.configuration.findStoreConfiguration();
        return row?.id === id ? new StoreConfigurationResolver(row, this.$ctx) : null;
      }
      case GlobalIdEntity.ReviewRatingCriterion:
        return (await this.isActiveRatingCriterion(id)) ? this.resolvers.ratingCriterion(id) : null;
      case GlobalIdEntity.ReviewRatingCriterionAssignment:
        return (await this.$ctx.loaders.ratingCriterionAssignment.load(id))
          ? this.resolvers.ratingCriterionAssignment(id)
          : null;
      case GlobalIdEntity.Review:
        return (await this.isActiveContent(id)) && (await this.$ctx.loaders.review.load(id))
          ? this.resolvers.review(id)
          : null;
      case GlobalIdEntity.ReviewMedia:
        return (await this.$ctx.loaders.reviewMediaItem.load(id))
          ? this.resolvers.reviewMedia(id)
          : null;
      case GlobalIdEntity.ReviewReply:
        return (await this.isActiveContent(id)) && (await this.$ctx.loaders.reviewReply.load(id))
          ? this.resolvers.reviewReply(id)
          : null;
      case GlobalIdEntity.ProductQuestion:
        return (await this.isActiveContent(id)) &&
          (await this.$ctx.loaders.productQuestion.load(id))
          ? this.resolvers.productQuestion(id)
          : null;
      case GlobalIdEntity.ProductQuestionAnswer:
        return (await this.isActiveContent(id)) &&
          (await this.$ctx.loaders.productQuestionAnswer.load(id))
          ? this.resolvers.productQuestionAnswer(id)
          : null;
      case GlobalIdEntity.ProductQuestionSubscription:
        return (await this.$ctx.loaders.questionSubscription.load(id))
          ? this.resolvers.questionSubscription(id)
          : null;
      case GlobalIdEntity.ReviewContentTranslation:
        return (await this.$ctx.loaders.contentTranslation.load(id))
          ? this.resolvers.contentTranslation(id)
          : null;
      case GlobalIdEntity.ReviewContentPublication:
        return (await this.$ctx.loaders.contentPublication.load(id))
          ? this.resolvers.contentPublication(id)
          : null;
      case GlobalIdEntity.ReviewContentVote:
        return (await this.$ctx.loaders.contentVote.load(id))
          ? this.resolvers.contentVote(id)
          : null;
      case GlobalIdEntity.ReviewContentReport:
        return (await this.$ctx.loaders.contentReport.load(id))
          ? this.resolvers.contentReport(id)
          : null;
      case GlobalIdEntity.ReviewModerationCase:
        return (await this.$ctx.loaders.moderationCase.load(id))
          ? this.resolvers.moderationCase(id)
          : null;
      case GlobalIdEntity.ReviewModerationEvent:
        return (await this.$ctx.loaders.moderationEvent.load(id))
          ? this.resolvers.moderationEvent(id)
          : null;
      case GlobalIdEntity.ReviewContentRevision:
        return (await this.$ctx.loaders.contentRevision.load(id))
          ? this.resolvers.contentRevision(id)
          : null;
      case GlobalIdEntity.ReviewModerationSignal:
        return (await this.$ctx.loaders.moderationSignal.load(id))
          ? this.resolvers.moderationSignal(id)
          : null;
      case GlobalIdEntity.ReviewContentExternalReference:
        return (await this.$ctx.loaders.contentExternalReference.load(id))
          ? this.resolvers.contentExternalReference(id)
          : null;
      case GlobalIdEntity.ReviewRequest:
        return (await this.$ctx.loaders.reviewRequest.load(id))
          ? this.resolvers.reviewRequest(id)
          : null;
      case GlobalIdEntity.ReviewRequestEvent:
        return (await this.$ctx.loaders.reviewRequestEvent.load(id))
          ? this.resolvers.reviewRequestEvent(id)
          : null;
      default:
        return null;
    }
  }

  nodes(args: { ids: string[] }) {
    return Promise.all(args.ids.map((id) => this.node({ id })));
  }

  async storeConfiguration() {
    const row = await this.$ctx.kernel.repository.configuration.findStoreConfiguration();
    return row ? new StoreConfigurationResolver(row, this.$ctx) : null;
  }

  async ratingCriterion(args: { id: string }) {
    const id = this.decodeId(args.id, GlobalIdEntity.ReviewRatingCriterion);
    return (await this.isActiveRatingCriterion(id)) ? this.resolvers.ratingCriterion(id) : null;
  }

  ratingCriteria(args: RatingCriterionRelayInput) {
    return new RatingCriterionConnectionResolver(args, this.$ctx);
  }

  async content(args: { id: string }) {
    const node = await this.node(args);
    return node && this.isContentResolver(node) ? node : null;
  }

  contents(args: ContentConnectionInput) {
    return new ContentConnectionResolver(args, this.$ctx);
  }

  async review(args: { id: string }) {
    const id = this.decodeId(args.id, GlobalIdEntity.Review);
    return (await this.isActiveContent(id)) && (await this.$ctx.loaders.review.load(id))
      ? this.resolvers.review(id)
      : null;
  }

  reviews(args: ReviewConnectionInput) {
    return new ReviewConnectionResolver(args, this.$ctx);
  }

  async reviewReply(args: { id: string }) {
    const id = this.decodeId(args.id, GlobalIdEntity.ReviewReply);
    return (await this.isActiveContent(id)) && (await this.$ctx.loaders.reviewReply.load(id))
      ? this.resolvers.reviewReply(id)
      : null;
  }

  reviewReplies(args: ReviewReplyConnectionInput) {
    return new ReviewReplyConnectionResolver(args, this.$ctx);
  }

  async productQuestion(args: { id: string }) {
    const id = this.decodeId(args.id, GlobalIdEntity.ProductQuestion);
    return (await this.isActiveContent(id)) && (await this.$ctx.loaders.productQuestion.load(id))
      ? this.resolvers.productQuestion(id)
      : null;
  }

  productQuestions(args: ProductQuestionConnectionInput) {
    return new ProductQuestionConnectionResolver(args, this.$ctx);
  }

  async productQuestionAnswer(args: { id: string }) {
    const id = this.decodeId(args.id, GlobalIdEntity.ProductQuestionAnswer);
    return (await this.isActiveContent(id)) &&
      (await this.$ctx.loaders.productQuestionAnswer.load(id))
      ? this.resolvers.productQuestionAnswer(id)
      : null;
  }

  productQuestionAnswers(args: ProductQuestionAnswerConnectionInput) {
    return new ProductQuestionAnswerConnectionResolver(args, this.$ctx);
  }

  async reviewRequest(args: { id: string }) {
    const id = this.decodeId(args.id, GlobalIdEntity.ReviewRequest);
    return (await this.$ctx.loaders.reviewRequest.load(id))
      ? this.resolvers.reviewRequest(id)
      : null;
  }

  reviewRequests(args: ReviewRequestRelayInput) {
    return new ReviewRequestConnectionResolver(args, this.$ctx);
  }

  async contentReport(args: { id: string }) {
    const id = this.decodeId(args.id, GlobalIdEntity.ReviewContentReport);
    return (await this.$ctx.loaders.contentReport.load(id))
      ? this.resolvers.contentReport(id)
      : null;
  }

  contentReports(args: ContentReportRelayInput) {
    return new ContentReportConnectionResolver(args, this.$ctx);
  }

  async moderationCase(args: { id: string }) {
    const id = this.decodeId(args.id, GlobalIdEntity.ReviewModerationCase);
    return (await this.$ctx.loaders.moderationCase.load(id))
      ? this.resolvers.moderationCase(id)
      : null;
  }

  moderationCases(args: ModerationCaseRelayInput) {
    return new ModerationCaseConnectionResolver(args, this.$ctx);
  }

  async contentExternalReference(args: { id: string }) {
    const id = this.decodeId(args.id, GlobalIdEntity.ReviewContentExternalReference);
    return (await this.$ctx.loaders.contentExternalReference.load(id))
      ? this.resolvers.contentExternalReference(id)
      : null;
  }

  contentExternalReferences(args: ContentExternalReferenceRelayInput) {
    return new ContentExternalReferenceConnectionResolver(args, this.$ctx);
  }

  private isContentResolver(value: unknown): boolean {
    return [
      "ReviewResolver",
      "ReviewReplyResolver",
      "ProductQuestionResolver",
      "ProductQuestionAnswerResolver",
    ].includes((value as { constructor?: { name?: string } }).constructor?.name ?? "");
  }

  private async isActiveContent(id: string): Promise<boolean> {
    const content = await this.$ctx.loaders.content.load(id);
    return Boolean(content && !content.deletedAt);
  }

  private async isActiveRatingCriterion(id: string): Promise<boolean> {
    const criterion = await this.$ctx.loaders.ratingCriterion.load(id);
    return Boolean(criterion && !criterion.deletedAt);
  }
}
