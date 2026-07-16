import type {
  ReviewRequestEventRelayInput,
  ReviewRequestRelayInput,
} from "../../repositories/request/ReviewRequestRepository.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export class ReviewRequestConnectionResolver extends BaseConnectionResolver<ReviewRequestRelayInput> {
  $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel.repository.reviewRequest.getConnection(this.$props);
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.reviewRequest(nodeId);
  }
}

type ReviewRequestEventConnectionInput = ReviewRequestEventRelayInput & {
  reviewRequestId: string;
};

export class ReviewRequestEventConnectionResolver extends BaseConnectionResolver<ReviewRequestEventConnectionInput> {
  $preload(): Promise<ConnectionData> {
    const { reviewRequestId, ...args } = this.$props;
    return this.$ctx.kernel.repository.reviewRequest.getEventConnection(
      reviewRequestId,
      args
    );
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.reviewRequestEvent(nodeId);
  }
}
