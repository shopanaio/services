import type { Payments } from "@shopana/broker-types";

export type GetAvailablePaymentMethodsParams =
  Payments.GetCheckoutAvailablePaymentMethodsParams;
export type GetAvailablePaymentMethodsResult =
  Payments.GetCheckoutAvailablePaymentMethodsResult;

/** Payments-owned application boundary consumed by its broker adapter. */
export interface PaymentsCheckoutMethodsPort {
  getAvailableMethods(
    params: GetAvailablePaymentMethodsParams,
  ): Promise<GetAvailablePaymentMethodsResult>;
}

/**
 * Provider-side handler surface for PaymentsCheckoutActions.
 * Intentional scaffolding: do not register the broker action before a real
 * implementation can return contract-valid methods.
 */
export interface PaymentsCheckoutActionsContract {
  getCheckoutAvailablePaymentMethods(
    params: GetAvailablePaymentMethodsParams,
  ): Promise<GetAvailablePaymentMethodsResult>;
}
