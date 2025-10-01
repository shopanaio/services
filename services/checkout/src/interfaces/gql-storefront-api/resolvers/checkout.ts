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
  },
} as any;

export default checkoutResolvers;
