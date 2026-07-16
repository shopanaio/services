import type { CustomerTagAssignmentConnectionInput } from "../../repositories/classification/CustomerTagRepository.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export class CustomerTagAssignmentConnectionResolver extends BaseConnectionResolver<CustomerTagAssignmentConnectionInput> {
  $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel.repository.tag.getAssignmentConnection(this.$props);
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.tagAssignment(nodeId);
  }
}
