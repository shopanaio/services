import type { CustomerDataRequestRelayInput } from "../../repositories/lifecycle/CustomerLifecycleRepository.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export class CustomerDataRequestConnectionResolver extends BaseConnectionResolver<CustomerDataRequestRelayInput> {
  $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel.repository.lifecycle.getDataRequestConnection(
      this.$props
    );
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.dataRequest(nodeId);
  }
}
