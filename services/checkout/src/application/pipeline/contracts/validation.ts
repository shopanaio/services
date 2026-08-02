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

export type CheckoutNativeValidationRule =
  | "CART_EMPTY"
  | "LINE_UNAVAILABLE"
  | "LINE_QUANTITY_EXCEEDED"
  | "DELIVERY_ADDRESS_REQUIRED"
  | "DELIVERY_OPTIONS_UNAVAILABLE"
  | "DELIVERY_OPTION_REQUIRED"
  | "DELIVERY_OPTION_INVALID"
  | "DELIVERY_OPTION_ORPHANED"
  | "PAYMENT_METHODS_UNAVAILABLE"
  | "PAYMENT_METHOD_REQUIRED"
  | "PAYMENT_METHOD_INVALID";

export type CheckoutValidationOperationSource =
  | Readonly<{ type: "NATIVE"; rule: CheckoutNativeValidationRule }>
  | Readonly<{
      type: "FUNCTION";
      target: "cart.validations.generate.run";
      implementationId: string;
      functionBindingId: string;
    }>;

export type CheckoutValidationFunctionOperation = Readonly<{
  code: string;
  message: string;
  severity: "WARNING" | "ERROR";
  field: readonly string[];
  lineId: string | null;
}>;

export type CheckoutValidationFunctionOutput = Readonly<{
  schemaVersion: 1;
  operations: readonly CheckoutValidationFunctionOperation[];
}>;

export type CheckoutValidationOperation = Readonly<
  CheckoutValidationFunctionOperation & {
    source: CheckoutValidationOperationSource;
  }
>;

export type ValidateCheckoutResult = Readonly<
  CheckoutPipelineStageProvenance & {
    revision: string;
    basedOnFinalQuoteRevision: string;
    basedOnPaymentRevision: string;
    bindingSetRevision: string;
    /** True iff operations contain no ERROR entries. */
    valid: boolean;
    operations: readonly CheckoutValidationOperation[];
  }
>;
