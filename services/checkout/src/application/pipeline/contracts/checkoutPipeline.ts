import type { CheckoutCartIntent } from "./cartIntent.js";
import type {
  CheckoutPipelineExecutionContext,
  CheckoutPipelineExecutionTrace,
  CheckoutPipelineIssue,
  CheckoutPipelineStageOutcome,
} from "./common.js";
import type { CalculateDeliveryOptionsResult } from "./delivery.js";
import type { GetAvailablePaymentMethodsResult } from "./payment.js";
import type {
  CalculatePreliminaryPricingResult,
  FinalizePricingQuoteResult,
} from "./pricing.js";
import type { ValidateCheckoutResult } from "./validation.js";

export type CheckoutPipelineChange =
  | "CREATE"
  | "LINES_ADD"
  | "LINES_UPDATE"
  | "LINES_DELETE"
  | "LINES_REPLACE"
  | "DISCOUNT_CODES_UPDATE"
  | "BUYER_UPDATE"
  | "CURRENCY_UPDATE"
  | "DELIVERY_ADDRESS_UPDATE"
  | "DELIVERY_OPTION_UPDATE"
  | "PAYMENT_METHOD_UPDATE";

export type CheckoutRecalculationRequest = Readonly<{
  context: CheckoutPipelineExecutionContext;
  change: CheckoutPipelineChange;
  cartIntent: CheckoutCartIntent;
}>;

/**
 * The caller may persist this snapshot only with compare-and-swap where the
 * current aggregate version equals `basedOnCheckoutVersion`. A stale result
 * must be discarded and recalculated; it must never overwrite newer state.
 */
export type CheckoutRecalculationResult = Readonly<{
  executionId: string;
  checkoutId: string;
  basedOnCheckoutVersion: number;
  resultRevision: string;
  preliminaryPricing: CheckoutPipelineStageOutcome<
    CalculatePreliminaryPricingResult,
    "PRICING_PRELIMINARY"
  >;
  delivery: CheckoutPipelineStageOutcome<
    CalculateDeliveryOptionsResult,
    "DELIVERY"
  >;
  finalPricing: CheckoutPipelineStageOutcome<
    FinalizePricingQuoteResult,
    "PRICING_FINAL"
  >;
  payment: CheckoutPipelineStageOutcome<
    GetAvailablePaymentMethodsResult,
    "PAYMENT"
  >;
  validation: CheckoutPipelineStageOutcome<
    ValidateCheckoutResult,
    "VALIDATION"
  >;
  issues: readonly CheckoutPipelineIssue[];
  trace: CheckoutPipelineExecutionTrace;
}>;
