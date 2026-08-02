export const CustomersCheckoutActionNames = {
  resolveBuyerEligibility: "resolveCheckoutBuyerEligibility",
} as const;

export const CustomersCheckoutActions = {
  resolveBuyerEligibility:
    `customers.${CustomersCheckoutActionNames.resolveBuyerEligibility}`,
} as const;

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
