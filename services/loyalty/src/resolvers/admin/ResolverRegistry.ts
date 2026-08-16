import type { ServiceContext } from "../../context/types.js";
import type { ProgramConnectionInput } from "../../repositories/program/ProgramRepository.js";
import type { AccountConnectionInput } from "../../repositories/account/AccountRepository.js";
import type { TransactionConnectionInput } from "../../repositories/ledger/LedgerRepository.js";
import type { ReservationConnectionInput } from "../../repositories/reservation/ReservationRepository.js";

const registries = new WeakMap<ServiceContext, ResolverRegistry>();

export function getResolverRegistry(ctx: ServiceContext): ResolverRegistry {
  const existing = registries.get(ctx);
  if (existing) return existing;
  const registry = new ResolverRegistry(ctx);
  registries.set(ctx, registry);
  return registry;
}

export class ResolverRegistry {
  constructor(private readonly ctx: ServiceContext) {}

  async loyaltyQuery() { const { LoyaltyQueryResolver } = await import("./QueryResolver.js"); return new LoyaltyQueryResolver({}, this.ctx); }
  async loyaltyMutation() { const { LoyaltyMutationResolver } = await import("./MutationResolver.js"); return new LoyaltyMutationResolver({}, this.ctx); }
  async program(id: string) { const { LoyaltyProgramResolver } = await import("./ProgramResolvers.js"); return new LoyaltyProgramResolver(id, this.ctx); }
  async programVersion(id: string) { const { LoyaltyProgramVersionResolver } = await import("./ProgramResolvers.js"); return new LoyaltyProgramVersionResolver(id, this.ctx); }
  async earningRule(id: string) { const { LoyaltyEarningRuleResolver } = await import("./ProgramResolvers.js"); return new LoyaltyEarningRuleResolver(id, this.ctx); }
  async rewardDefinition(id: string) { const { LoyaltyRewardDefinitionResolver } = await import("./ProgramResolvers.js"); return new LoyaltyRewardDefinitionResolver(id, this.ctx); }
  async tier(id: string) { const { LoyaltyTierResolver } = await import("./ProgramResolvers.js"); return new LoyaltyTierResolver(id, this.ctx); }
  async tierPolicy(id: string) { const { LoyaltyTierPolicyResolver } = await import("./ProgramResolvers.js"); return new LoyaltyTierPolicyResolver(id, this.ctx); }
  async account(id: string) { const { LoyaltyAccountResolver } = await import("./AccountResolvers.js"); return new LoyaltyAccountResolver(id, this.ctx); }
  async tierMembership(id: string) { const { LoyaltyTierMembershipResolver } = await import("./AccountResolvers.js"); return new LoyaltyTierMembershipResolver(id, this.ctx); }
  async tierMembershipEvent(id: string) { const { LoyaltyTierMembershipEventResolver } = await import("./AccountResolvers.js"); return new LoyaltyTierMembershipEventResolver(id, this.ctx); }
  async transaction(id: string) { const { LoyaltyTransactionResolver } = await import("./LedgerResolvers.js"); return new LoyaltyTransactionResolver(id, this.ctx); }
  async ledgerEntry(id: string) { const { LoyaltyLedgerEntryResolver } = await import("./LedgerResolvers.js"); return new LoyaltyLedgerEntryResolver(id, this.ctx); }
  async pointLot(id: string) { const { LoyaltyPointLotResolver } = await import("./LedgerResolvers.js"); return new LoyaltyPointLotResolver(id, this.ctx); }
  async lotAllocation(id: string) { const { LoyaltyLotAllocationResolver } = await import("./LedgerResolvers.js"); return new LoyaltyLotAllocationResolver(id, this.ctx); }
  async reservation(id: string) { const { LoyaltyReservationResolver } = await import("./ReservationResolvers.js"); return new LoyaltyReservationResolver(id, this.ctx); }
  async reservationEvent(id: string) { const { LoyaltyReservationEventResolver } = await import("./ReservationResolvers.js"); return new LoyaltyReservationEventResolver(id, this.ctx); }
  async eventFact(id: string) { const { LoyaltyEventFactResolver } = await import("./EventResolvers.js"); return new LoyaltyEventFactResolver(id, this.ctx); }
  async eventEvaluation(id: string) { const { LoyaltyEventEvaluationResolver } = await import("./EventResolvers.js"); return new LoyaltyEventEvaluationResolver(id, this.ctx); }
  async earningRuleUsage(id: string) { const { LoyaltyEarningRuleUsageResolver } = await import("./EventResolvers.js"); return new LoyaltyEarningRuleUsageResolver(id, this.ctx); }
  async rewardEntitlement(id: string) { const { LoyaltyRewardEntitlementResolver } = await import("./RewardResolvers.js"); return new LoyaltyRewardEntitlementResolver(id, this.ctx); }
  async rewardEntitlementEvent(id: string) { const { LoyaltyRewardEntitlementEventResolver } = await import("./RewardResolvers.js"); return new LoyaltyRewardEntitlementEventResolver(id, this.ctx); }
  async tierRewardBenefit(id: string) { const { LoyaltyTierRewardBenefitResolver } = await import("./RewardResolvers.js"); return new LoyaltyTierRewardBenefitResolver(id, this.ctx); }
  async monetaryWallet(id: string) { const { LoyaltyMonetaryWalletResolver } = await import("./WalletResolvers.js"); return new LoyaltyMonetaryWalletResolver(id, this.ctx); }
  async monetaryTransaction(id: string) { const { LoyaltyMonetaryTransactionResolver } = await import("./WalletResolvers.js"); return new LoyaltyMonetaryTransactionResolver(id, this.ctx); }
  async monetaryEntry(id: string) { const { LoyaltyMonetaryLedgerEntryResolver } = await import("./WalletResolvers.js"); return new LoyaltyMonetaryLedgerEntryResolver(id, this.ctx); }
  async monetaryCreditLot(id: string) { const { LoyaltyMonetaryCreditLotResolver } = await import("./WalletResolvers.js"); return new LoyaltyMonetaryCreditLotResolver(id, this.ctx); }
  async monetaryLotAllocation(id: string) { const { LoyaltyMonetaryLotAllocationResolver } = await import("./WalletResolvers.js"); return new LoyaltyMonetaryLotAllocationResolver(id, this.ctx); }
  async programConnection(input: ProgramConnectionInput) { const { ProgramConnectionResolver } = await import("./ConnectionResolvers.js"); return new ProgramConnectionResolver(input, this.ctx); }
  async accountConnection(input: AccountConnectionInput) { const { AccountConnectionResolver } = await import("./ConnectionResolvers.js"); return new AccountConnectionResolver(input, this.ctx); }
  async transactionConnection(input: TransactionConnectionInput) { const { TransactionConnectionResolver } = await import("./ConnectionResolvers.js"); return new TransactionConnectionResolver(input, this.ctx); }
  async reservationConnection(input: ReservationConnectionInput) { const { ReservationConnectionResolver } = await import("./ConnectionResolvers.js"); return new ReservationConnectionResolver(input, this.ctx); }
}
