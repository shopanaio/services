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

/** Provider-side handler surface for the registered Payments checkout action. */
export interface PaymentsCheckoutActionsContract {
  getCheckoutAvailablePaymentMethods(
    params: GetAvailablePaymentMethodsParams,
  ): Promise<GetAvailablePaymentMethodsResult>;
}
