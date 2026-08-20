import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError, SubgraphReference } from "@shopana/type-resolver";
import type {
  LedgerEntry,
  LotAllocation,
  LoyaltyTransaction,
  PointLot,
} from "../../repositories/models/index.js";
import { LoyaltyType } from "./LoyaltyType.js";

@SubgraphReference()
export class LoyaltyTransactionResolver extends LoyaltyType<string, LoyaltyTransaction> {
  async $preload() {
    const row = await this.$ctx.loaders.transaction.load(this.$props);
    if (!row) throw new PreloadNotFoundError(`Loyalty transaction ${this.$props} was not found`);
    return row;
  }
  id() {
    return this.encodeId(this.$props, GlobalIdEntity.LoyaltyTransaction);
  }
  async account() {
    return this.resolvers.account((await this.$get("accountId"))!);
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
  source() {
    return this.$get("source");
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
  correlationId() {
    return this.$get("correlationId");
  }
  causationId() {
    return this.$get("causationId");
  }
  eventId() {
    return this.$get("eventId");
  }
  workflowId() {
    return this.$get("workflowId");
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
  description() {
    return this.$get("description");
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
      (await this.$ctx.loaders.ledgerEntriesByTransaction.load(this.$props)).map(({ id }) =>
        this.resolvers.ledgerEntry(id),
      ),
    );
  }
  async lotAllocations() {
    return Promise.all(
      (await this.$ctx.loaders.lotAllocationsByTransaction.load(this.$props)).map(({ id }) =>
        this.resolvers.lotAllocation(id),
      ),
    );
  }
  createdAt() {
    return this.$get("createdAt");
  }
}

@SubgraphReference()
export class LoyaltyLedgerEntryResolver extends LoyaltyType<string, LedgerEntry> {
  async $preload() {
    const row = await this.$ctx.loaders.ledgerEntry.load(this.$props);
    if (!row) throw new PreloadNotFoundError(`Loyalty ledger entry ${this.$props} was not found`);
    return row;
  }
  id() {
    return this.encodeId(this.$props, GlobalIdEntity.LoyaltyLedgerEntry);
  }
  async transaction() {
    return this.resolvers.transaction((await this.$get("transactionId"))!);
  }
  async account() {
    return this.resolvers.account((await this.$get("accountId"))!);
  }
  bucket() {
    return this.$get("bucket");
  }
  async pointsDelta() {
    return String(await this.$get("pointsDelta"));
  }
  sequence() {
    return this.$get("sequence");
  }
  createdAt() {
    return this.$get("createdAt");
  }
}

@SubgraphReference()
export class LoyaltyPointLotResolver extends LoyaltyType<string, PointLot> {
  async $preload() {
    const row = await this.$ctx.loaders.pointLot.load(this.$props);
    if (!row) throw new PreloadNotFoundError(`Loyalty point lot ${this.$props} was not found`);
    return row;
  }
  id() {
    return this.encodeId(this.$props, GlobalIdEntity.LoyaltyPointLot);
  }
  async account() {
    return this.resolvers.account((await this.$get("accountId"))!);
  }
  async program() {
    return this.resolvers.program((await this.$get("programId"))!);
  }
  async originEntry() {
    return this.resolvers.ledgerEntry((await this.$get("originEntryId"))!);
  }
  async pointsIssued() {
    return String(await this.$get("pointsIssued"));
  }
  async remainingPoints() {
    const issued = (await this.$get("pointsIssued"))!;
    const allocated = (await this.$ctx.loaders.lotAllocationsByLot.load(this.$props)).reduce(
      (sum, row) => sum + row.points,
      0n,
    );
    return (issued - allocated).toString();
  }
  activatedAt() {
    return this.$get("activatedAt");
  }
  expiresAt() {
    return this.$get("expiresAt");
  }
  async allocations() {
    return Promise.all(
      (await this.$ctx.loaders.lotAllocationsByLot.load(this.$props)).map(({ id }) =>
        this.resolvers.lotAllocation(id),
      ),
    );
  }
  createdAt() {
    return this.$get("createdAt");
  }
}

@SubgraphReference()
export class LoyaltyLotAllocationResolver extends LoyaltyType<string, LotAllocation> {
  async $preload() {
    const row = await this.$ctx.loaders.lotAllocation.load(this.$props);
    if (!row) throw new PreloadNotFoundError(`Loyalty lot allocation ${this.$props} was not found`);
    return row;
  }
  id() {
    return this.encodeId(this.$props, GlobalIdEntity.LoyaltyLotAllocation);
  }
  async lot() {
    return this.resolvers.pointLot((await this.$get("lotId"))!);
  }
  async debitEntry() {
    return this.resolvers.ledgerEntry((await this.$get("debitEntryId"))!);
  }
  async transaction() {
    return this.resolvers.transaction((await this.$get("transactionId"))!);
  }
  allocationType() {
    return this.$get("allocationType");
  }
  async points() {
    return String(await this.$get("points"));
  }
  createdAt() {
    return this.$get("createdAt");
  }
}
