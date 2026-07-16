import type { CustomerConsentEventConnectionInput } from "../../repositories/consent/CustomerConsentRepository.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export class CustomerConsentEventConnectionResolver extends BaseConnectionResolver<CustomerConsentEventConnectionInput> {
  $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel.repository.consent.getEventConnection(this.$props);
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.consentEvent(nodeId);
  }
}
