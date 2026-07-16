import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError, SubgraphReference } from "@shopana/type-resolver";
import type {
  Review,
  ReviewMedia,
  ReviewRating,
  ReviewReply,
} from "../../repositories/models/index.js";
import type { ReviewReplyConnectionInput } from "../../repositories/review/ReviewReplyRepository.js";
import { ContentResolver } from "./ContentResolver.js";
import { ReviewReplyConnectionResolver } from "./ReviewConnectionResolver.js";
import { ReviewsType } from "./ReviewsType.js";
import {
  fileReference,
  productReference,
  variantReference,
} from "./references.js";

@SubgraphReference()
export class ReviewResolver extends ContentResolver<Review> {
  async $preload() {
    const review = await this.$ctx.loaders.review.load(this.$props);
    if (!review) {
      throw new PreloadNotFoundError(
        `Review with ID ${this.$props} not found`
      );
    }
    return review;
  }

  async product() { return productReference(await this.$get("productId")); }
  async variant() { return variantReference(await this.$get("variantId")); }

  async orderId() {
    const id = await this.$get("orderId");
    return id ? this.encodeId(id, GlobalIdEntity.Order) : null;
  }

  async orderLineId() {
    const id = await this.$get("orderLineId");
    return id ? this.encodeId(id, GlobalIdEntity.OrderLine) : null;
  }

  rating() { return this.$get("rating"); }
  verificationStatus() { return this.$get("verificationStatus"); }
  verificationMethod() { return this.$get("verificationMethod"); }
  verifiedAt() { return this.$get("verifiedAt"); }
  async isVerifiedPurchase() { return (await this.$get("verificationStatus")) === "VERIFIED"; }
  isIncentivized() { return this.$get("isIncentivized"); }
  incentiveDisclosure() { return this.$get("incentiveDisclosure"); }

  async ratings() {
    const rows = await this.$ctx.loaders.reviewRatings.load(this.$props);
    return rows.map((row) => new ReviewRatingResolver(row, this.$ctx));
  }

  async media() {
    const rows = await this.$ctx.loaders.reviewMedia.load(this.$props);
    for (const row of rows) this.$ctx.loaders.reviewMediaItem.prime(row.id, row);
    return rows.map((row) => new ReviewMediaResolver(row.id, this.$ctx));
  }

  replies(args: ReviewReplyConnectionInput) {
    return new ReviewReplyConnectionResolver(
      { ...args, reviewId: this.$props },
      this.$ctx
    );
  }
}

export class ReviewRatingResolver extends ReviewsType<ReviewRating> {
  criterion() { return this.resolvers.ratingCriterion(this.$props.criterionId); }
  value() { return this.$props.value; }
  createdAt() { return this.$props.createdAt; }
  updatedAt() { return this.$props.updatedAt; }
}

@SubgraphReference()
export class ReviewMediaResolver extends ReviewsType<string, ReviewMedia> {
  async $preload() {
    const media = await this.$ctx.loaders.reviewMediaItem.load(this.$props);
    if (!media) {
      throw new PreloadNotFoundError(
        `Review media with ID ${this.$props} not found`
      );
    }
    return media;
  }

  id() { return this.encodeId(this.$props, GlobalIdEntity.ReviewMedia); }
  async review() { return this.resolvers.review(await this.$get("reviewId")); }
  async file() { return fileReference(await this.$get("fileId")); }
  sortIndex() { return this.$get("sortIndex"); }
  caption() { return this.$get("caption"); }
  status() { return this.$get("status"); }
  moderationNote() { return this.$get("moderationNote"); }
  moderatedByPrincipalId() { return this.$get("moderatedByPrincipalId"); }
  moderatedAt() { return this.$get("moderatedAt"); }
  createdAt() { return this.$get("createdAt"); }
  updatedAt() { return this.$get("updatedAt"); }
}

@SubgraphReference()
export class ReviewReplyResolver extends ContentResolver<ReviewReply> {
  async $preload() {
    const reply = await this.$ctx.loaders.reviewReply.load(this.$props);
    if (!reply) {
      throw new PreloadNotFoundError(
        `Review reply with ID ${this.$props} not found`
      );
    }
    return reply;
  }

  async review() { return this.resolvers.review(await this.$get("reviewId")); }
  isOfficial() { return this.$get("isOfficial"); }
  sortIndex() { return this.$get("sortIndex"); }
}
