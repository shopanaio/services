import type { CustomerTaxExemptionConnectionInput } from "../../repositories/tax/CustomerTaxExemptionRepository.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export class CustomerTaxExemptionConnectionResolver extends BaseConnectionResolver<CustomerTaxExemptionConnectionInput> {
  $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel.repository.taxExemption.getConnection(this.$props);
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.taxExemption(nodeId);
  }
}
