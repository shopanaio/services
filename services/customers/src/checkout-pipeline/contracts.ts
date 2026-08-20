import type { Customers } from "@shopana/broker-types";

export type ResolveBuyerEligibilityParams = Customers.ResolveCheckoutBuyerEligibilityParams;
export type ResolveBuyerEligibilityResult = Customers.ResolveCheckoutBuyerEligibilityResult;

export interface CustomersCheckoutEligibilityPort {
  resolveBuyerEligibility(
    params: ResolveBuyerEligibilityParams,
  ): Promise<ResolveBuyerEligibilityResult>;
}

export interface CustomersCheckoutActionsContract {
  resolveCheckoutBuyerEligibility(
    params: ResolveBuyerEligibilityParams,
  ): Promise<ResolveBuyerEligibilityResult>;
}
