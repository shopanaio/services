import type { CustomerConnectionInput } from "../../repositories/customer/CustomerRepository.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export class CustomerConnectionResolver extends BaseConnectionResolver<CustomerConnectionInput> {
  $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel.repository.customer.getConnection(this.$props);
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.customer(nodeId);
  }
}
