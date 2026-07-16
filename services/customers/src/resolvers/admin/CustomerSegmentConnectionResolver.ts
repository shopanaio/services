import type { CustomerSegmentRelayInput } from "../../repositories/classification/CustomerSegmentRepository.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export class CustomerSegmentConnectionResolver extends BaseConnectionResolver<CustomerSegmentRelayInput> {
  $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel.repository.segment.getConnection(this.$props);
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.segment(nodeId);
  }
}
