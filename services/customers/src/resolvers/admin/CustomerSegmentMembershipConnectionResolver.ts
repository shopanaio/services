import type { CustomerSegmentMembershipConnectionInput } from "../../repositories/classification/CustomerSegmentRepository.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export class CustomerSegmentMembershipConnectionResolver extends BaseConnectionResolver<CustomerSegmentMembershipConnectionInput> {
  $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel.repository.segment.getMembershipConnection(this.$props);
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.segmentMembership(nodeId);
  }
}
