import type { CustomerAddressConnectionInput } from "../../repositories/address/CustomerAddressRepository.js";
import type { CustomerDataRequestConnectionInput } from "../../repositories/lifecycle/CustomerLifecycleRepository.js";
import type { CustomerTaxExemptionConnectionInput } from "../../repositories/tax/CustomerTaxExemptionRepository.js";
import type { CustomerTaxIdentifierConnectionInput } from "../../repositories/tax/CustomerTaxIdentifierRepository.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export class StorefrontCustomerAddressConnectionResolver extends BaseConnectionResolver<CustomerAddressConnectionInput> {
  $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel.repository.address.getConnection(this.$props);
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.address(nodeId);
  }
}

export class StorefrontCustomerDataRequestConnectionResolver extends BaseConnectionResolver<CustomerDataRequestConnectionInput> {
  $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel.repository.lifecycle.getOwnedDataRequestConnection(this.$props);
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.dataRequest(nodeId);
  }
}

export class StorefrontCustomerTaxIdentifierConnectionResolver extends BaseConnectionResolver<CustomerTaxIdentifierConnectionInput> {
  $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel.repository.taxIdentifier.getConnection(this.$props);
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.taxIdentifier(nodeId);
  }
}

export class StorefrontCustomerTaxExemptionConnectionResolver extends BaseConnectionResolver<CustomerTaxExemptionConnectionInput> {
  $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel.repository.taxExemption.getConnection(this.$props);
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.taxExemption(nodeId);
  }
}
