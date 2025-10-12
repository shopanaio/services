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
  // CheckoutDeliveryGroup resolvers
  selectedDeliveryMethod,
  estimatedCost,
  deliveryMethods,
  checkoutDeliveryRecipientsAdd,
  checkoutDeliveryRecipientsRemove,
  checkoutDeliveryRecipientsUpdate,
  checkoutLinesReplace,
} from "./checkout/index";

const checkoutResolvers = {
  Query: {
    checkoutQuery: (_parent: unknown) => ({}),
  },
  Mutation: {
    checkoutMutation: (_parent: unknown) => ({}),
  },
  CheckoutQuery: {
    checkout,
  },
  Checkout: {
    // Fields totalQuantity and lines are filled in mapper from full read-model
  },
  CheckoutDeliveryGroup: {
    selectedDeliveryMethod,
    estimatedCost,
    deliveryMethods,
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
    checkoutDeliveryAddressesUpdate,
    checkoutPaymentMethodUpdate,
    checkoutDeliveryMethodUpdate,
    checkoutDeliveryRecipientsAdd,
    checkoutDeliveryRecipientsUpdate,
    checkoutDeliveryRecipientsRemove,
  },
} as any;

export default checkoutResolvers;
