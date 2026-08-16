import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError, SubgraphReference } from "@shopana/type-resolver";
import type {
  Account,
  AccountBalance,
  TierMembership,
  TierMembershipEvent,
} from "../../repositories/models/index.js";
import { LoyaltyType } from "./LoyaltyType.js";
import type { LoyaltyAccountTransactionsArgs } from "./generated/types.js";
import { normalizeTransactionConnection } from "./inputNormalization.js";

@SubgraphReference()
export class LoyaltyAccountResolver extends LoyaltyType<string, Account> {
  async $preload() {
    const row = await this.$ctx.loaders.account.load(this.$props);
    if (!row) throw new PreloadNotFoundError(`Loyalty account ${this.$props} was not found`);
    return row;
  }
  id() { return this.encodeId(this.$props, GlobalIdEntity.LoyaltyAccount); }
  async program() { return this.resolvers.program((await this.$get("programId"))!); }
  async customerId() { return this.encodeId((await this.$get("customerId"))!, GlobalIdEntity.Customer); }
  async customer() { return { __typename: "Customer" as const, id: await this.customerId() }; }
  status() { return this.$get("status"); }
  revision() { return this.$get("revision"); }
  balance() { return new LoyaltyAccountBalanceResolver(this.$props, this.$ctx); }
  async tierMembership() {
    const membership = await this.$ctx.loaders.activeTierMembership.load(this.$props);
    return membership ? this.resolvers.tierMembership(membership.id) : null;
  }
  async mergedIntoAccount() {
    const id = await this.$get("mergedIntoAccountId");
    return id ? this.resolvers.account(id) : null;
  }
  suspendedReason() { return this.$get("suspendedReason"); }
  openedAt() { return this.$get("openedAt"); }
  suspendedAt() { return this.$get("suspendedAt"); }
  closedAt() { return this.$get("closedAt"); }
  updatedAt() { return this.$get("updatedAt"); }
  async expiringPoints(args: { first?: number | null }) {
    const rows = await this.$ctx.loaders.expiringPoints.load(this.$props);
    return rows.slice(0, args.first ?? 20).map((row) => ({
      lotId: this.encodeId(row.lotId, GlobalIdEntity.LoyaltyPointLot),
      points: row.remainingPoints.toString(),
      expiresAt: row.expiresAt,
    }));
  }
  transactions(args: LoyaltyAccountTransactionsArgs) {
    return this.resolvers.transactionConnection(normalizeTransactionConnection(args, this.$props));
  }
}

export class LoyaltyAccountBalanceResolver extends LoyaltyType<string, AccountBalance> {
  async $preload() {
    const row = await this.$ctx.loaders.accountBalance.load(this.$props);
    if (!row) throw new PreloadNotFoundError(`Loyalty account balance ${this.$props} was not found`);
    return row;
  }
  async pendingPoints() { return String(await this.$get("pendingPoints")); }
  async availablePoints() { return String(await this.$get("availablePoints")); }
  async reservedPoints() { return String(await this.$get("reservedPoints")); }
  async debtPoints() { return String(await this.$get("debtPoints")); }
  async lifetimeEarnedPoints() { return String(await this.$get("lifetimeEarnedPoints")); }
  async lifetimeRedeemedPoints() { return String(await this.$get("lifetimeRedeemedPoints")); }
  async lifetimeExpiredPoints() { return String(await this.$get("lifetimeExpiredPoints")); }
  async lifetimeAdjustedPoints() { return String(await this.$get("lifetimeAdjustedPoints")); }
  revision() { return this.$get("revision"); }
  updatedAt() { return this.$get("updatedAt"); }
}

@SubgraphReference()
export class LoyaltyTierMembershipResolver extends LoyaltyType<string, TierMembership> {
  async $preload() {
    const row = await this.$ctx.loaders.tierMembership.load(this.$props);
    if (!row) throw new PreloadNotFoundError(`Loyalty tier membership ${this.$props} was not found`);
    return row;
  }
  id() { return this.encodeId(this.$props, GlobalIdEntity.LoyaltyTierMembership); }
  async account() { return this.resolvers.account((await this.$get("accountId"))!); }
  async tier() { return this.resolvers.tier((await this.$get("tierId"))!); }
  status() { return this.$get("status"); }
  evaluationPeriodStartedAt() { return this.$get("evaluationPeriodStartedAt"); }
  evaluationPeriodEndedAt() { return this.$get("evaluationPeriodEndedAt"); }
  qualifiedAt() { return this.$get("qualifiedAt"); }
  effectiveFrom() { return this.$get("effectiveFrom"); }
  effectiveTo() { return this.$get("effectiveTo"); }
  revision() { return this.$get("revision"); }
  async events() { return Promise.all((await this.$ctx.loaders.tierMembershipEvents.load(this.$props)).map(({ id }) => this.resolvers.tierMembershipEvent(id))); }
  createdAt() { return this.$get("createdAt"); }
  updatedAt() { return this.$get("updatedAt"); }
}

@SubgraphReference()
export class LoyaltyTierMembershipEventResolver extends LoyaltyType<string, TierMembershipEvent> {
  async $preload() {
    const row = await this.$ctx.loaders.tierMembershipEvent.load(this.$props);
    if (!row) throw new PreloadNotFoundError(`Loyalty tier membership event ${this.$props} was not found`);
    return row;
  }
  id() { return this.encodeId(this.$props, GlobalIdEntity.LoyaltyTierMembershipEvent); }
  async account() { return this.resolvers.account((await this.$get("accountId"))!); }
  async membership() { return this.resolvers.tierMembership((await this.$get("membershipId"))!); }
  async previousTier() { const id = await this.$get("previousTierId"); return id ? this.resolvers.tier(id) : null; }
  async tier() { return this.resolvers.tier((await this.$get("tierId"))!); }
  eventType() { return this.$get("eventType"); }
  evaluationRevision() { return this.$get("evaluationRevision"); }
  reasonCode() { return this.$get("reasonCode"); }
  occurredAt() { return this.$get("occurredAt"); }
  metadata() { return this.$get("metadata"); }
  createdAt() { return this.$get("createdAt"); }
}
