import type { ServiceContext } from "../../context/types.js";
import type { ProgramConnectionInput } from "../../repositories/program/ProgramRepository.js";
import type { AccountConnectionInput } from "../../repositories/account/AccountRepository.js";
import type { TransactionConnectionInput } from "../../repositories/ledger/LedgerRepository.js";
import type { ReservationConnectionInput } from "../../repositories/reservation/ReservationRepository.js";

const registries = new WeakMap<ServiceContext, ResolverRegistry>();

function nodeResolver<T extends object>(resolver: T, typename: string): T & { __typename: string } {
  return Object.assign(resolver, { __typename: typename });
}

export function getResolverRegistry(ctx: ServiceContext): ResolverRegistry {
  const existing = registries.get(ctx);
  if (existing) return existing;
  const registry = new ResolverRegistry(ctx);
  registries.set(ctx, registry);
  return registry;
}

export class ResolverRegistry {
  constructor(private readonly ctx: ServiceContext) {}

  async loyaltyQuery() {
    const { LoyaltyQueryResolver } = await import("./QueryResolver.js");
    return new LoyaltyQueryResolver({}, this.ctx);
  }
  async loyaltyMutation() {
    const { LoyaltyMutationResolver } = await import("./MutationResolver.js");
    return new LoyaltyMutationResolver({}, this.ctx);
  }
  async program(id: string) {
    const { LoyaltyProgramResolver } = await import("./ProgramResolvers.js");
    return nodeResolver(new LoyaltyProgramResolver(id, this.ctx), "LoyaltyProgram");
  }
  async programVersion(id: string) {
    const { LoyaltyProgramVersionResolver } = await import("./ProgramResolvers.js");
    return nodeResolver(new LoyaltyProgramVersionResolver(id, this.ctx), "LoyaltyProgramVersion");
  }
  async earningRule(id: string) {
    const { LoyaltyEarningRuleResolver } = await import("./ProgramResolvers.js");
    return nodeResolver(new LoyaltyEarningRuleResolver(id, this.ctx), "LoyaltyEarningRule");
  }
  async rewardDefinition(id: string) {
    const { LoyaltyRewardDefinitionResolver } = await import("./ProgramResolvers.js");
    return nodeResolver(
      new LoyaltyRewardDefinitionResolver(id, this.ctx),
      "LoyaltyRewardDefinition",
    );
  }
  async tier(id: string) {
    const { LoyaltyTierResolver } = await import("./ProgramResolvers.js");
    return nodeResolver(new LoyaltyTierResolver(id, this.ctx), "LoyaltyTier");
  }
  async tierPolicy(id: string) {
    const { LoyaltyTierPolicyResolver } = await import("./ProgramResolvers.js");
    return nodeResolver(new LoyaltyTierPolicyResolver(id, this.ctx), "LoyaltyTierPolicy");
  }
  async account(id: string) {
    const { LoyaltyAccountResolver } = await import("./AccountResolvers.js");
    return nodeResolver(new LoyaltyAccountResolver(id, this.ctx), "LoyaltyAccount");
  }
  async tierMembership(id: string) {
    const { LoyaltyTierMembershipResolver } = await import("./AccountResolvers.js");
    return nodeResolver(new LoyaltyTierMembershipResolver(id, this.ctx), "LoyaltyTierMembership");
  }
  async tierMembershipEvent(id: string) {
    const { LoyaltyTierMembershipEventResolver } = await import("./AccountResolvers.js");
    return nodeResolver(
      new LoyaltyTierMembershipEventResolver(id, this.ctx),
      "LoyaltyTierMembershipEvent",
    );
  }
  async transaction(id: string) {
    const { LoyaltyTransactionResolver } = await import("./LedgerResolvers.js");
    return nodeResolver(new LoyaltyTransactionResolver(id, this.ctx), "LoyaltyTransaction");
  }
  async ledgerEntry(id: string) {
    const { LoyaltyLedgerEntryResolver } = await import("./LedgerResolvers.js");
    return nodeResolver(new LoyaltyLedgerEntryResolver(id, this.ctx), "LoyaltyLedgerEntry");
  }
  async pointLot(id: string) {
    const { LoyaltyPointLotResolver } = await import("./LedgerResolvers.js");
    return nodeResolver(new LoyaltyPointLotResolver(id, this.ctx), "LoyaltyPointLot");
  }
  async lotAllocation(id: string) {
    const { LoyaltyLotAllocationResolver } = await import("./LedgerResolvers.js");
    return nodeResolver(new LoyaltyLotAllocationResolver(id, this.ctx), "LoyaltyLotAllocation");
  }
  async reservation(id: string) {
    const { LoyaltyReservationResolver } = await import("./ReservationResolvers.js");
    return nodeResolver(new LoyaltyReservationResolver(id, this.ctx), "LoyaltyReservation");
  }
  async reservationEvent(id: string) {
    const { LoyaltyReservationEventResolver } = await import("./ReservationResolvers.js");
    return nodeResolver(
      new LoyaltyReservationEventResolver(id, this.ctx),
      "LoyaltyReservationEvent",
    );
  }
  async eventFact(id: string) {
    const { LoyaltyEventFactResolver } = await import("./EventResolvers.js");
    return nodeResolver(new LoyaltyEventFactResolver(id, this.ctx), "LoyaltyEventFact");
  }
  async eventEvaluation(id: string) {
    const { LoyaltyEventEvaluationResolver } = await import("./EventResolvers.js");
    return nodeResolver(new LoyaltyEventEvaluationResolver(id, this.ctx), "LoyaltyEventEvaluation");
  }
  async earningRuleUsage(id: string) {
    const { LoyaltyEarningRuleUsageResolver } = await import("./EventResolvers.js");
    return nodeResolver(
      new LoyaltyEarningRuleUsageResolver(id, this.ctx),
      "LoyaltyEarningRuleUsage",
    );
  }
  async rewardEntitlement(id: string) {
    const { LoyaltyRewardEntitlementResolver } = await import("./RewardResolvers.js");
    return nodeResolver(
      new LoyaltyRewardEntitlementResolver(id, this.ctx),
      "LoyaltyRewardEntitlement",
    );
  }
  async rewardEntitlementEvent(id: string) {
    const { LoyaltyRewardEntitlementEventResolver } = await import("./RewardResolvers.js");
    return nodeResolver(
      new LoyaltyRewardEntitlementEventResolver(id, this.ctx),
      "LoyaltyRewardEntitlementEvent",
    );
  }
  async tierRewardBenefit(id: string) {
    const { LoyaltyTierRewardBenefitResolver } = await import("./RewardResolvers.js");
    return nodeResolver(
      new LoyaltyTierRewardBenefitResolver(id, this.ctx),
      "LoyaltyTierRewardBenefit",
    );
  }
  async monetaryWallet(id: string) {
    const { LoyaltyMonetaryWalletResolver } = await import("./WalletResolvers.js");
    return nodeResolver(new LoyaltyMonetaryWalletResolver(id, this.ctx), "LoyaltyMonetaryWallet");
  }
  async monetaryTransaction(id: string) {
    const { LoyaltyMonetaryTransactionResolver } = await import("./WalletResolvers.js");
    return nodeResolver(
      new LoyaltyMonetaryTransactionResolver(id, this.ctx),
      "LoyaltyMonetaryTransaction",
    );
  }
  async monetaryEntry(id: string) {
    const { LoyaltyMonetaryLedgerEntryResolver } = await import("./WalletResolvers.js");
    return nodeResolver(
      new LoyaltyMonetaryLedgerEntryResolver(id, this.ctx),
      "LoyaltyMonetaryLedgerEntry",
    );
  }
  async monetaryCreditLot(id: string) {
    const { LoyaltyMonetaryCreditLotResolver } = await import("./WalletResolvers.js");
    return nodeResolver(
      new LoyaltyMonetaryCreditLotResolver(id, this.ctx),
      "LoyaltyMonetaryCreditLot",
    );
  }
  async monetaryLotAllocation(id: string) {
    const { LoyaltyMonetaryLotAllocationResolver } = await import("./WalletResolvers.js");
    return nodeResolver(
      new LoyaltyMonetaryLotAllocationResolver(id, this.ctx),
      "LoyaltyMonetaryLotAllocation",
    );
  }
  async programConnection(input: ProgramConnectionInput) {
    const { ProgramConnectionResolver } = await import("./ConnectionResolvers.js");
    return new ProgramConnectionResolver(input, this.ctx);
  }
  async accountConnection(input: AccountConnectionInput) {
    const { AccountConnectionResolver } = await import("./ConnectionResolvers.js");
    return new AccountConnectionResolver(input, this.ctx);
  }
  async transactionConnection(input: TransactionConnectionInput) {
    const { TransactionConnectionResolver } = await import("./ConnectionResolvers.js");
    return new TransactionConnectionResolver(input, this.ctx);
  }
  async reservationConnection(input: ReservationConnectionInput) {
    const { ReservationConnectionResolver } = await import("./ConnectionResolvers.js");
    return new ReservationConnectionResolver(input, this.ctx);
  }
}
