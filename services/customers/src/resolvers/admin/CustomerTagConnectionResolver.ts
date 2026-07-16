import type { CustomerTagRelayInput } from "../../repositories/classification/CustomerTagRepository.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export class CustomerTagConnectionResolver extends BaseConnectionResolver<CustomerTagRelayInput> {
  $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel.repository.tag.getConnection(this.$props);
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.tag(nodeId);
  }
}
