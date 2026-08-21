import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError, SubgraphReference } from "@shopana/type-resolver";
import type {
  MonetaryCreditLot,
  MonetaryLedgerEntry,
  MonetaryLotAllocation,
  MonetaryTransaction,
  MonetaryWallet,
  MonetaryWalletBalance,
} from "../../repositories/models/index.js";
import { LoyaltyType } from "./LoyaltyType.js";

const money = (amountMinor: bigint, currencyCode: string) => ({
  amountMinor: amountMinor.toString(),
  currencyCode,
});

@SubgraphReference()
export class LoyaltyMonetaryWalletResolver extends LoyaltyType<string, MonetaryWallet> {
  async $preload() {
    const row = await this.$ctx.loaders.monetaryWallet.load(this.$props);
    if (!row)
      throw new PreloadNotFoundError(`Loyalty monetary wallet ${this.$props} was not found`);
    return row;
  }
  id() {
    return this.encodeId(this.$props, GlobalIdEntity.LoyaltyMonetaryWallet);
  }
  async program() {
    return this.resolvers.program((await this.$get("programId"))!);
  }
  async account() {
    return this.resolvers.account((await this.$get("accountId"))!);
  }
  walletType() {
    return this.$get("walletType");
  }
  currencyCode() {
    return this.$get("currencyCode");
  }
  status() {
    return this.$get("status");
  }
  async mergedIntoWallet() {
    const id = await this.$get("mergedIntoWalletId");
    return id ? this.resolvers.monetaryWallet(id) : null;
  }
  balance() {
    return new LoyaltyMonetaryWalletBalanceResolver(this.$props, this.$ctx);
  }
  async transactions(args: { first?: number | null }) {
    return Promise.all(
      (
        await this.$ctx.kernel.repository.wallet.listTransactions(
          this.$props,
          Math.max(1, Math.min(args.first ?? 100, 100)),
        )
      ).map(({ id }) => this.resolvers.monetaryTransaction(id)),
    );
  }
  async creditLots() {
    return Promise.all(
      (await this.$ctx.loaders.monetaryCreditLots.load(this.$props)).map(({ id }) =>
        this.resolvers.monetaryCreditLot(id),
      ),
    );
  }
  openedAt() {
    return this.$get("openedAt");
  }
  closedAt() {
    return this.$get("closedAt");
  }
  updatedAt() {
    return this.$get("updatedAt");
  }
}

export class LoyaltyMonetaryWalletBalanceResolver extends LoyaltyType<
  string,
  MonetaryWalletBalance
> {
  async $preload() {
    const row = await this.$ctx.loaders.monetaryWalletBalance.load(this.$props);
    if (!row)
      throw new PreloadNotFoundError(
        `Loyalty monetary wallet balance ${this.$props} was not found`,
      );
    return row;
  }
  private async currency() {
    const wallet = await this.$ctx.loaders.monetaryWallet.load(this.$props);
    if (!wallet)
      throw new PreloadNotFoundError(`Loyalty monetary wallet ${this.$props} was not found`);
    return wallet.currencyCode;
  }
  async pending() {
    return money((await this.$get("pendingAmountMinor"))!, await this.currency());
  }
  async available() {
    return money((await this.$get("availableAmountMinor"))!, await this.currency());
  }
  async reserved() {
    return money((await this.$get("reservedAmountMinor"))!, await this.currency());
  }
  async debt() {
    return money((await this.$get("debtAmountMinor"))!, await this.currency());
  }
  async lastTransaction() {
    const id = await this.$get("lastTransactionId");
    return id ? this.resolvers.monetaryTransaction(id) : null;
  }
  updatedAt() {
    return this.$get("updatedAt");
  }
}

@SubgraphReference()
export class LoyaltyMonetaryTransactionResolver extends LoyaltyType<string, MonetaryTransaction> {
  async $preload() {
    const row = await this.$ctx.loaders.monetaryTransaction.load(this.$props);
    if (!row)
      throw new PreloadNotFoundError(`Loyalty monetary transaction ${this.$props} was not found`);
    return row;
  }
  id() {
    return this.encodeId(this.$props, GlobalIdEntity.LoyaltyMonetaryTransaction);
  }
  async wallet() {
    return this.resolvers.monetaryWallet((await this.$get("walletId"))!);
  }
  async program() {
    return this.resolvers.program((await this.$get("programId"))!);
  }
  async programVersion() {
    const id = await this.$get("programVersionId");
    return id ? this.resolvers.programVersion(id) : null;
  }
  kind() {
    return this.$get("kind");
  }
  sourceType() {
    return this.$get("sourceType");
  }
  sourceId() {
    return this.$get("sourceId");
  }
  sourceRevision() {
    return this.$get("sourceRevision");
  }
  idempotencyKey() {
    return this.$get("idempotencyKey");
  }
  requestHash() {
    return this.$get("requestHash");
  }
  actorType() {
    return this.$get("actorType");
  }
  async actorId() {
    const id = await this.$get("actorId");
    return id ? this.encodeId(id, GlobalIdEntity.User) : null;
  }
  reasonCode() {
    return this.$get("reasonCode");
  }
  occurredAt() {
    return this.$get("occurredAt");
  }
  effectiveAt() {
    return this.$get("effectiveAt");
  }
  metadata() {
    return this.$get("metadata");
  }
  async entries() {
    return Promise.all(
      (await this.$ctx.loaders.monetaryEntries.load(this.$props)).map(({ id }) =>
        this.resolvers.monetaryEntry(id),
      ),
    );
  }
  createdAt() {
    return this.$get("createdAt");
  }
}

@SubgraphReference()
export class LoyaltyMonetaryLedgerEntryResolver extends LoyaltyType<string, MonetaryLedgerEntry> {
  async $preload() {
    const row = await this.$ctx.loaders.monetaryEntry.load(this.$props);
    if (!row)
      throw new PreloadNotFoundError(`Loyalty monetary ledger entry ${this.$props} was not found`);
    return row;
  }
  id() {
    return this.encodeId(this.$props, GlobalIdEntity.LoyaltyMonetaryLedgerEntry);
  }
  async transaction() {
    return this.resolvers.monetaryTransaction((await this.$get("transactionId"))!);
  }
  async wallet() {
    return this.resolvers.monetaryWallet((await this.$get("walletId"))!);
  }
  bucket() {
    return this.$get("bucket");
  }
  async amount() {
    const wallet = await this.$ctx.loaders.monetaryWallet.load((await this.$get("walletId"))!);
    if (!wallet) throw new PreloadNotFoundError("Loyalty monetary wallet was not found");
    return money((await this.$get("amountMinorDelta"))!, wallet.currencyCode);
  }
  sequence() {
    return this.$get("sequence");
  }
  createdAt() {
    return this.$get("createdAt");
  }
}

@SubgraphReference()
export class LoyaltyMonetaryCreditLotResolver extends LoyaltyType<string, MonetaryCreditLot> {
  async $preload() {
    const row = await this.$ctx.loaders.monetaryCreditLot.load(this.$props);
    if (!row)
      throw new PreloadNotFoundError(`Loyalty monetary credit lot ${this.$props} was not found`);
    return row;
  }
  id() {
    return this.encodeId(this.$props, GlobalIdEntity.LoyaltyMonetaryCreditLot);
  }
  async wallet() {
    return this.resolvers.monetaryWallet((await this.$get("walletId"))!);
  }
  async originEntry() {
    return this.resolvers.monetaryEntry((await this.$get("originEntryId"))!);
  }
  private async currency() {
    const wallet = await this.$ctx.loaders.monetaryWallet.load((await this.$get("walletId"))!);
    if (!wallet) throw new PreloadNotFoundError("Loyalty monetary wallet was not found");
    return wallet.currencyCode;
  }
  async amountIssued() {
    return money((await this.$get("amountIssuedMinor"))!, await this.currency());
  }
  async remainingAmount() {
    const allocated = (await this.$ctx.loaders.monetaryLotAllocations.load(this.$props)).reduce(
      (sum, row) => sum + row.amountMinor,
      0n,
    );
    return money((await this.$get("amountIssuedMinor"))! - allocated, await this.currency());
  }
  activatedAt() {
    return this.$get("activatedAt");
  }
  expiresAt() {
    return this.$get("expiresAt");
  }
  async allocations() {
    return Promise.all(
      (await this.$ctx.loaders.monetaryLotAllocations.load(this.$props)).map(({ id }) =>
        this.resolvers.monetaryLotAllocation(id),
      ),
    );
  }
  createdAt() {
    return this.$get("createdAt");
  }
}

@SubgraphReference()
export class LoyaltyMonetaryLotAllocationResolver extends LoyaltyType<
  string,
  MonetaryLotAllocation
> {
  async $preload() {
    const row = await this.$ctx.loaders.monetaryLotAllocation.load(this.$props);
    if (!row)
      throw new PreloadNotFoundError(
        `Loyalty monetary lot allocation ${this.$props} was not found`,
      );
    return row;
  }
  id() {
    return this.encodeId(this.$props, GlobalIdEntity.LoyaltyMonetaryLotAllocation);
  }
  async lot() {
    return this.resolvers.monetaryCreditLot((await this.$get("lotId"))!);
  }
  async debitEntry() {
    return this.resolvers.monetaryEntry((await this.$get("debitEntryId"))!);
  }
  async amount() {
    const lot = await this.$ctx.loaders.monetaryCreditLot.load((await this.$get("lotId"))!);
    const wallet = lot ? await this.$ctx.loaders.monetaryWallet.load(lot.walletId) : null;
    if (!wallet) throw new PreloadNotFoundError("Loyalty monetary wallet was not found");
    return money((await this.$get("amountMinor"))!, wallet.currencyCode);
  }
  createdAt() {
    return this.$get("createdAt");
  }
}
