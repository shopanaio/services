import {
  decodeGlobalIdByType,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import { parseGraphqlInfo } from "@shopana/type-resolver";
import type { GraphQLResolveInfo } from "graphql";
import { dateTimeScalar } from "../../scalars.js";
import type { ServiceContext } from "../../../context/types.js";
import {
  LoyaltyAccountResolver,
  LoyaltyTierMembershipEventResolver,
  LoyaltyTierMembershipResolver,
} from "../../../resolvers/admin/AccountResolvers.js";
import {
  LoyaltyLedgerEntryResolver,
  LoyaltyLotAllocationResolver,
  LoyaltyPointLotResolver,
  LoyaltyTransactionResolver,
} from "../../../resolvers/admin/LedgerResolvers.js";
import {
  LoyaltyEarningRuleResolver,
  LoyaltyProgramResolver,
  LoyaltyProgramVersionResolver,
  LoyaltyRewardDefinitionResolver,
  LoyaltyTierPolicyResolver,
  LoyaltyTierResolver,
} from "../../../resolvers/admin/ProgramResolvers.js";
import {
  LoyaltyReservationEventResolver,
  LoyaltyReservationResolver,
} from "../../../resolvers/admin/ReservationResolvers.js";
import type { Resolvers } from "../../../resolvers/admin/generated/types.js";
import {
  LoyaltyEarningRuleUsageResolver,
  LoyaltyEventEvaluationResolver,
  LoyaltyEventFactResolver,
} from "../../../resolvers/admin/EventResolvers.js";
import {
  LoyaltyRewardEntitlementEventResolver,
  LoyaltyRewardEntitlementResolver,
  LoyaltyTierRewardBenefitResolver,
} from "../../../resolvers/admin/RewardResolvers.js";
import {
  LoyaltyMonetaryCreditLotResolver,
  LoyaltyMonetaryLedgerEntryResolver,
  LoyaltyMonetaryLotAllocationResolver,
  LoyaltyMonetaryTransactionResolver,
  LoyaltyMonetaryWalletResolver,
} from "../../../resolvers/admin/WalletResolvers.js";

const nodeTypes = [
  [LoyaltyProgramResolver, "LoyaltyProgram"],
  [LoyaltyProgramVersionResolver, "LoyaltyProgramVersion"],
  [LoyaltyEarningRuleResolver, "LoyaltyEarningRule"],
  [LoyaltyRewardDefinitionResolver, "LoyaltyRewardDefinition"],
  [LoyaltyTierResolver, "LoyaltyTier"],
  [LoyaltyTierPolicyResolver, "LoyaltyTierPolicy"],
  [LoyaltyAccountResolver, "LoyaltyAccount"],
  [LoyaltyTierMembershipResolver, "LoyaltyTierMembership"],
  [LoyaltyTierMembershipEventResolver, "LoyaltyTierMembershipEvent"],
  [LoyaltyTransactionResolver, "LoyaltyTransaction"],
  [LoyaltyLedgerEntryResolver, "LoyaltyLedgerEntry"],
  [LoyaltyPointLotResolver, "LoyaltyPointLot"],
  [LoyaltyLotAllocationResolver, "LoyaltyLotAllocation"],
  [LoyaltyReservationResolver, "LoyaltyReservation"],
  [LoyaltyReservationEventResolver, "LoyaltyReservationEvent"],
  [LoyaltyEventFactResolver, "LoyaltyEventFact"],
  [LoyaltyEventEvaluationResolver, "LoyaltyEventEvaluation"],
  [LoyaltyEarningRuleUsageResolver, "LoyaltyEarningRuleUsage"],
  [LoyaltyRewardEntitlementResolver, "LoyaltyRewardEntitlement"],
  [LoyaltyRewardEntitlementEventResolver, "LoyaltyRewardEntitlementEvent"],
  [LoyaltyTierRewardBenefitResolver, "LoyaltyTierRewardBenefit"],
  [LoyaltyMonetaryWalletResolver, "LoyaltyMonetaryWallet"],
  [LoyaltyMonetaryTransactionResolver, "LoyaltyMonetaryTransaction"],
  [LoyaltyMonetaryLedgerEntryResolver, "LoyaltyMonetaryLedgerEntry"],
  [LoyaltyMonetaryCreditLotResolver, "LoyaltyMonetaryCreditLot"],
  [LoyaltyMonetaryLotAllocationResolver, "LoyaltyMonetaryLotAllocation"],
] as const;

const nodeTypesByConstructorName = new Map(
  nodeTypes.map(([Resolver, typeName]) => [Resolver.name, typeName]),
);

function reference(Resolver: any, type: GlobalIdType) {
  return async (value: { id: string }, ctx: ServiceContext, info: GraphQLResolveInfo) =>
    Resolver.load(decodeGlobalIdByType(value.id, type), parseGraphqlInfo(info), ctx);
}

export const typeResolvers = {
  DateTime: dateTimeScalar,
  Node: {
    __resolveType: (value: unknown) => {
      for (const [Resolver, typeName] of nodeTypes) {
        if (value instanceof Resolver) return typeName;
      }
      if (value && typeof value === "object") {
        const typename = (value as { __typename?: unknown }).__typename;
        if (typeof typename === "string") return typename;
        return nodeTypesByConstructorName.get((value as object).constructor.name) ?? null;
      }
      return null;
    },
  },
  UserError: { __resolveType: () => "LoyaltyUserError" },
  LoyaltyProgram: {
    __resolveReference: reference(LoyaltyProgramResolver, GlobalIdEntity.LoyaltyProgram),
  },
  LoyaltyProgramVersion: {
    __resolveReference: reference(
      LoyaltyProgramVersionResolver,
      GlobalIdEntity.LoyaltyProgramVersion,
    ),
  },
  LoyaltyEarningRule: {
    __resolveReference: reference(LoyaltyEarningRuleResolver, GlobalIdEntity.LoyaltyEarningRule),
  },
  LoyaltyRewardDefinition: {
    __resolveReference: reference(
      LoyaltyRewardDefinitionResolver,
      GlobalIdEntity.LoyaltyRewardDefinition,
    ),
  },
  LoyaltyTier: { __resolveReference: reference(LoyaltyTierResolver, GlobalIdEntity.LoyaltyTier) },
  LoyaltyTierPolicy: {
    __resolveReference: reference(LoyaltyTierPolicyResolver, GlobalIdEntity.LoyaltyTierPolicy),
  },
  LoyaltyAccount: {
    __resolveReference: reference(LoyaltyAccountResolver, GlobalIdEntity.LoyaltyAccount),
  },
  LoyaltyTierMembership: {
    __resolveReference: reference(
      LoyaltyTierMembershipResolver,
      GlobalIdEntity.LoyaltyTierMembership,
    ),
  },
  LoyaltyTierMembershipEvent: {
    __resolveReference: reference(
      LoyaltyTierMembershipEventResolver,
      GlobalIdEntity.LoyaltyTierMembershipEvent,
    ),
  },
  LoyaltyTransaction: {
    __resolveReference: reference(LoyaltyTransactionResolver, GlobalIdEntity.LoyaltyTransaction),
  },
  LoyaltyLedgerEntry: {
    __resolveReference: reference(LoyaltyLedgerEntryResolver, GlobalIdEntity.LoyaltyLedgerEntry),
  },
  LoyaltyPointLot: {
    __resolveReference: reference(LoyaltyPointLotResolver, GlobalIdEntity.LoyaltyPointLot),
  },
  LoyaltyLotAllocation: {
    __resolveReference: reference(
      LoyaltyLotAllocationResolver,
      GlobalIdEntity.LoyaltyLotAllocation,
    ),
  },
  LoyaltyReservation: {
    __resolveReference: reference(LoyaltyReservationResolver, GlobalIdEntity.LoyaltyReservation),
  },
  LoyaltyReservationEvent: {
    __resolveReference: reference(
      LoyaltyReservationEventResolver,
      GlobalIdEntity.LoyaltyReservationEvent,
    ),
  },
  LoyaltyEventFact: {
    __resolveReference: reference(LoyaltyEventFactResolver, GlobalIdEntity.LoyaltyEventFact),
  },
  LoyaltyEventEvaluation: {
    __resolveReference: reference(
      LoyaltyEventEvaluationResolver,
      GlobalIdEntity.LoyaltyEventEvaluation,
    ),
  },
  LoyaltyEarningRuleUsage: {
    __resolveReference: reference(
      LoyaltyEarningRuleUsageResolver,
      GlobalIdEntity.LoyaltyEarningRuleUsage,
    ),
  },
  LoyaltyRewardEntitlement: {
    __resolveReference: reference(
      LoyaltyRewardEntitlementResolver,
      GlobalIdEntity.LoyaltyRewardEntitlement,
    ),
  },
  LoyaltyRewardEntitlementEvent: {
    __resolveReference: reference(
      LoyaltyRewardEntitlementEventResolver,
      GlobalIdEntity.LoyaltyRewardEntitlementEvent,
    ),
  },
  LoyaltyTierRewardBenefit: {
    __resolveReference: reference(
      LoyaltyTierRewardBenefitResolver,
      GlobalIdEntity.LoyaltyTierRewardBenefit,
    ),
  },
  LoyaltyMonetaryWallet: {
    __resolveReference: reference(
      LoyaltyMonetaryWalletResolver,
      GlobalIdEntity.LoyaltyMonetaryWallet,
    ),
  },
  LoyaltyMonetaryTransaction: {
    __resolveReference: reference(
      LoyaltyMonetaryTransactionResolver,
      GlobalIdEntity.LoyaltyMonetaryTransaction,
    ),
  },
  LoyaltyMonetaryLedgerEntry: {
    __resolveReference: reference(
      LoyaltyMonetaryLedgerEntryResolver,
      GlobalIdEntity.LoyaltyMonetaryLedgerEntry,
    ),
  },
  LoyaltyMonetaryCreditLot: {
    __resolveReference: reference(
      LoyaltyMonetaryCreditLotResolver,
      GlobalIdEntity.LoyaltyMonetaryCreditLot,
    ),
  },
  LoyaltyMonetaryLotAllocation: {
    __resolveReference: reference(
      LoyaltyMonetaryLotAllocationResolver,
      GlobalIdEntity.LoyaltyMonetaryLotAllocation,
    ),
  },
} as unknown as Partial<Resolvers>;
