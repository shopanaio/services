import type { RatingCriterionRelayInput } from "../../repositories/configuration/ConfigurationRepository.js";
import type { ReviewRequestRelayInput } from "../../repositories/request/ReviewRequestRepository.js";
import { ApplicableRatingCriterionConnectionResolver } from "./ConfigurationConnectionResolver.js";
import {
  ProductQuestionConnectionResolver,
  type StorefrontQuestionConnectionInput,
} from "./QuestionConnectionResolver.js";
import {
  ReviewConnectionResolver,
  type StorefrontReviewConnectionInput,
} from "./ReviewConnectionResolver.js";
import { ReviewRequestConnectionResolver } from "./ReviewRequestConnectionResolver.js";
import { ReviewsType } from "./ReviewsType.js";
import { ProductQuestionSummaryResolver, ProductReviewSummaryResolver } from "./SummaryResolver.js";

export class ProductFederationResolver extends ReviewsType<string> {
  reviews(args: StorefrontReviewConnectionInput) {
    this.requireReadPermission();
    return new ReviewConnectionResolver({ ...args, productId: this.$props }, this.$ctx);
  }
  async reviewSummary() {
    this.requireReadPermission();
    const row = await this.$ctx.loaders.productReviewSummary.load(this.$props);
    return new ProductReviewSummaryResolver(row ?? { productId: this.$props }, this.$ctx);
  }
  reviewRatingCriteria(args: RatingCriterionRelayInput) {
    this.requireReadPermission();
    return new ApplicableRatingCriterionConnectionResolver(
      { ...args, productId: this.$props },
      this.$ctx,
    );
  }
  questions(args: StorefrontQuestionConnectionInput) {
    this.requireReadPermission();
    return new ProductQuestionConnectionResolver({ ...args, productId: this.$props }, this.$ctx);
  }
  async questionSummary() {
    this.requireReadPermission();
    const row = await this.$ctx.loaders.productQuestionSummary.load(this.$props);
    return new ProductQuestionSummaryResolver(row ?? { productId: this.$props }, this.$ctx);
  }
}
export class ProductVariantFederationResolver extends ReviewsType<string> {
  reviews(args: StorefrontReviewConnectionInput) {
    this.requireReadPermission();
    return new ReviewConnectionResolver({ ...args, variantId: this.$props }, this.$ctx);
  }
  questions(args: StorefrontQuestionConnectionInput) {
    this.requireReadPermission();
    return new ProductQuestionConnectionResolver({ ...args, variantId: this.$props }, this.$ctx);
  }
}
export class CustomerFederationResolver extends ReviewsType<string> {
  private isViewer() {
    return this.$ctx.customer?.id === this.$props;
  }
  reviews(args: StorefrontReviewConnectionInput) {
    this.requireReadPermission();
    return new ReviewConnectionResolver(
      { ...args, customerId: this.$props, includeOwnedUnpublished: this.isViewer() },
      this.$ctx,
    );
  }
  productQuestions(args: StorefrontQuestionConnectionInput) {
    this.requireReadPermission();
    return new ProductQuestionConnectionResolver(
      { ...args, customerId: this.$props, includeOwnedUnpublished: this.isViewer() },
      this.$ctx,
    );
  }
  reviewRequests(args: ReviewRequestRelayInput) {
    this.requireReadPermission();
    const where: ReviewRequestRelayInput["where"] = this.isViewer()
      ? { customerId: { _eq: this.$props } }
      : { id: { _in: [] } };
    return new ReviewRequestConnectionResolver({ ...args, where }, this.$ctx);
  }
}
