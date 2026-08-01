import type { Delivery } from "@shopana/broker-types";

export type CalculateDeliveryOptionsParams =
  Delivery.CalculateCheckoutDeliveryOptionsParams;
export type CalculateDeliveryOptionsResult =
  Delivery.CalculateCheckoutDeliveryOptionsResult;

/** Delivery-owned application boundary consumed by its broker adapter. */
export interface DeliveryCheckoutOptionsPort {
  calculateOptions(
    params: CalculateDeliveryOptionsParams,
  ): Promise<CalculateDeliveryOptionsResult>;
}

/**
 * Provider-side handler surface for DeliveryCheckoutActions.
 * Intentional scaffolding: do not register the broker action before a real
 * implementation can return contract-valid options.
 */
export interface DeliveryCheckoutActionsContract {
  calculateCheckoutDeliveryOptions(
    params: CalculateDeliveryOptionsParams,
  ): Promise<CalculateDeliveryOptionsResult>;
}
