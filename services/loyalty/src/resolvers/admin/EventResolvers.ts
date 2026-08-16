import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError, SubgraphReference } from "@shopana/type-resolver";
import type { EarningRuleUsage, EventEvaluation, EventFact } from "../../repositories/models/index.js";
import { LoyaltyType } from "./LoyaltyType.js";

@SubgraphReference()
export class LoyaltyEventFactResolver extends LoyaltyType<string, EventFact> {
  async $preload() {
    const row = await this.$ctx.loaders.eventFact.load(this.$props);
    if (!row) throw new PreloadNotFoundError(`Loyalty event fact ${this.$props} was not found`);
    return row;
  }
  id() { return this.encodeId(this.$props, GlobalIdEntity.LoyaltyEventFact); }
  producer() { return this.$get("producer"); }
  externalEventId() { return this.$get("externalEventId"); }
  eventType() { return this.$get("eventType"); }
  subjectType() { return this.$get("subjectType"); }
  subjectId() { return this.$get("subjectId"); }
  async customerId() { const id = await this.$get("customerId"); return id ? this.encodeId(id, GlobalIdEntity.Customer) : null; }
  occurredAt() { return this.$get("occurredAt"); }
  payloadSchemaVersion() { return this.$get("payloadSchemaVersion"); }
  payloadHash() { return this.$get("payloadHash"); }
  payload() { return this.$get("payload"); }
  receivedAt() { return this.$get("receivedAt"); }
  async evaluations() {
    return Promise.all((await this.$ctx.loaders.eventEvaluationsByFact.load(this.$props))
      .map(({ id }) => this.resolvers.eventEvaluation(id)));
  }
}

@SubgraphReference()
export class LoyaltyEventEvaluationResolver extends LoyaltyType<string, EventEvaluation> {
  async $preload() {
    const row = await this.$ctx.loaders.eventEvaluation.load(this.$props);
    if (!row) throw new PreloadNotFoundError(`Loyalty event evaluation ${this.$props} was not found`);
    return row;
  }
  id() { return this.encodeId(this.$props, GlobalIdEntity.LoyaltyEventEvaluation); }
  async eventFact() { return this.resolvers.eventFact((await this.$get("eventFactId"))!); }
  async earningRule() { return this.resolvers.earningRule((await this.$get("earningRuleId"))!); }
  async account() { return this.resolvers.account((await this.$get("accountId"))!); }
  decision() { return this.$get("decision"); }
  reasonCode() { return this.$get("reasonCode"); }
  async pointsAwarded() { const value = await this.$get("pointsAwarded"); return value === null ? null : String(value); }
  async monetaryAmount() {
    const amountMinor = await this.$get("monetaryAmountMinor");
    const currencyCode = await this.$get("currencyCode");
    return amountMinor === null || currencyCode === null ? null : { amountMinor: String(amountMinor), currencyCode };
  }
  async transaction() { const id = await this.$get("transactionId"); return id ? this.resolvers.transaction(id) : null; }
  resultSchemaVersion() { return this.$get("resultSchemaVersion"); }
  result() { return this.$get("result"); }
  evaluatedAt() { return this.$get("evaluatedAt"); }
}

@SubgraphReference()
export class LoyaltyEarningRuleUsageResolver extends LoyaltyType<string, EarningRuleUsage> {
  async $preload() {
    const row = await this.$ctx.loaders.earningRuleUsageById.load(this.$props);
    if (!row) throw new PreloadNotFoundError(`Loyalty earning rule usage ${this.$props} was not found`);
    return row;
  }
  id() { return this.encodeId(this.$props, GlobalIdEntity.LoyaltyEarningRuleUsage); }
  async earningRule() { return this.resolvers.earningRule((await this.$get("earningRuleId"))!); }
  scopeKey() { return this.$get("scopeKey"); }
  windowStartedAt() { return this.$get("windowStartedAt"); }
  windowEndedAt() { return this.$get("windowEndedAt"); }
  async occurrenceCount() { return String(await this.$get("occurrenceCount")); }
  async pointsAwarded() { return String(await this.$get("pointsAwarded")); }
  monetaryAmounts() { return this.$get("monetaryAmounts"); }
  revision() { return this.$get("revision"); }
  updatedAt() { return this.$get("updatedAt"); }
}
