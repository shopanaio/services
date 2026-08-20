import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import type { CustomerConsent } from "../../repositories/models/index.js";
import type { CustomerConsentEventRelayInput } from "../../repositories/consent/CustomerConsentRepository.js";
import { CustomersType } from "./CustomersType.js";

export class CustomerConsentResolver extends CustomersType<string, CustomerConsent> {
  async $preload() {
    const consent = await this.$ctx.loaders.consent.load(this.$props);
    if (!consent) {
      throw new PreloadNotFoundError(`Customer consent with ID ${this.$props} not found`);
    }
    return consent;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.CustomerConsent);
  }

  async customer() {
    return this.resolvers.customer(await this.$get("customerId"));
  }

  channel() {
    return this.$get("channel");
  }

  state() {
    return this.$get("state");
  }

  optInLevel() {
    return this.$get("optInLevel");
  }

  contactPoint() {
    return this.$get("contactPoint");
  }

  source() {
    return this.$get("source");
  }

  sourceLocationId() {
    return this.$get("sourceLocationId");
  }

  sourceIp() {
    return this.$get("sourceIp");
  }

  userAgent() {
    return this.$get("userAgent");
  }

  consentedAt() {
    return this.$get("consentedAt");
  }

  withdrawnAt() {
    return this.$get("withdrawnAt");
  }

  createdAt() {
    return this.$get("createdAt");
  }

  updatedAt() {
    return this.$get("updatedAt");
  }

  events(args: CustomerConsentEventRelayInput) {
    return this.resolvers.consentEventConnection({
      ...args,
      consentId: this.$props,
    });
  }
}
