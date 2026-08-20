import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError, SubgraphReference } from "@shopana/type-resolver";
import type {
  RatingCriterion,
  RatingCriterionAssignment,
  RatingCriterionTranslation,
  StoreConfiguration,
} from "../../repositories/models/index.js";
import { ReviewsType } from "./ReviewsType.js";
import { categoryReference, productReference } from "./references.js";

@SubgraphReference()
export class StoreConfigurationResolver extends ReviewsType<StoreConfiguration> {
  id() {
    return this.encodeId(this.$props.id, GlobalIdEntity.ReviewStoreConfiguration);
  }

  reviewsEnabled() {
    return this.$props.reviewsEnabled;
  }
  questionsEnabled() {
    return this.$props.questionsEnabled;
  }
  guestReviewsEnabled() {
    return this.$props.guestReviewsEnabled;
  }
  guestQuestionsEnabled() {
    return this.$props.guestQuestionsEnabled;
  }
  customerAnswersEnabled() {
    return this.$props.customerAnswersEnabled;
  }
  verifiedPurchaseRequired() {
    return this.$props.verifiedPurchaseRequired;
  }
  reviewModerationMode() {
    return this.$props.reviewModerationMode;
  }
  questionModerationMode() {
    return this.$props.questionModerationMode;
  }
  answerModerationMode() {
    return this.$props.answerModerationMode;
  }
  reviewDuplicatePolicy() {
    return this.$props.reviewDuplicatePolicy;
  }
  reviewRequestsEnabled() {
    return this.$props.reviewRequestsEnabled;
  }
  reviewRequestDelayDays() {
    return this.$props.reviewRequestDelayDays;
  }
  reviewRequestExpiryDays() {
    return this.$props.reviewRequestExpiryDays;
  }
  reviewEditWindowHours() {
    return this.$props.reviewEditWindowHours;
  }
  questionEditWindowHours() {
    return this.$props.questionEditWindowHours;
  }
  answerEditWindowHours() {
    return this.$props.answerEditWindowHours;
  }
  maxReviewMediaCount() {
    return this.$props.maxReviewMediaCount;
  }
  maxAnswersPerQuestion() {
    return this.$props.maxAnswersPerQuestion;
  }
  revision() {
    return this.$props.revision;
  }
  createdAt() {
    return this.$props.createdAt;
  }
  updatedAt() {
    return this.$props.updatedAt;
  }
}

@SubgraphReference()
export class RatingCriterionResolver extends ReviewsType<string, RatingCriterion> {
  async $preload() {
    const criterion = await this.$ctx.loaders.ratingCriterion.load(this.$props);
    if (!criterion) {
      throw new PreloadNotFoundError(`Review rating criterion with ID ${this.$props} not found`);
    }
    return criterion;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.ReviewRatingCriterion);
  }
  code() {
    return this.$get("code");
  }
  defaultTitle() {
    return this.$get("defaultTitle");
  }
  defaultDescription() {
    return this.$get("defaultDescription");
  }
  weight() {
    return this.$get("weight");
  }
  isRequired() {
    return this.$get("isRequired");
  }
  isActive() {
    return this.$get("isActive");
  }
  appliesToAllProducts() {
    return this.$get("appliesToAllProducts");
  }
  sortIndex() {
    return this.$get("sortIndex");
  }
  createdAt() {
    return this.$get("createdAt");
  }
  updatedAt() {
    return this.$get("updatedAt");
  }
  deletedAt() {
    return this.$get("deletedAt");
  }

  async translations() {
    const rows = await this.$ctx.loaders.ratingCriterionTranslations.load(this.$props);
    return rows.map((row) => new RatingCriterionTranslationResolver(row, this.$ctx));
  }

  async assignments() {
    const rows = await this.$ctx.loaders.ratingCriterionAssignments.load(this.$props);
    for (const row of rows) {
      this.$ctx.loaders.ratingCriterionAssignment.prime(row.id, row);
    }
    return rows.map((row) => new RatingCriterionAssignmentResolver(row.id, this.$ctx));
  }
}

export class RatingCriterionTranslationResolver extends ReviewsType<RatingCriterionTranslation> {
  locale() {
    return this.$props.locale;
  }
  title() {
    return this.$props.title;
  }
  description() {
    return this.$props.description;
  }
  createdAt() {
    return this.$props.createdAt;
  }
  updatedAt() {
    return this.$props.updatedAt;
  }
}

@SubgraphReference()
export class RatingCriterionAssignmentResolver extends ReviewsType<
  string,
  RatingCriterionAssignment
> {
  async $preload() {
    const assignment = await this.$ctx.loaders.ratingCriterionAssignment.load(this.$props);
    if (!assignment) {
      throw new PreloadNotFoundError(
        `Review rating criterion assignment with ID ${this.$props} not found`,
      );
    }
    return assignment;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.ReviewRatingCriterionAssignment);
  }

  async criterion() {
    return this.resolvers.ratingCriterion(await this.$get("criterionId"));
  }

  targetType() {
    return this.$get("targetType");
  }

  async targetId() {
    const assignment = await this.$preload();
    return this.encodeId(
      assignment.targetId,
      assignment.targetType === "PRODUCT" ? GlobalIdEntity.Product : GlobalIdEntity.Category,
    );
  }

  async target() {
    const assignment = await this.$preload();
    return assignment.targetType === "PRODUCT"
      ? productReference(assignment.targetId)
      : categoryReference(assignment.targetId);
  }

  isRequiredOverride() {
    return this.$get("isRequiredOverride");
  }
  sortIndexOverride() {
    return this.$get("sortIndexOverride");
  }
  createdAt() {
    return this.$get("createdAt");
  }
}
