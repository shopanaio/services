import type { CheckoutCartIntent } from "./cartIntent.js";
import type {
  CheckoutPipelineExecutionContext,
  CheckoutPipelineStageProvenance,
} from "./common.js";
import type { CalculateDeliveryOptionsResult } from "./delivery.js";
import type { GetAvailablePaymentMethodsResult } from "./payment.js";
import type {
  CalculatePreliminaryPricingResult,
  FinalizePricingQuoteResult,
} from "./pricing.js";

export type ValidateCheckoutRequest = Readonly<{
  context: CheckoutPipelineExecutionContext;
  cartIntent: CheckoutCartIntent;
  preliminary: CalculatePreliminaryPricingResult;
  delivery: CalculateDeliveryOptionsResult;
  finalQuote: FinalizePricingQuoteResult;
  payment: GetAvailablePaymentMethodsResult;
}>;

export type CheckoutValidationOperation = Readonly<{
  code: string;
  message: string;
  severity: "WARNING" | "ERROR";
  field: readonly string[];
  lineId: string | null;
}>;

export type ValidateCheckoutResult = Readonly<
  CheckoutPipelineStageProvenance & {
    revision: string;
    basedOnFinalQuoteRevision: string;
    basedOnPaymentRevision: string;
    /** True iff operations contain no ERROR entries. */
    valid: boolean;
    operations: readonly CheckoutValidationOperation[];
  }
>;
