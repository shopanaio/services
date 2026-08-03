import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError, SubgraphReference } from "@shopana/type-resolver";
import type { RatingCriterion, RatingCriterionAssignment, RatingCriterionTranslation, StoreConfiguration } from "../../repositories/models/index.js";
import { ReviewsType } from "./ReviewsType.js";
import { categoryReference, productReference } from "./references.js";

@SubgraphReference()
export class StoreConfigurationResolver extends ReviewsType<StoreConfiguration> {
  id() { return this.encodeId(this.$props.id, GlobalIdEntity.ReviewStoreConfiguration); }
  reviewsEnabled() { return this.$props.reviewsEnabled; }
  questionsEnabled() { return this.$props.questionsEnabled; }
  guestReviewsEnabled() { return this.$props.guestReviewsEnabled; }
  guestQuestionsEnabled() { return this.$props.guestQuestionsEnabled; }
  customerAnswersEnabled() { return this.$props.customerAnswersEnabled; }
  verifiedPurchaseRequired() { return this.$props.verifiedPurchaseRequired; }
  reviewModerationMode() { return this.$props.reviewModerationMode; }
  questionModerationMode() { return this.$props.questionModerationMode; }
  answerModerationMode() { return this.$props.answerModerationMode; }
  reviewDuplicatePolicy() { return this.$props.reviewDuplicatePolicy; }
  reviewRequestsEnabled() { return this.$props.reviewRequestsEnabled; }
  reviewRequestDelayDays() { return this.$props.reviewRequestDelayDays; }
  reviewRequestExpiryDays() { return this.$props.reviewRequestExpiryDays; }
  reviewEditWindowHours() { return this.$props.reviewEditWindowHours; }
  questionEditWindowHours() { return this.$props.questionEditWindowHours; }
  answerEditWindowHours() { return this.$props.answerEditWindowHours; }
  maxReviewMediaCount() { return this.$props.maxReviewMediaCount; }
  maxAnswersPerQuestion() { return this.$props.maxAnswersPerQuestion; }
  revision() { return this.$props.revision; }
  createdAt() { return this.$props.createdAt; }
  updatedAt() { return this.$props.updatedAt; }
}

@SubgraphReference()
export class RatingCriterionResolver extends ReviewsType<string, RatingCriterion> {
  async $preload() {
    const row = await this.$ctx.loaders.ratingCriterion.load(this.$props);
    if (!row || !row.isActive || row.deletedAt) throw new PreloadNotFoundError("Active rating criterion not found");
    return row;
  }
  id() { return this.encodeId(this.$props, GlobalIdEntity.ReviewRatingCriterion); }
  code() { return this.$get("code"); }
  defaultTitle() { return this.$get("defaultTitle"); }
  defaultDescription() { return this.$get("defaultDescription"); }
  async title() {
    const rows = await this.$ctx.loaders.ratingCriterionTranslations.load(this.$props);
    return rows.find((row) => row.locale === this.$ctx.locale)?.title ?? this.$get("defaultTitle");
  }
  async description() {
    const rows = await this.$ctx.loaders.ratingCriterionTranslations.load(this.$props);
    return rows.find((row) => row.locale === this.$ctx.locale)?.description ?? this.$get("defaultDescription");
  }
  weight() { return this.$get("weight"); }
  isRequired() { return this.$get("isRequired"); }
  isActive() { return this.$get("isActive"); }
  appliesToAllProducts() { return this.$get("appliesToAllProducts"); }
  sortIndex() { return this.$get("sortIndex"); }
  async translations() { return (await this.$ctx.loaders.ratingCriterionTranslations.load(this.$props)).map((row) => new RatingCriterionTranslationResolver(row, this.$ctx)); }
  async assignments() {
    const rows = await this.$ctx.loaders.ratingCriterionAssignments.load(this.$props);
    rows.forEach((row) => this.$ctx.loaders.ratingCriterionAssignment.prime(row.id, row));
    return rows.map((row) => new RatingCriterionAssignmentResolver(row.id, this.$ctx));
  }
  createdAt() { return this.$get("createdAt"); }
  updatedAt() { return this.$get("updatedAt"); }
}
export class RatingCriterionTranslationResolver extends ReviewsType<RatingCriterionTranslation> {
  locale() { return this.$props.locale; }
  title() { return this.$props.title; }
  description() { return this.$props.description; }
}
@SubgraphReference()
export class RatingCriterionAssignmentResolver extends ReviewsType<string, RatingCriterionAssignment> {
  async $preload() { const row = await this.$ctx.loaders.ratingCriterionAssignment.load(this.$props); if (!row) throw new PreloadNotFoundError("Rating criterion assignment not found"); return row; }
  id() { return this.encodeId(this.$props, GlobalIdEntity.ReviewRatingCriterionAssignment); }
  async criterion() { return this.resolvers.ratingCriterion(await this.$get("criterionId")); }
  targetType() { return this.$get("targetType"); }
  async target() { const row = await this.$preload(); return row.targetType === "PRODUCT" ? productReference(row.targetId) : categoryReference(row.targetId); }
  async isRequired() { const value = await this.$get("isRequiredOverride"); return value ?? (await this.resolvers.ratingCriterion(await this.$get("criterionId"))).isRequired(); }
  async sortIndex() { const value = await this.$get("sortIndexOverride"); return value ?? (await this.resolvers.ratingCriterion(await this.$get("criterionId"))).sortIndex(); }
  createdAt() { return this.$get("createdAt"); }
}
