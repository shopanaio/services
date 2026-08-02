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
    checkoutMutation: (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ) => {
      requireStorefrontPermission(
        context.storefrontAccess,
        STOREFRONT_PERMISSIONS.CHECKOUT_WRITE,
      );
      return {};
    },
  },
  CheckoutQuery: {
    checkout,
  },
  Checkout: {
    // All fields are projected from the committed pipeline snapshot.
  },
  CheckoutMutation: {
    checkoutCreate,
    checkoutLinesAdd,
    checkoutLinesUpdate,
    checkoutLinesDelete,
    checkoutLinesClear,
    checkoutLinesReplace,
    checkoutCustomerIdentityUpdate,
    checkoutCustomerNoteUpdate,
    checkoutLanguageCodeUpdate,
    checkoutCurrencyCodeUpdate,
    checkoutDeliveryAddressesAdd,
    checkoutDeliveryAddressesRemove,
    checkoutPromoCodeAdd,
    checkoutPromoCodeRemove,
    checkoutTagCreate,
    checkoutTagUpdate,
    checkoutTagDelete,
    checkoutDeliveryAddressesUpdate,
    checkoutPaymentMethodUpdate,
    checkoutDeliveryMethodUpdate,
    checkoutDeliveryRecipientsAdd,
    checkoutDeliveryRecipientsUpdate,
    checkoutDeliveryRecipientsRemove,
  },
} as any;

export default checkoutResolvers;
