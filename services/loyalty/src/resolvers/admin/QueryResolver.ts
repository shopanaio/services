import { GLOBAL_ID_NAMESPACE, GlobalIdEntity, parseGlobalId } from "@shopana/shared-graphql-guid";
import { ApolloQuery } from "@shopana/type-resolver";
import { GraphQLError } from "graphql";
import type {
  LoyaltyQueryAccountArgs,
  LoyaltyQueryAccountsArgs,
  LoyaltyQueryCustomerAccountArgs,
  LoyaltyQueryEarningRuleArgs,
  LoyaltyQueryEarningRuleUsagesArgs,
  LoyaltyQueryEventEvaluationArgs,
  LoyaltyQueryEventEvaluationsArgs,
  LoyaltyQueryEventFactArgs,
  LoyaltyQueryEventFactsArgs,
  LoyaltyQueryMonetaryTransactionArgs,
  LoyaltyQueryMonetaryTransactionsArgs,
  LoyaltyQueryMonetaryWalletArgs,
  LoyaltyQueryMonetaryWalletsArgs,
  LoyaltyQueryNodeArgs,
  LoyaltyQueryNodesArgs,
  LoyaltyQueryProgramArgs,
  LoyaltyQueryProgramVersionArgs,
  LoyaltyQueryProgramsArgs,
  LoyaltyQueryReservationArgs,
  LoyaltyQueryReservationsArgs,
  LoyaltyQueryRewardDefinitionArgs,
  LoyaltyQueryRewardEntitlementArgs,
  LoyaltyQueryRewardEntitlementsArgs,
  LoyaltyQueryTierArgs,
  LoyaltyQueryTierMembershipArgs,
  LoyaltyQueryTierMembershipsArgs,
  LoyaltyQueryTierPolicyArgs,
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
    const parsed = parseNodeId(args.id);
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
      case GlobalIdEntity.LoyaltyEventFact:
        return (await this.$ctx.loaders.eventFact.load(parsed.id)) ? this.resolvers.eventFact(parsed.id) : null;
      case GlobalIdEntity.LoyaltyEventEvaluation:
        return (await this.$ctx.loaders.eventEvaluation.load(parsed.id)) ? this.resolvers.eventEvaluation(parsed.id) : null;
      case GlobalIdEntity.LoyaltyEarningRuleUsage:
        return (await this.$ctx.loaders.earningRuleUsageById.load(parsed.id)) ? this.resolvers.earningRuleUsage(parsed.id) : null;
      case GlobalIdEntity.LoyaltyRewardEntitlement:
        return (await this.$ctx.loaders.rewardEntitlement.load(parsed.id)) ? this.resolvers.rewardEntitlement(parsed.id) : null;
      case GlobalIdEntity.LoyaltyRewardEntitlementEvent:
        return (await this.$ctx.loaders.rewardEntitlementEvent.load(parsed.id)) ? this.resolvers.rewardEntitlementEvent(parsed.id) : null;
      case GlobalIdEntity.LoyaltyTierRewardBenefit:
        return (await this.$ctx.loaders.tierRewardBenefit.load(parsed.id)) ? this.resolvers.tierRewardBenefit(parsed.id) : null;
      case GlobalIdEntity.LoyaltyMonetaryWallet:
        return (await this.$ctx.loaders.monetaryWallet.load(parsed.id)) ? this.resolvers.monetaryWallet(parsed.id) : null;
      case GlobalIdEntity.LoyaltyMonetaryTransaction:
        return (await this.$ctx.loaders.monetaryTransaction.load(parsed.id)) ? this.resolvers.monetaryTransaction(parsed.id) : null;
      case GlobalIdEntity.LoyaltyMonetaryLedgerEntry:
        return (await this.$ctx.loaders.monetaryEntry.load(parsed.id)) ? this.resolvers.monetaryEntry(parsed.id) : null;
      case GlobalIdEntity.LoyaltyMonetaryCreditLot:
        return (await this.$ctx.loaders.monetaryCreditLot.load(parsed.id)) ? this.resolvers.monetaryCreditLot(parsed.id) : null;
      case GlobalIdEntity.LoyaltyMonetaryLotAllocation:
        return (await this.$ctx.loaders.monetaryLotAllocation.load(parsed.id)) ? this.resolvers.monetaryLotAllocation(parsed.id) : null;
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

  async programVersion(args: LoyaltyQueryProgramVersionArgs) {
    const id = this.decodeId(args.id, GlobalIdEntity.LoyaltyProgramVersion);
    return (await this.$ctx.loaders.programVersion.load(id)) ? this.resolvers.programVersion(id) : null;
  }
  async earningRule(args: LoyaltyQueryEarningRuleArgs) {
    const id = this.decodeId(args.id, GlobalIdEntity.LoyaltyEarningRule);
    return (await this.$ctx.loaders.earningRule.load(id)) ? this.resolvers.earningRule(id) : null;
  }
  async rewardDefinition(args: LoyaltyQueryRewardDefinitionArgs) {
    const id = this.decodeId(args.id, GlobalIdEntity.LoyaltyRewardDefinition);
    return (await this.$ctx.loaders.rewardDefinition.load(id)) ? this.resolvers.rewardDefinition(id) : null;
  }
  async tier(args: LoyaltyQueryTierArgs) {
    const id = this.decodeId(args.id, GlobalIdEntity.LoyaltyTier);
    return (await this.$ctx.loaders.tier.load(id)) ? this.resolvers.tier(id) : null;
  }
  async tierPolicy(args: LoyaltyQueryTierPolicyArgs) {
    const id = this.decodeId(args.id, GlobalIdEntity.LoyaltyTierPolicy);
    return (await this.$ctx.loaders.tierPolicy.load(id)) ? this.resolvers.tierPolicy(id) : null;
  }

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

  async tierMembership(args: LoyaltyQueryTierMembershipArgs) {
    const id = this.decodeId(args.id, GlobalIdEntity.LoyaltyTierMembership);
    return (await this.$ctx.loaders.tierMembership.load(id)) ? this.resolvers.tierMembership(id) : null;
  }
  async tierMemberships(args: LoyaltyQueryTierMembershipsArgs) {
    const accountId = this.decodeId(args.accountId, GlobalIdEntity.LoyaltyAccount);
    return Promise.all((await this.$ctx.kernel.repository.tier.listMembershipsForAccount(accountId, bounded(args.first)))
      .map(({ id }) => this.resolvers.tierMembership(id)));
  }

  async eventFact(args: LoyaltyQueryEventFactArgs) {
    const id = this.decodeId(args.id, GlobalIdEntity.LoyaltyEventFact);
    return (await this.$ctx.loaders.eventFact.load(id)) ? this.resolvers.eventFact(id) : null;
  }
  async eventFacts(args: LoyaltyQueryEventFactsArgs) {
    const where = args.where ?? {};
    const rows = await this.$ctx.kernel.repository.event.listFacts({
      customerIds: where.customerIds?.map((id) => this.decodeId(id, GlobalIdEntity.Customer)),
      producers: where.producers ?? undefined,
      eventTypes: where.eventTypes ?? undefined,
      occurredFrom: where.occurredFrom ?? undefined,
      occurredTo: where.occurredTo ?? undefined,
      limit: bounded(args.first),
    });
    return Promise.all(rows.map(({ id }) => this.resolvers.eventFact(id)));
  }
  async eventEvaluation(args: LoyaltyQueryEventEvaluationArgs) {
    const id = this.decodeId(args.id, GlobalIdEntity.LoyaltyEventEvaluation);
    return (await this.$ctx.loaders.eventEvaluation.load(id)) ? this.resolvers.eventEvaluation(id) : null;
  }
  async eventEvaluations(args: LoyaltyQueryEventEvaluationsArgs) {
    const rows = await this.$ctx.kernel.repository.event.listEvaluationsFiltered({
      eventFactId: args.where.eventFactId ? this.decodeId(args.where.eventFactId, GlobalIdEntity.LoyaltyEventFact) : undefined,
      accountId: args.where.accountId ? this.decodeId(args.where.accountId, GlobalIdEntity.LoyaltyAccount) : undefined,
      earningRuleId: args.where.earningRuleId ? this.decodeId(args.where.earningRuleId, GlobalIdEntity.LoyaltyEarningRule) : undefined,
      decisions: args.where.decisions ?? undefined,
      limit: bounded(args.first),
    });
    return Promise.all(rows.map(({ id }) => this.resolvers.eventEvaluation(id)));
  }
  async earningRuleUsages(args: LoyaltyQueryEarningRuleUsagesArgs) {
    const rows = await this.$ctx.kernel.repository.event.listUsages({
      earningRuleId: this.decodeId(args.where.earningRuleId, GlobalIdEntity.LoyaltyEarningRule),
      scopeKey: args.where.scopeKey ?? undefined,
      effectiveAt: args.where.effectiveAt ?? undefined,
      limit: bounded(args.first),
    });
    return Promise.all(rows.map(({ id }) => this.resolvers.earningRuleUsage(id)));
  }

  async rewardEntitlement(args: LoyaltyQueryRewardEntitlementArgs) {
    const id = this.decodeId(args.id, GlobalIdEntity.LoyaltyRewardEntitlement);
    return (await this.$ctx.loaders.rewardEntitlement.load(id)) ? this.resolvers.rewardEntitlement(id) : null;
  }
  async rewardEntitlements(args: LoyaltyQueryRewardEntitlementsArgs) {
    const rows = await this.$ctx.kernel.repository.reward.listEntitlementsFiltered({
      accountIds: args.where.accountIds?.map((id) => this.decodeId(id, GlobalIdEntity.LoyaltyAccount)),
      rewardDefinitionIds: args.where.rewardDefinitionIds?.map((id) => this.decodeId(id, GlobalIdEntity.LoyaltyRewardDefinition)),
      statuses: args.where.statuses ?? undefined,
      validAt: args.where.validAt ?? undefined,
      limit: bounded(args.first),
    });
    return Promise.all(rows.map(({ id }) => this.resolvers.rewardEntitlement(id)));
  }

  async monetaryWallet(args: LoyaltyQueryMonetaryWalletArgs) {
    const id = this.decodeId(args.id, GlobalIdEntity.LoyaltyMonetaryWallet);
    return (await this.$ctx.loaders.monetaryWallet.load(id)) ? this.resolvers.monetaryWallet(id) : null;
  }
  async monetaryWallets(args: LoyaltyQueryMonetaryWalletsArgs) {
    const rows = await this.$ctx.kernel.repository.wallet.listWalletsFiltered({
      accountIds: args.where.accountIds?.map((id) => this.decodeId(id, GlobalIdEntity.LoyaltyAccount)),
      walletTypes: args.where.walletTypes ?? undefined,
      currencyCodes: args.where.currencyCodes ?? undefined,
      statuses: args.where.statuses ?? undefined,
      limit: bounded(args.first),
    });
    return Promise.all(rows.map(({ id }) => this.resolvers.monetaryWallet(id)));
  }
  async monetaryTransaction(args: LoyaltyQueryMonetaryTransactionArgs) {
    const id = this.decodeId(args.id, GlobalIdEntity.LoyaltyMonetaryTransaction);
    return (await this.$ctx.loaders.monetaryTransaction.load(id)) ? this.resolvers.monetaryTransaction(id) : null;
  }
  async monetaryTransactions(args: LoyaltyQueryMonetaryTransactionsArgs) {
    const walletId = this.decodeId(args.walletId, GlobalIdEntity.LoyaltyMonetaryWallet);
    return Promise.all((await this.$ctx.kernel.repository.wallet.listTransactions(walletId, bounded(args.first)))
      .map(({ id }) => this.resolvers.monetaryTransaction(id)));
  }
}

function parseNodeId(value: string): ReturnType<typeof parseGlobalId> {
  try {
    const parsed = parseGlobalId(value);
    if (parsed.namespace !== GLOBAL_ID_NAMESPACE) throw new Error("Unexpected namespace");
    return parsed;
  } catch {
    throw new GraphQLError("Invalid node ID", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }
}

function bounded(first: number | null | undefined): number {
  if (first === undefined || first === null) return 100;
  return Math.max(1, Math.min(first, 100));
}
