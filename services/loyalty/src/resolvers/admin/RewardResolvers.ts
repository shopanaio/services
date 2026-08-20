import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError, SubgraphReference } from "@shopana/type-resolver";
import type {
  RewardEntitlement,
  RewardEntitlementEvent,
  TierRewardBenefit,
} from "../../repositories/models/index.js";
import { LoyaltyType } from "./LoyaltyType.js";

@SubgraphReference()
export class LoyaltyRewardEntitlementResolver extends LoyaltyType<string, RewardEntitlement> {
  async $preload() {
    const row = await this.$ctx.loaders.rewardEntitlement.load(this.$props);
    if (!row)
      throw new PreloadNotFoundError(`Loyalty reward entitlement ${this.$props} was not found`);
    return row;
  }
  id() {
    return this.encodeId(this.$props, GlobalIdEntity.LoyaltyRewardEntitlement);
  }
  async definition() {
    return this.resolvers.rewardDefinition((await this.$get("rewardDefinitionId"))!);
  }
  async account() {
    return this.resolvers.account((await this.$get("accountId"))!);
  }
  async sourceEventFact() {
    const id = await this.$get("sourceEventFactId");
    return id ? this.resolvers.eventFact(id) : null;
  }
  async issuanceTransaction() {
    const id = await this.$get("issuanceTransactionId");
    return id ? this.resolvers.transaction(id) : null;
  }
  async monetaryTransaction() {
    const id = await this.$get("monetaryTransactionId");
    return id ? this.resolvers.monetaryTransaction(id) : null;
  }
  status() {
    return this.$get("status");
  }
  configurationSchemaVersion() {
    return this.$get("configurationSchemaVersion");
  }
  configurationSnapshot() {
    return this.$get("configurationSnapshot");
  }
  async quantity() {
    return String(await this.$get("quantity"));
  }
  validFrom() {
    return this.$get("validFrom");
  }
  validTo() {
    return this.$get("validTo");
  }
  async reservedForCheckoutId() {
    const id = await this.$get("reservedForCheckoutId");
    return id ? this.encodeId(id, GlobalIdEntity.Checkout) : null;
  }
  async redeemedOrderId() {
    const id = await this.$get("redeemedOrderId");
    return id ? this.encodeId(id, GlobalIdEntity.Order) : null;
  }
  externalReference() {
    return this.$get("externalReference");
  }
  issuedAt() {
    return this.$get("issuedAt");
  }
  reservedAt() {
    return this.$get("reservedAt");
  }
  redeemedAt() {
    return this.$get("redeemedAt");
  }
  expiredAt() {
    return this.$get("expiredAt");
  }
  revokedAt() {
    return this.$get("revokedAt");
  }
  revision() {
    return this.$get("revision");
  }
  async events() {
    return Promise.all(
      (await this.$ctx.loaders.rewardEntitlementEvents.load(this.$props)).map(({ id }) =>
        this.resolvers.rewardEntitlementEvent(id),
      ),
    );
  }
  updatedAt() {
    return this.$get("updatedAt");
  }
}

@SubgraphReference()
export class LoyaltyRewardEntitlementEventResolver extends LoyaltyType<
  string,
  RewardEntitlementEvent
> {
  async $preload() {
    const row = await this.$ctx.loaders.rewardEntitlementEvent.load(this.$props);
    if (!row)
      throw new PreloadNotFoundError(
        `Loyalty reward entitlement event ${this.$props} was not found`,
      );
    return row;
  }
  id() {
    return this.encodeId(this.$props, GlobalIdEntity.LoyaltyRewardEntitlementEvent);
  }
  async entitlement() {
    return this.resolvers.rewardEntitlement((await this.$get("entitlementId"))!);
  }
  eventType() {
    return this.$get("eventType");
  }
  previousStatus() {
    return this.$get("previousStatus");
  }
  status() {
    return this.$get("status");
  }
  idempotencyKey() {
    return this.$get("idempotencyKey");
  }
  actorType() {
    return this.$get("actorType");
  }
  async actorId() {
    const id = await this.$get("actorId");
    if (!id) return null;
    return this.encodeId(
      id,
      (await this.$get("actorType")) === "CUSTOMER" ? GlobalIdEntity.Customer : GlobalIdEntity.User,
    );
  }
  reasonCode() {
    return this.$get("reasonCode");
  }
  occurredAt() {
    return this.$get("occurredAt");
  }
  metadata() {
    return this.$get("metadata");
  }
  createdAt() {
    return this.$get("createdAt");
  }
}

@SubgraphReference()
export class LoyaltyTierRewardBenefitResolver extends LoyaltyType<string, TierRewardBenefit> {
  async $preload() {
    const row = await this.$ctx.loaders.tierRewardBenefit.load(this.$props);
    if (!row)
      throw new PreloadNotFoundError(`Loyalty tier reward benefit ${this.$props} was not found`);
    return row;
  }
  id() {
    return this.encodeId(this.$props, GlobalIdEntity.LoyaltyTierRewardBenefit);
  }
  async tier() {
    return this.resolvers.tier((await this.$get("tierId"))!);
  }
  async rewardDefinition() {
    return this.resolvers.rewardDefinition((await this.$get("rewardDefinitionId"))!);
  }
  grantPolicySchemaVersion() {
    return this.$get("grantPolicySchemaVersion");
  }
  grantPolicy() {
    return this.$get("grantPolicy");
  }
  createdAt() {
    return this.$get("createdAt");
  }
}
