import type {
  CalculateDeliveryOptionsRequest,
  CalculateDeliveryOptionsResult,
} from "../contracts/index.js";

/**
 * Checkout-owned interface implemented by the Delivery broker adapter.
 * The adapter must use the exported request parser before the call and the
 * request-relative result parser for every untrusted broker response.
 */
export interface DeliveryCheckoutPort {
  calculateOptions(
    request: CalculateDeliveryOptionsRequest,
  ): Promise<CalculateDeliveryOptionsResult>;
}
