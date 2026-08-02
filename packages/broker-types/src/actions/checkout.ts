import type { PricingCheckoutDiscountUsageRequirement } from "./pricing.js";

export const CheckoutCompletionActionNames = {
  get: "getCompletion",
} as const;

export const CheckoutCompletionActions = {
  get: `checkout.${CheckoutCompletionActionNames.get}`,
} as const;

export interface GetCheckoutCompletionParams {
  checkoutId: string;
  storeId: string;
}

export interface CheckoutCompletionSnapshot {
  checkoutId: string;
  storeId: string;
  checkoutVersion: number;
  resultRevision: string;
  valid: boolean;
  quoteId: string;
  quoteRevision: string;
  usageRequirements: readonly PricingCheckoutDiscountUsageRequirement[];
}

export type GetCheckoutCompletionResult = CheckoutCompletionSnapshot | null;
