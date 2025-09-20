// TODO(workspace): Remove .js extension from TypeScript imports according to workspace rules
import {
  // Query resolvers
  order,
  // Mutation resolvers
  orderCreate,
  orderLinesAdd,
  orderLinesUpdate,
  orderLinesDelete,
  orderLinesClear,
  orderCustomerIdentityUpdate,
  orderCustomerNoteUpdate,
  orderLanguageCodeUpdate,
  orderCurrencyCodeUpdate,
  orderDeliveryAddressesAdd,
  orderDeliveryAddressesRemove,
  orderPromoCodeAdd,
  orderPromoCodeRemove,
  orderDeliveryAddressesUpdate,
  orderDeliveryMethodUpdate,
  // OrderDeliveryGroup resolvers
  selectedDeliveryMethod,
  estimatedCost,
  deliveryMethods,
} from "./order/index";

const orderResolvers = {
  Query: {
    orderQuery: (_parent: unknown) => ({}),
  },
  Mutation: {
    orderMutation: (_parent: unknown) => ({}),
  },
  OrderQuery: {
    order,
  },
  Order: {
    // Fields totalQuantity and lines are filled in mapper from full read-model
  },
  OrderDeliveryGroup: {
    selectedDeliveryMethod,
    estimatedCost,
    deliveryMethods,
  },
  OrderMutation: {
    orderCreate,
    orderLinesAdd,
    orderLinesUpdate,
    orderLinesDelete,
    orderLinesClear,
    orderCustomerIdentityUpdate,
    orderCustomerNoteUpdate,
    orderLanguageCodeUpdate,
    orderCurrencyCodeUpdate,
    orderDeliveryAddressesAdd,
    orderDeliveryAddressesRemove,
    orderPromoCodeAdd,
    orderPromoCodeRemove,
    orderDeliveryAddressesUpdate,
    orderDeliveryMethodUpdate,
  },
} as any;

export default orderResolvers;
