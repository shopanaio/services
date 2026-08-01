import type { CheckoutPaymentMethodSelectionIntent } from "./cartIntent.js";
import type {
  CheckoutPipelineJsonObject,
  CheckoutPipelineEligibilityContext,
  CheckoutPipelineStageProvenance,
} from "./common.js";
import type {
  CheckoutPricingDeliverySnapshot,
  FinalizePricingQuoteResult,
} from "./pricing.js";

export type CheckoutPaymentMethod = Readonly<{
  handle: string;
  code: string;
  title: string;
  provider: string;
  flow: "ONLINE" | "OFFLINE" | "ON_DELIVERY";
  metadata: CheckoutPipelineJsonObject | null;
}>;

export type CheckoutPaymentMethodSelectionResolution =
  | Readonly<{ status: "NONE" }>
  | Readonly<{
      status: "SELECTED";
      methodHandle: string;
      customerInput: CheckoutPipelineJsonObject | null;
    }>
  | Readonly<{
      status: "RESET";
      previousMethodHandle: string;
      customerInput: CheckoutPipelineJsonObject | null;
      reason: Readonly<{ code: string; message: string }>;
    }>;

export type GetAvailablePaymentMethodsRequest = Readonly<{
  context: CheckoutPipelineEligibilityContext;
  selection: CheckoutPaymentMethodSelectionIntent | null;
  finalQuote: FinalizePricingQuoteResult;
  delivery: CheckoutPricingDeliverySnapshot;
}>;

export type GetAvailablePaymentMethodsResult = Readonly<
  CheckoutPipelineStageProvenance & {
    revision: string;
    basedOnFinalQuoteRevision: string;
    basedOnDeliveryRevision: string;
    methods: readonly CheckoutPaymentMethod[];
    selection: CheckoutPaymentMethodSelectionResolution;
  }
>;
