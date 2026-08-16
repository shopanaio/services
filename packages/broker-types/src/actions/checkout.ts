import type { PricingCheckoutDiscountUsageRequirement } from "./pricing.js";
import type { PaymentFailure, PaymentSettlementConfirmation } from "./payments.js";

export const CheckoutCompletionActionNames = {
  get: "getCompletion",
  confirmPaymentSettlement: "confirmPaymentSettlement",
} as const;

export const CheckoutCompletionActions = {
  get: `checkout.${CheckoutCompletionActionNames.get}`,
  confirmPaymentSettlement:
    `checkout.${CheckoutCompletionActionNames.confirmPaymentSettlement}`,
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

export interface ConfirmPaymentSettlementParams {
  organizationId: string;
  storeId: string;
  checkoutId: string;
  orderId: string;
  paymentCollectionId: string;
  paymentSessionId: string;
  operationId: string;
  expectedCheckoutVersion: number;
  finalQuoteRevision: string;
  deadlineAt: string;
  correlationId: string;
}

export type ConfirmPaymentSettlementResult = PaymentSettlementConfirmation;

/** Structural helper for consumers that only need a rejected decision. */
export interface RejectedPaymentSettlementResult {
  decision: "REJECTED";
  confirmationId: string;
  confirmedAt: string;
  failure: PaymentFailure;
}
