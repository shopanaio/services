import type { Delivery } from "@shopana/broker-types";
import type { CalculateDeliveryOptionsParams } from "../checkout-pipeline/contracts.js";
import type { DeliveryOptionBindingCandidate } from "./ports.js";

export interface DeliveryProviderExecutionPolicySnapshot {
  revision: string;
  timeoutMs: number;
  maxAttempts: number;
  maxConcurrentRequests: number;
  retryableCategories: readonly (
    | "PROVIDER_UNAVAILABLE"
    | "TIMEOUT"
    | "RATE_LIMITED"
    | "UNKNOWN"
  )[];
  cache: Readonly<{
    /** Provider quote tokens are never reused across checkout/request identities. */
    mode: "NONE" | "IDEMPOTENT_REQUEST";
    maxAgeSeconds: number;
  }>;
}

export interface DeliveryProviderExecutionPolicyPort {
  resolve(input: Readonly<{
    storeId: string;
    providerAccountId: string;
    operation: "quoteRates";
  }>): Promise<DeliveryProviderExecutionPolicySnapshot>;
}

export interface DeliveryRateCachePort {
  get(input: Readonly<{
    storeId: string;
    checkoutId: string;
    checkoutVersion: number;
    quoteRequestId: string;
    providerAccountId: string;
    routeRevision: string;
    configurationRevision: string;
    eligibilityRevision: string;
    ratedFactsHash: string;
    effectiveAt: string;
  }>): Promise<
    | Readonly<{
        status: "HIT";
        result: Delivery.DeliveryProviderRateResult;
        cachedAt: string;
        expiresAt: string;
      }>
    | Readonly<{ status: "MISS" | "EXPIRED" }>
  >;
  put(input: Readonly<{
    storeId: string;
    checkoutId: string;
    checkoutVersion: number;
    quoteRequestId: string;
    providerAccountId: string;
    routeRevision: string;
    configurationRevision: string;
    eligibilityRevision: string;
    ratedFactsHash: string;
    effectiveAt: string;
    result: Delivery.DeliveryProviderRateResult;
    cachedAt: string;
    expiresAt: string;
  }>): Promise<void>;
}

export interface DeliveryRateOptionsResult {
  revision: string;
  groupId: string;
  eligibilityRevision: string;
  options: readonly DeliveryOptionBindingCandidate[];
  providerExecutions: readonly Delivery.DeliveryCheckoutProviderExecution[];
  issues: readonly Delivery.DeliveryCheckoutIssue[];
}

/** Aggregates static methods and eligible provider rates for exactly one group. */
export interface DeliveryRateAggregationPort {
  calculate(input: Readonly<{
    request: CalculateDeliveryOptionsParams;
    group: Delivery.DeliveryProviderRateRequest;
    eligibility: Delivery.DeliveryEligibilitySnapshot;
    executionPolicy: DeliveryProviderExecutionPolicySnapshot;
  }>): Promise<DeliveryRateOptionsResult>;
}
