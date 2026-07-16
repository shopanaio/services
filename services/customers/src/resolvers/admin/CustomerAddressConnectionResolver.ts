import type { CustomerAddressConnectionInput } from "../../repositories/address/CustomerAddressRepository.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export class CustomerAddressConnectionResolver extends BaseConnectionResolver<CustomerAddressConnectionInput> {
  $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel.repository.address.getConnection(this.$props);
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.address(nodeId);
  }
}
