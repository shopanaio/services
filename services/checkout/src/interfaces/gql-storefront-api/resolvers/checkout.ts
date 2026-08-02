// TODO(workspace): Remove .js extension from TypeScript imports according to workspace rules
import {
  // Query resolvers
  checkout,
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
} from "./checkout/index";
import {
  requireStorefrontPermission,
  STOREFRONT_PERMISSIONS,
} from "@shopana/shared-context";
import type { GraphQLContext } from "../context";

const checkoutResolvers = {
  Query: {
    checkoutQuery: (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ) => {
      requireStorefrontPermission(
        context.storefrontAccess,
        STOREFRONT_PERMISSIONS.CHECKOUT_READ,
      );
      return {};
    },
  },
  Mutation: {
    checkoutMutation: () => ({}),
  },
  CheckoutQuery: {
    checkout,
  },
  Checkout: {
    // All fields are projected from the committed pipeline snapshot.
  },
  CheckoutMutation: {
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
} as any;

function withCheckoutWrite<TParent, TArgs, TResult>(
  resolver: CheckoutMutationResolver<TParent, TArgs, TResult>,
): CheckoutMutationResolver<TParent, TArgs, TResult> {
  return withPermission(STOREFRONT_PERMISSIONS.CHECKOUT_WRITE, resolver);
}

type CheckoutMutationResolver<TParent, TArgs, TResult> = (
  parent: TParent,
  args: TArgs,
  context: GraphQLContext,
  ...rest: unknown[]
) => TResult;

function withPermission<TParent, TArgs, TResult>(
  permission: Parameters<typeof requireStorefrontPermission>[1],
  resolver: CheckoutMutationResolver<TParent, TArgs, TResult>,
): CheckoutMutationResolver<TParent, TArgs, TResult> {
  return (parent, args, context, ...rest) => {
    requireStorefrontPermission(context.storefrontAccess, permission);
    return resolver(parent, args, context, ...rest);
  };
}

export default checkoutResolvers;
