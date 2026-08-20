import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import type { CustomerConsentEvent } from "../../repositories/models/index.js";
import { CustomersType } from "./CustomersType.js";

export class CustomerConsentEventResolver extends CustomersType<string, CustomerConsentEvent> {
  async $preload() {
    const event = await this.$ctx.loaders.consentEvent.load(this.$props);
    if (!event) {
      throw new PreloadNotFoundError(`Customer consent event with ID ${this.$props} not found`);
    }
    return event;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.CustomerConsentEvent);
  }

  async customer() {
    return this.resolvers.customer(await this.$get("customerId"));
  }

  async consent() {
    return this.resolvers.consent(await this.$get("consentId"));
  }

  channel() {
    return this.$get("channel");
  }

  previousState() {
    return this.$get("previousState");
  }

  newState() {
    return this.$get("newState");
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

  actorType() {
    return this.$get("actorType");
  }

  actorId() {
    return this.$get("actorId");
  }

  requestId() {
    return this.$get("requestId");
  }

  idempotencyKey() {
    return this.$get("idempotencyKey");
  }

  evidence() {
    return this.$get("evidence");
  }

  occurredAt() {
    return this.$get("occurredAt");
  }
}
