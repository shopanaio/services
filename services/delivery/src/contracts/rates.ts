import type { Delivery } from "@shopana/broker-types";
import type { CalculateDeliveryOptionsParams } from "../checkout-pipeline/contracts.js";
import type { DeliveryOptionBindingCandidate } from "./ports.js";

export interface DeliveryProviderExecutionPolicySnapshot {
  revision: string;
  timeoutMs: number;
  /** Shopify Carrier Service semantics: one callback attempt, no retries. */
  maxAttempts: 1;
  maxConcurrentRequests: number;
  retryableCategories: readonly [];
  cache: Readonly<{
    /** Successful snapshots are reused only for the identical checkout request. */
    mode: "NONE" | "IDEMPOTENT_REQUEST";
    maxAgeSeconds: number;
  }>;
}

export interface DeliveryProviderExecutionPolicyPort {
  resolve(
    input: Readonly<{
      storeId: string;
      carrierServiceAccountId: string;
      operation: "quoteRates";
    }>,
  ): Promise<DeliveryProviderExecutionPolicySnapshot>;
}

export interface DeliveryRateCachePort {
  get(
    input: Readonly<{
      storeId: string;
      checkoutId: string;
      quoteRequestId: string;
      carrierServiceAccountId: string;
      routeRevision: string;
      carrierServiceConfigurationRevision: string;
      executionPolicyRevision: string;
      eligibilityRevision: string;
      ratedFactsHash: string;
      effectiveAt: string;
    }>,
  ): Promise<
    | Readonly<{
        status: "HIT";
        /** Only successful provider responses, including an empty no-service result, are cacheable. */
        result: Delivery.DeliveryCarrierServiceRateResult;
        cachedAt: string;
        expiresAt: string;
      }>
    | Readonly<{ status: "MISS" | "EXPIRED" }>
  >;
  put(
    input: Readonly<{
      storeId: string;
      checkoutId: string;
      quoteRequestId: string;
      carrierServiceAccountId: string;
      routeRevision: string;
      carrierServiceConfigurationRevision: string;
      executionPolicyRevision: string;
      eligibilityRevision: string;
      ratedFactsHash: string;
      effectiveAt: string;
      result: Delivery.DeliveryCarrierServiceRateResult;
      cachedAt: string;
      /** Must not exceed the execution policy maxAge. */
      expiresAt: string;
    }>,
  ): Promise<void>;
}

export interface DeliveryRateOptionsResult {
  revision: string;
  groupId: string;
  eligibilityRevision: string;
  options: readonly DeliveryOptionBindingCandidate[];
  carrierServiceExecutions: readonly Delivery.DeliveryCheckoutCarrierServiceExecution[];
  issues: readonly Delivery.DeliveryCheckoutIssue[];
}

/** Aggregates manual methods and eligible carrier-service rates for one group. */
export interface DeliveryRateAggregationPort {
  calculate(
    input: Readonly<{
      request: CalculateDeliveryOptionsParams;
      group: Delivery.DeliveryCarrierServiceRateRequest;
      eligibility: Delivery.DeliveryEligibilitySnapshot;
      executionPolicy: DeliveryProviderExecutionPolicySnapshot;
    }>,
  ): Promise<DeliveryRateOptionsResult>;
}
