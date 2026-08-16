import { App } from "@src/ioc/container";
import type { GraphQLContext } from "@src/interfaces/gql-storefront-api/context";
import { mapCommittedCheckoutToApi } from "@src/interfaces/gql-storefront-api/mapper/committedCheckout";
import { fromDomainError } from "@src/interfaces/gql-storefront-api/errors";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { decodeGlobalIdByType } from "@src/interfaces/gql-storefront-api/idCodec";
import type {
  ApiMutation,
  ApiMutationCheckoutLoyaltyRedemptionRemoveArgs,
  ApiMutationCheckoutLoyaltyRedemptionUpdateArgs,
} from "@src/interfaces/gql-storefront-api/types";

export async function checkoutLoyaltyRedemptionUpdate(_parent: ApiMutation, args: ApiMutationCheckoutLoyaltyRedemptionUpdateArgs, ctx: GraphQLContext) {
  const { checkoutUsecase } = App.getInstance();
  try {
    const checkout = await checkoutUsecase.updateLoyaltyRedemption.execute({
      checkoutId: decodeGlobalIdByType(args.input.checkoutId, GlobalIdEntity.Checkout),
      redeemPoints: args.input.redeemPoints ?? true,
      requestedPoints: args.input.requestedPoints == null ? null : String(args.input.requestedPoints),
      programId: args.input.programId
        ? decodeGlobalIdByType(args.input.programId, GlobalIdEntity.LoyaltyProgram)
        : null,
      rewardEntitlementId: args.input.rewardEntitlementId
        ? decodeGlobalIdByType(args.input.rewardEntitlementId, GlobalIdEntity.LoyaltyRewardEntitlement)
        : null,
      storefrontAccess: ctx.storefrontAccess,
      store: ctx.store,
      customer: ctx.customer,
      user: ctx.user,
    });
    return { checkout: mapCommittedCheckoutToApi(checkout), userErrors: [] };
  } catch (error) {
    throw await fromDomainError(error);
  }
}

export async function checkoutLoyaltyRedemptionRemove(_parent: ApiMutation, args: ApiMutationCheckoutLoyaltyRedemptionRemoveArgs, ctx: GraphQLContext) {
  const { checkoutUsecase } = App.getInstance();
  try {
    const checkout = await checkoutUsecase.removeLoyaltyRedemption.execute({
      checkoutId: decodeGlobalIdByType(args.input.checkoutId, GlobalIdEntity.Checkout),
      storefrontAccess: ctx.storefrontAccess,
      store: ctx.store,
      customer: ctx.customer,
      user: ctx.user,
    });
    return { checkout: mapCommittedCheckoutToApi(checkout), userErrors: [] };
  } catch (error) {
    throw await fromDomainError(error);
  }
}
