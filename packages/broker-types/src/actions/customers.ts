export const CustomersCheckoutActionNames = {
  resolveBuyerEligibility: "resolveCheckoutBuyerEligibility",
} as const;

export const CustomersCheckoutActions = {
  resolveBuyerEligibility:
    `customers.${CustomersCheckoutActionNames.resolveBuyerEligibility}`,
} as const;

export const CustomersComparisonActionNames = {
  getSelection: "getCustomerComparisonSelection",
} as const;

export const CustomersComparisonActions = {
  getSelection:
    `customers.${CustomersComparisonActionNames.getSelection}`,
} as const;

export interface GetCustomerComparisonSelectionParams {
  storeId: string;
  customerId: string;
}

export type GetCustomerComparisonSelectionResult =
  | Readonly<{
      ok: true;
      revision: number;
      items: readonly Readonly<{
        productId: string;
        variantId: string;
        position: number;
      }>[];
    }>
  | Readonly<{
      ok: false;
      code:
        | "CUSTOMER_NOT_FOUND"
        | "CUSTOMER_COMPARISON_CALLER_FORBIDDEN"
        | "CUSTOMER_COMPARISON_READ_FAILED";
      message: string;
      retryable: boolean;
    }>;

export interface ResolveCheckoutBuyerEligibilityParams {
  storeId: string;
  customerId: string;
  /** Membership expiry/dynamic evaluation boundary. */
  effectiveAt: string;
}

export type CustomerCheckoutIneligibilityReason =
  | "DISABLED"
  | "BLOCKED"
  | "MERGED"
  | "REDACTED";

export type ResolveCheckoutBuyerEligibilityResult =
  | Readonly<{
      ok: true;
      storeId: string;
      customerId: string;
      effectiveAt: string;
      segmentIds: readonly string[];
      /** Revision of memberships and segment definitions used by the read. */
      segmentMembershipRevision: string;
    }>
  | Readonly<{
      ok: false;
      code: "CUSTOMER_NOT_FOUND";
      message: string;
      retryable: false;
    }>
  | Readonly<{
      ok: false;
      code: "CUSTOMER_NOT_ELIGIBLE";
      reason: CustomerCheckoutIneligibilityReason;
      message: string;
      retryable: false;
    }>
  | Readonly<{
      ok: false;
      code: "BUYER_ELIGIBILITY_LIMIT_EXCEEDED";
      message: string;
      retryable: false;
    }>
  | Readonly<{
      ok: false;
      code: "BUYER_ELIGIBILITY_RESOLUTION_FAILED";
      message: string;
      retryable: true;
    }>;
