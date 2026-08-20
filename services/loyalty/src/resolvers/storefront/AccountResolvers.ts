import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import type { Account, AccountBalance } from "../../repositories/models/index.js";
import type {
  LoyaltyAccountAvailableRewardsArgs,
  LoyaltyAccountTransactionsArgs,
} from "./generated/types.js";
import { LoyaltyStorefrontType } from "./LoyaltyStorefrontType.js";
import { StorefrontPresentationService } from "./StorefrontPresentation.js";

export class StorefrontLoyaltyAccountResolver extends LoyaltyStorefrontType<string, Account> {
  async $preload() {
    this.requireReadPermission();
    const row = await this.$ctx.loaders.account.load(this.$props);
    if (!row || row.customerId !== this.$ctx.customer?.id || row.status === "MERGED") {
      throw new PreloadNotFoundError(`Loyalty account ${this.$props} was not found`);
    }
    return row;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.LoyaltyAccount);
  }
  status() {
    return this.$get("status");
  }
  balance() {
    return new StorefrontLoyaltyBalanceResolver(this.$props, this.$ctx);
  }

  async tier() {
    const membership = await this.$ctx.loaders.activeTierMembership.load(this.$props);
    if (!membership) return null;
    const now = Date.parse(this.$ctx.loaders.effectiveAt);
    if (
      Date.parse(membership.effectiveFrom) > now ||
      (membership.effectiveTo !== null && Date.parse(membership.effectiveTo) <= now)
    )
      return null;
    const tier = await this.$ctx.loaders.tier.load(membership.tierId);
    return tier
      ? {
          code: tier.code,
          name: tier.name,
          rank: tier.rank,
          effectiveFrom: membership.effectiveFrom,
          effectiveTo: membership.effectiveTo,
        }
      : null;
  }

  opportunities() {
    return new StorefrontPresentationService(this.$ctx).account(this.$props);
  }

  availableRewards(args: LoyaltyAccountAvailableRewardsArgs) {
    return this.resolvers.availableRewardConnection({
      accountId: this.$props,
      effectiveAt: this.$ctx.loaders.effectiveAt,
      first: args.first ?? undefined,
      after: args.after ?? undefined,
    });
  }

  async upcomingExpirations() {
    const rows = await this.$ctx.loaders.expiringPoints.load(this.$props);
    const byDate = new Map<string, bigint>();
    for (const row of rows) {
      if (Date.parse(row.expiresAt) <= Date.parse(this.$ctx.loaders.effectiveAt)) continue;
      byDate.set(row.expiresAt, (byDate.get(row.expiresAt) ?? 0n) + row.remainingPoints);
    }
    return [...byDate.entries()].slice(0, 20).map(([expiresAt, points]) => ({
      points: points.toString(),
      expiresAt,
    }));
  }

  transactions(args: LoyaltyAccountTransactionsArgs) {
    return this.resolvers.transactionConnection({
      accountId: this.$props,
      first: args.first ?? undefined,
      after: args.after ?? undefined,
    });
  }
}

class StorefrontLoyaltyBalanceResolver extends LoyaltyStorefrontType<string, AccountBalance> {
  async $preload() {
    const row = await this.$ctx.loaders.accountBalance.load(this.$props);
    if (!row) throw new PreloadNotFoundError(`Loyalty balance ${this.$props} was not found`);
    return row;
  }
  async pendingPoints() {
    return String(await this.$get("pendingPoints"));
  }
  async availablePoints() {
    return String(await this.$get("availablePoints"));
  }
  async reservedPoints() {
    return String(await this.$get("reservedPoints"));
  }
  async debtPoints() {
    return String(await this.$get("debtPoints"));
  }
}
