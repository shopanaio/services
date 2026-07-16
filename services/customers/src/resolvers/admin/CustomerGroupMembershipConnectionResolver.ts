import type { CustomerGroupMembershipConnectionInput } from "../../repositories/classification/CustomerGroupRepository.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export class CustomerGroupMembershipConnectionResolver extends BaseConnectionResolver<CustomerGroupMembershipConnectionInput> {
  $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel.repository.group.getMembershipConnection(
      this.$props
    );
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.groupMembership(nodeId);
  }
}
