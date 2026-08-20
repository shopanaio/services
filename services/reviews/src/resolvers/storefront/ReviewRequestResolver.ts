import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError, SubgraphReference } from "@shopana/type-resolver";
import type { ReviewRequest, ReviewRequestEvent } from "../../repositories/models/index.js";
import type { ReviewRequestEventRelayInput } from "../../repositories/request/ReviewRequestRepository.js";
import { ReviewRequestEventConnectionResolver } from "./ReviewRequestConnectionResolver.js";
import { ReviewsType } from "./ReviewsType.js";
import { customerReference, productReference, variantReference } from "./references.js";

@SubgraphReference()
export class ReviewRequestResolver extends ReviewsType<string, ReviewRequest> {
  async $preload() {
    const row = await this.$ctx.loaders.reviewRequest.load(this.$props);
    if (!row || row.customerId !== this.$ctx.customer?.id)
      throw new PreloadNotFoundError("Review request not found");
    return row;
  }
  id() {
    return this.encodeId(this.$props, GlobalIdEntity.ReviewRequest);
  }
  async customer() {
    return customerReference(await this.$get("customerId"))!;
  }
  async product() {
    return productReference(await this.$get("productId"));
  }
  async variant() {
    return variantReference(await this.$get("variantId"));
  }
  async review() {
    const id = await this.$get("reviewId");
    return id ? this.resolvers.review(id) : null;
  }
  channel() {
    return this.$get("channel");
  }
  status() {
    return this.$get("status");
  }
  locale() {
    return this.$get("locale");
  }
  attemptCount() {
    return this.$get("attemptCount");
  }
  scheduledAt() {
    return this.$get("scheduledAt");
  }
  sentAt() {
    return this.$get("sentAt");
  }
  deliveredAt() {
    return this.$get("deliveredAt");
  }
  openedAt() {
    return this.$get("openedAt");
  }
  submittedAt() {
    return this.$get("submittedAt");
  }
  expiresAt() {
    return this.$get("expiresAt");
  }
  events(args: ReviewRequestEventRelayInput) {
    return new ReviewRequestEventConnectionResolver(
      { ...args, reviewRequestId: this.$props },
      this.$ctx,
    );
  }
  createdAt() {
    return this.$get("createdAt");
  }
  updatedAt() {
    return this.$get("updatedAt");
  }
}
@SubgraphReference()
export class ReviewRequestEventResolver extends ReviewsType<string, ReviewRequestEvent> {
  async $preload() {
    const row = await this.$ctx.loaders.reviewRequestEvent.load(this.$props);
    if (!row) throw new PreloadNotFoundError("Review request event not found");
    const request = await this.$ctx.loaders.reviewRequest.load(row.reviewRequestId);
    if (!request || request.customerId !== this.$ctx.customer?.id)
      throw new PreloadNotFoundError("Review request event not found");
    return row;
  }
  id() {
    return this.encodeId(this.$props, GlobalIdEntity.ReviewRequestEvent);
  }
  async reviewRequest() {
    return this.resolvers.reviewRequest(await this.$get("reviewRequestId"));
  }
  type() {
    return this.$get("type");
  }
  occurredAt() {
    return this.$get("occurredAt");
  }
  createdAt() {
    return this.$get("createdAt");
  }
}
