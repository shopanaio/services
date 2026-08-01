/**
 * Checkout-facing aliases for the Payments broker boundary. The canonical
 * cross-service contract lives in @shopana/broker-types.
 */
export type {
  GetCheckoutAvailablePaymentMethodsParams as GetAvailablePaymentMethodsRequest,
  GetCheckoutAvailablePaymentMethodsResult as GetAvailablePaymentMethodsResult,
  PaymentsCheckoutDeliveryGroupSnapshot as CheckoutPaymentDeliveryGroupSnapshot,
  PaymentsCheckoutDeliverySnapshot as CheckoutPaymentDeliverySnapshot,
  PaymentsCheckoutDestinationSnapshot as CheckoutPaymentDestinationSnapshot,
  PaymentsCheckoutMethod as CheckoutPaymentMethod,
  PaymentsCheckoutMethodSelectionResolution as CheckoutPaymentMethodSelectionResolution,
  PaymentsCheckoutSelectedDeliveryOption as CheckoutPaymentSelectedDeliveryOption,
} from "@shopana/broker-types";
