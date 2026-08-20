import type { CustomerMergeRelayInput } from "../../repositories/lifecycle/CustomerLifecycleRepository.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export class CustomerMergeConnectionResolver extends BaseConnectionResolver<CustomerMergeRelayInput> {
  $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel.repository.lifecycle.getMergeConnection(this.$props);
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.merge(nodeId);
  }
}
