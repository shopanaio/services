import type {
  GetAvailablePaymentMethodsRequest,
  GetAvailablePaymentMethodsResult,
} from "../contracts/index.js";

/**
 * Checkout-owned interface implemented by the Payments broker adapter.
 * The adapter must use the exported request parser before the call and the
 * request-relative result parser for every untrusted broker response.
 */
export interface PaymentsCheckoutPort {
  getAvailableMethods(
    request: GetAvailablePaymentMethodsRequest,
  ): Promise<GetAvailablePaymentMethodsResult>;
}
