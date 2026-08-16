import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import type { LoyaltyTransaction } from "../../repositories/models/index.js";
import { LoyaltyStorefrontType } from "./LoyaltyStorefrontType.js";
import { BaseStorefrontConnectionResolver } from "./connection/BaseConnectionResolver.js";

const VISIBLE_KINDS: readonly LoyaltyTransaction["kind"][] = [
  "EARN_PENDING",
  "REDEEM",
  "EXPIRE",
  "REVERSE_EARN",
  "RESTORE_REDEEM",
  "ADJUST_CREDIT",
  "ADJUST_DEBIT",
];

export interface StorefrontTransactionConnectionInput {
  accountId: string;
  first?: number;
  after?: string;
}

export class StorefrontTransactionConnectionResolver
  extends BaseStorefrontConnectionResolver<StorefrontTransactionConnectionInput>
{
  $preload() {
    return this.$ctx.kernel.repository.ledger.getConnection({
      first: this.$props.first,
      after: this.$props.after,
      where: { accountIds: [this.$props.accountId], kinds: VISIBLE_KINDS },
    });
  }
  protected createNodeResolver(id: string) { return this.resolvers.transaction(id); }
}

export class StorefrontLoyaltyTransactionResolver
  extends LoyaltyStorefrontType<string, LoyaltyTransaction>
{
  async $preload() {
    const row = await this.$ctx.loaders.transaction.load(this.$props);
    if (!row || !VISIBLE_KINDS.includes(row.kind)) {
      throw new PreloadNotFoundError(`Loyalty transaction ${this.$props} was not found`);
    }
    const account = await this.$ctx.loaders.account.load(row.accountId);
    if (!account || account.customerId !== this.$ctx.customer?.id) {
      throw new PreloadNotFoundError(`Loyalty transaction ${this.$props} was not found`);
    }
    return row;
  }

  id() { return this.encodeId(this.$props, GlobalIdEntity.LoyaltyTransaction); }
  async type() { return storefrontTransactionType((await this.$get("kind"))!); }
  async direction() { return storefrontTransactionDirection((await this.$get("kind"))!); }

  async points() {
    const metadata = (await this.$get("metadata"))!;
    const explicit = metadata.points ?? metadata.awardedPoints;
    if (typeof explicit === "string" && /^\d+$/.test(explicit)) return explicit;
    const entries = await this.$ctx.loaders.ledgerEntriesByTransaction.load(this.$props);
    const kind = (await this.$get("kind"))!;
    const positive = storefrontTransactionDirection(kind) === "CREDIT";
    return entries
      .filter(({ pointsDelta }) => positive ? pointsDelta > 0n : pointsDelta < 0n)
      .reduce((sum, { pointsDelta }) => sum + (pointsDelta < 0n ? -pointsDelta : pointsDelta), 0n)
      .toString();
  }

  description() { return this.$get("description"); }
  occurredAt() { return this.$get("occurredAt"); }
  effectiveAt() { return this.$get("effectiveAt"); }
  async expiresAt() {
    const value = (await this.$get("metadata"))!.expiresAt;
    if (typeof value === "string") return value;
    return (await this.$get("kind")) === "EXPIRE" ? this.$get("effectiveAt") : null;
  }
}

function storefrontTransactionType(kind: LoyaltyTransaction["kind"]) {
  if (kind === "EARN_PENDING") return "EARNED";
  if (kind === "REDEEM") return "REDEEMED";
  if (kind === "EXPIRE") return "EXPIRED";
  if (kind === "RESTORE_REDEEM") return "REFUNDED";
  return "ADJUSTED";
}

function storefrontTransactionDirection(kind: LoyaltyTransaction["kind"]) {
  return kind === "EARN_PENDING" || kind === "RESTORE_REDEEM" || kind === "ADJUST_CREDIT"
    ? "CREDIT"
    : "DEBIT";
}
