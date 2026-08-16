import { GlobalIdEntity, parseGlobalId } from "@shopana/shared-graphql-guid";
import { ApolloQuery } from "@shopana/type-resolver";
import type {
  LoyaltyQueryAccountArgs,
  LoyaltyQueryAccountsArgs,
  LoyaltyQueryCustomerAccountArgs,
  LoyaltyQueryNodeArgs,
  LoyaltyQueryNodesArgs,
  LoyaltyQueryProgramArgs,
  LoyaltyQueryProgramsArgs,
  LoyaltyQueryReservationArgs,
  LoyaltyQueryReservationsArgs,
  LoyaltyQueryTransactionArgs,
  LoyaltyQueryTransactionsArgs,
} from "./generated/types.js";
import { LoyaltyType } from "./LoyaltyType.js";
import {
  normalizeAccountConnection,
  normalizeProgramConnection,
  normalizeReservationConnection,
  normalizeTransactionConnection,
} from "./inputNormalization.js";

@ApolloQuery
export class QueryResolver extends LoyaltyType<Record<string, never>> {
  loyaltyQuery() { return this.resolvers.loyaltyQuery(); }
}

export class LoyaltyQueryResolver extends LoyaltyType<Record<string, never>> {
  async node(args: LoyaltyQueryNodeArgs) {
    let parsed: ReturnType<typeof parseGlobalId>;
    try { parsed = parseGlobalId(args.id); } catch { return null; }
    switch (parsed.typeName) {
      case GlobalIdEntity.LoyaltyProgram:
        return (await this.$ctx.loaders.program.load(parsed.id)) ? this.resolvers.program(parsed.id) : null;
      case GlobalIdEntity.LoyaltyProgramVersion:
        return (await this.$ctx.loaders.programVersion.load(parsed.id)) ? this.resolvers.programVersion(parsed.id) : null;
      case GlobalIdEntity.LoyaltyEarningRule:
        return (await this.$ctx.loaders.earningRule.load(parsed.id)) ? this.resolvers.earningRule(parsed.id) : null;
      case GlobalIdEntity.LoyaltyRewardDefinition:
        return (await this.$ctx.loaders.rewardDefinition.load(parsed.id)) ? this.resolvers.rewardDefinition(parsed.id) : null;
      case GlobalIdEntity.LoyaltyTier:
        return (await this.$ctx.loaders.tier.load(parsed.id)) ? this.resolvers.tier(parsed.id) : null;
      case GlobalIdEntity.LoyaltyTierPolicy:
        return (await this.$ctx.loaders.tierPolicy.load(parsed.id)) ? this.resolvers.tierPolicy(parsed.id) : null;
      case GlobalIdEntity.LoyaltyAccount:
        return (await this.$ctx.loaders.account.load(parsed.id)) ? this.resolvers.account(parsed.id) : null;
      case GlobalIdEntity.LoyaltyTierMembership:
        return (await this.$ctx.loaders.tierMembership.load(parsed.id)) ? this.resolvers.tierMembership(parsed.id) : null;
      case GlobalIdEntity.LoyaltyTierMembershipEvent:
        return (await this.$ctx.loaders.tierMembershipEvent.load(parsed.id)) ? this.resolvers.tierMembershipEvent(parsed.id) : null;
      case GlobalIdEntity.LoyaltyTransaction:
        return (await this.$ctx.loaders.transaction.load(parsed.id)) ? this.resolvers.transaction(parsed.id) : null;
      case GlobalIdEntity.LoyaltyLedgerEntry:
        return (await this.$ctx.loaders.ledgerEntry.load(parsed.id)) ? this.resolvers.ledgerEntry(parsed.id) : null;
      case GlobalIdEntity.LoyaltyPointLot:
        return (await this.$ctx.loaders.pointLot.load(parsed.id)) ? this.resolvers.pointLot(parsed.id) : null;
      case GlobalIdEntity.LoyaltyLotAllocation:
        return (await this.$ctx.loaders.lotAllocation.load(parsed.id)) ? this.resolvers.lotAllocation(parsed.id) : null;
      case GlobalIdEntity.LoyaltyReservation:
        return (await this.$ctx.loaders.reservation.load(parsed.id)) ? this.resolvers.reservation(parsed.id) : null;
      case GlobalIdEntity.LoyaltyReservationEvent:
        return (await this.$ctx.loaders.reservationEvent.load(parsed.id)) ? this.resolvers.reservationEvent(parsed.id) : null;
      default:
        return null;
    }
  }

  nodes(args: LoyaltyQueryNodesArgs) { return Promise.all(args.ids.map((id) => this.node({ id }))); }

  async program(args: LoyaltyQueryProgramArgs) {
    const id = this.decodeId(args.id, GlobalIdEntity.LoyaltyProgram);
    return (await this.$ctx.loaders.program.load(id)) ? this.resolvers.program(id) : null;
  }
  programs(args: LoyaltyQueryProgramsArgs) { return this.resolvers.programConnection(normalizeProgramConnection(args)); }

  async account(args: LoyaltyQueryAccountArgs) {
    const id = this.decodeId(args.id, GlobalIdEntity.LoyaltyAccount);
    return (await this.$ctx.loaders.account.load(id)) ? this.resolvers.account(id) : null;
  }
  async customerAccount(args: LoyaltyQueryCustomerAccountArgs) {
    const customerId = this.decodeId(args.customerId, GlobalIdEntity.Customer);
    const programId = args.programId
      ? this.decodeId(args.programId, GlobalIdEntity.LoyaltyProgram)
      : (await this.$ctx.kernel.repository.program.findDefault())?.id;
    if (!programId) return null;
    const account = await this.$ctx.kernel.repository.account.findByCustomerAndProgram(customerId, programId);
    return account ? this.resolvers.account(account.id) : null;
  }
  accounts(args: LoyaltyQueryAccountsArgs) { return this.resolvers.accountConnection(normalizeAccountConnection(args)); }

  async transaction(args: LoyaltyQueryTransactionArgs) {
    const id = this.decodeId(args.id, GlobalIdEntity.LoyaltyTransaction);
    return (await this.$ctx.loaders.transaction.load(id)) ? this.resolvers.transaction(id) : null;
  }
  transactions(args: LoyaltyQueryTransactionsArgs) { return this.resolvers.transactionConnection(normalizeTransactionConnection(args)); }

  async reservation(args: LoyaltyQueryReservationArgs) {
    const id = this.decodeId(args.id, GlobalIdEntity.LoyaltyReservation);
    return (await this.$ctx.loaders.reservation.load(id)) ? this.resolvers.reservation(id) : null;
  }
  reservations(args: LoyaltyQueryReservationsArgs) { return this.resolvers.reservationConnection(normalizeReservationConnection(args)); }
}
