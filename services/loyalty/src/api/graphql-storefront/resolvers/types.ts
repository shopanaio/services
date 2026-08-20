import {
  decodeGlobalIdByType,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import { requireStorefrontPermission, STOREFRONT_PERMISSIONS } from "@shopana/shared-context";
import { parseGraphqlInfo } from "@shopana/type-resolver";
import type { GraphQLResolveInfo } from "graphql";
import { dateTimeScalar } from "../../scalars.js";
import type { ServiceContext } from "../../../context/types.js";
import {
  CustomerFederationResolver,
  ProductFederationResolver,
  ProductVariantFederationResolver,
} from "../../../resolvers/storefront/FederationResolvers.js";
import {
  LoyaltyAvailableRewardConnectionResolver,
  LoyaltyAvailableRewardResolver,
} from "../../../resolvers/storefront/RewardResolvers.js";
import { StorefrontTransactionConnectionResolver } from "../../../resolvers/storefront/TransactionResolvers.js";
import type { Resolvers } from "../../../resolvers/storefront/generated/types.js";

type Loadable = {
  load(
    value: string,
    query: ReturnType<typeof parseGraphqlInfo>,
    ctx: ServiceContext,
  ): Promise<unknown>;
};

function referenceResolver(entity: GlobalIdType, Resolver: Loadable) {
  return (reference: { id: string }, ctx: ServiceContext, info: GraphQLResolveInfo) => {
    requireStorefrontPermission(ctx.storefrontAccess, STOREFRONT_PERMISSIONS.LOYALTY_READ);
    return Resolver.load(decodeGlobalIdByType(reference.id, entity), parseGraphqlInfo(info), ctx);
  };
}

export const typeResolvers = {
  DateTime: dateTimeScalar,
  Node: {
    __resolveType: (value: unknown) =>
      value instanceof LoyaltyAvailableRewardResolver ? "LoyaltyAvailableReward" : null,
  },
  Connection: {
    __resolveType: (value: unknown) =>
      value instanceof LoyaltyAvailableRewardConnectionResolver
        ? "LoyaltyAvailableRewardConnection"
        : value instanceof StorefrontTransactionConnectionResolver
          ? "LoyaltyTransactionConnection"
          : null,
  },
  LoyaltyRewardPresentation: {
    __resolveType: (value: unknown) => {
      const name = (value as { __typename?: string })?.__typename;
      return name === "LoyaltyPointsRewardPresentation" ||
        name === "LoyaltyMoneyRewardPresentation" ||
        name === "LoyaltyPercentageRewardPresentation" ||
        name === "LoyaltyVoucherRewardPresentation" ||
        name === "LoyaltyFreeShippingRewardPresentation" ||
        name === "LoyaltyFreeProductRewardPresentation" ||
        name === "LoyaltyMemberBenefitRewardPresentation"
        ? name
        : null;
    },
  },
  Product: {
    __resolveReference: referenceResolver(GlobalIdEntity.Product, ProductFederationResolver),
  },
  ProductVariant: {
    __resolveReference: referenceResolver(
      GlobalIdEntity.ProductVariant,
      ProductVariantFederationResolver,
    ),
  },
  Customer: {
    __resolveReference: referenceResolver(GlobalIdEntity.Customer, CustomerFederationResolver),
  },
  LoyaltyAvailableReward: {
    __resolveReference: referenceResolver(
      GlobalIdEntity.LoyaltyAvailableReward,
      LoyaltyAvailableRewardResolver,
    ),
  },
} as unknown as Partial<Resolvers>;
