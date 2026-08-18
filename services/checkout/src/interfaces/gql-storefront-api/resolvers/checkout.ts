// TODO(workspace): Remove .js extension from TypeScript imports according to workspace rules
import {
  // Query resolvers
  checkout,
  checkoutPlacement,
  // Mutation resolvers
  checkoutCreate,
  checkoutLinesAdd,
  checkoutLinesUpdate,
  checkoutLinesDelete,
  checkoutLinesClear,
  checkoutCustomerIdentityUpdate,
  checkoutCustomerNoteUpdate,
  checkoutLanguageCodeUpdate,
  checkoutCurrencyCodeUpdate,
  checkoutBillingAddressUpdate,
  checkoutDeliveryAddressesAdd,
  checkoutDeliveryAddressesRemove,
  checkoutPromoCodeAdd,
  checkoutPromoCodeRemove,
  checkoutDeliveryAddressesUpdate,
  checkoutDeliveryMethodUpdate,
  checkoutPaymentMethodUpdate,
  checkoutTagCreate,
  checkoutTagUpdate,
  checkoutTagDelete,
  checkoutDeliveryRecipientsAdd,
  checkoutDeliveryRecipientsRemove,
  checkoutDeliveryRecipientsUpdate,
  checkoutLinesReplace,
  placeOrder,
  checkoutLoyaltyRedemptionUpdate,
  checkoutLoyaltyRedemptionRemove,
} from "./checkout/index";
import {
  requireStorefrontPermission,
  STOREFRONT_PERMISSIONS,
} from "@shopana/shared-context";
import type { GraphQLContext } from "../context";
import { checkoutUserErrorFrom } from "../errors.js";

const checkoutResolvers = {
  Query: {
    checkout: withPermission(STOREFRONT_PERMISSIONS.CHECKOUT_READ, checkout),
    checkoutPlacement: withPermission(
      STOREFRONT_PERMISSIONS.CHECKOUT_READ,
      checkoutPlacement,
    ),
  },
  Mutation: {
    checkoutCreate: withCheckoutWrite(checkoutCreate),
    checkoutLinesAdd: withCheckoutWrite(checkoutLinesAdd),
    checkoutLinesUpdate: withCheckoutWrite(checkoutLinesUpdate),
    checkoutLinesDelete: withCheckoutWrite(checkoutLinesDelete),
    checkoutLinesClear: withCheckoutWrite(checkoutLinesClear),
    checkoutLinesReplace: withCheckoutWrite(checkoutLinesReplace),
    checkoutCustomerIdentityUpdate: withCheckoutWrite(
      checkoutCustomerIdentityUpdate,
    ),
    checkoutCustomerNoteUpdate: withCheckoutWrite(checkoutCustomerNoteUpdate),
    checkoutLanguageCodeUpdate: withCheckoutWrite(checkoutLanguageCodeUpdate),
    checkoutCurrencyCodeUpdate: withCheckoutWrite(checkoutCurrencyCodeUpdate),
    checkoutBillingAddressUpdate: withCheckoutWrite(checkoutBillingAddressUpdate),
    checkoutDeliveryAddressesAdd: withCheckoutWrite(
      checkoutDeliveryAddressesAdd,
    ),
    checkoutDeliveryAddressesRemove: withCheckoutWrite(
      checkoutDeliveryAddressesRemove,
    ),
    checkoutPromoCodeAdd: withCheckoutWrite(checkoutPromoCodeAdd),
    checkoutPromoCodeRemove: withCheckoutWrite(checkoutPromoCodeRemove),
    checkoutTagCreate: withCheckoutWrite(checkoutTagCreate),
    checkoutTagUpdate: withCheckoutWrite(checkoutTagUpdate),
    checkoutTagDelete: withCheckoutWrite(checkoutTagDelete),
    checkoutDeliveryAddressesUpdate: withCheckoutWrite(
      checkoutDeliveryAddressesUpdate,
    ),
    checkoutPaymentMethodUpdate: withCheckoutWrite(checkoutPaymentMethodUpdate),
    checkoutLoyaltyRedemptionUpdate: withCheckoutWrite(checkoutLoyaltyRedemptionUpdate),
    checkoutLoyaltyRedemptionRemove: withCheckoutWrite(checkoutLoyaltyRedemptionRemove),
    checkoutDeliveryMethodUpdate: withCheckoutWrite(
      checkoutDeliveryMethodUpdate,
    ),
    checkoutDeliveryRecipientsAdd: withCheckoutWrite(
      checkoutDeliveryRecipientsAdd,
    ),
    checkoutDeliveryRecipientsUpdate: withCheckoutWrite(
      checkoutDeliveryRecipientsUpdate,
    ),
    checkoutDeliveryRecipientsRemove: withCheckoutWrite(
      checkoutDeliveryRecipientsRemove,
    ),
    placeOrder: withPermission(STOREFRONT_PERMISSIONS.ORDER_WRITE, placeOrder),
  },
  Checkout: {
    // All fields are projected from the committed pipeline snapshot.
  },
} as any;

function withCheckoutWrite<TParent, TArgs, TResult>(
  resolver: StorefrontResolver<TParent, TArgs, TResult>,
): StorefrontResolver<TParent, TArgs, TResult> {
  return withPermission(
    STOREFRONT_PERMISSIONS.CHECKOUT_WRITE,
    async (parent, args, context, ...rest) => {
      try {
        return await resolver(parent, args, context, ...rest);
      } catch (error) {
        const userError = checkoutUserErrorFrom(error, ["input"]);
        if (!userError) throw error;
        return { checkout: null, userErrors: [userError] } as TResult;
      }
    },
  ) as StorefrontResolver<TParent, TArgs, TResult>;
}

type StorefrontResolver<TParent, TArgs, TResult> = (
  parent: TParent,
  args: TArgs,
  context: GraphQLContext,
  ...rest: unknown[]
) => TResult;

function withPermission<TParent, TArgs, TResult>(
  permission: Parameters<typeof requireStorefrontPermission>[1],
  resolver: StorefrontResolver<TParent, TArgs, TResult>,
): StorefrontResolver<TParent, TArgs, TResult> {
  return (parent, args, context, ...rest) => {
    requireStorefrontPermission(context.storefrontAccess, permission);
    return resolver(parent, args, context, ...rest);
  };
}

export default checkoutResolvers;
