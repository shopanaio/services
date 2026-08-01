import type { Delivery } from "@shopana/broker-types";
import type { CalculateDeliveryOptionsParams } from "../checkout-pipeline/contracts.js";
import type { DeliveryOptionBindingCandidate } from "./ports.js";

export interface DeliveryRateOptionsResult {
  revision: string;
  groupId: string;
  eligibilityRevision: string;
  options: readonly DeliveryOptionBindingCandidate[];
  providerExecutions: readonly Delivery.DeliveryCheckoutProviderExecution[];
  issues: readonly Delivery.DeliveryCheckoutIssue[];
  /** Minimum expiry across every returned binding. */
  expiresAt: string;
}

/** Aggregates static methods and eligible provider rates for exactly one group. */
export interface DeliveryRateAggregationPort {
  calculate(input: Readonly<{
    request: CalculateDeliveryOptionsParams;
    group: Delivery.DeliveryProviderRateRequest;
    eligibility: Delivery.DeliveryEligibilitySnapshot;
  }>): Promise<DeliveryRateOptionsResult>;
}
