import type { CustomerTaxIdentifierConnectionInput } from "../../repositories/tax/CustomerTaxIdentifierRepository.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export class CustomerTaxIdentifierConnectionResolver extends BaseConnectionResolver<CustomerTaxIdentifierConnectionInput> {
  $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel.repository.taxIdentifier.getConnection(this.$props);
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.taxIdentifier(nodeId);
  }
}
