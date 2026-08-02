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
  | "LINES_CLEAR"
  | "LINES_REPLACE"
  | "DISCOUNT_CODES_UPDATE"
  | "BUYER_UPDATE"
  | "BUYER_ELIGIBILITY_UPDATE"
  | "CHANNEL_UPDATE"
  | "LOCALE_UPDATE"
  | "CURRENCY_UPDATE"
  | "DELIVERY_ADDRESS_UPDATE"
  | "DELIVERY_RECIPIENT_UPDATE"
  | "DELIVERY_OPTION_UPDATE"
  | "PAYMENT_METHOD_UPDATE";

export type CheckoutRecalculationRequest = Readonly<{
  /**
   * Authenticated buyer segment facts must come from the Customers eligibility
   * action at context.effectiveAt; callers must not derive membership locally.
   */
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
  /** Stable hash/revision of stage outcomes and issues; execution timing omitted. */
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
  /** Exact concatenation of all stage issues in pipeline execution order. */
  issues: readonly CheckoutPipelineIssue[];
  trace: CheckoutPipelineExecutionTrace;
}>;
