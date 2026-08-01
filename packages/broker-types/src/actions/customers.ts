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
      code: "CUSTOMER_NOT_FOUND" | "BUYER_ELIGIBILITY_RESOLUTION_FAILED";
      message: string;
      retryable: boolean;
    }>;
