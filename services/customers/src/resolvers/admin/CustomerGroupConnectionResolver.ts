import type { CustomerGroupRelayInput } from "../../repositories/classification/CustomerGroupRepository.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export class CustomerGroupConnectionResolver extends BaseConnectionResolver<CustomerGroupRelayInput> {
  $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel.repository.group.getConnection(this.$props);
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.group(nodeId);
  }
}
