import type { Customers } from "@shopana/broker-types";

export type ResolveBuyerEligibilityParams =
  Customers.ResolveCheckoutBuyerEligibilityParams;
export type ResolveBuyerEligibilityResult =
  Customers.ResolveCheckoutBuyerEligibilityResult;

export interface CustomersCheckoutEligibilityPort {
  resolveBuyerEligibility(
    params: ResolveBuyerEligibilityParams,
  ): Promise<ResolveBuyerEligibilityResult>;
}

/** Intentional scaffolding; registration belongs with the real resolver. */
export interface CustomersCheckoutActionsContract {
  resolveCheckoutBuyerEligibility(
    params: ResolveBuyerEligibilityParams,
  ): Promise<ResolveBuyerEligibilityResult>;
}
