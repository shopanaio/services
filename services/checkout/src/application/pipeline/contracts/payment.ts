import type { CheckoutCartIntent } from "./cartIntent.js";
import type {
  CheckoutPipelineExecutionContext,
  CheckoutPipelineJsonObject,
  CheckoutPipelineStageProvenance,
} from "./common.js";
import type { CalculateDeliveryOptionsResult } from "./delivery.js";
import type { FinalizePricingQuoteResult } from "./pricing.js";

export type CheckoutPaymentMethod = Readonly<{
  handle: string;
  code: string;
  title: string;
  provider: string;
  flow: "ONLINE" | "OFFLINE" | "ON_DELIVERY";
  metadata: CheckoutPipelineJsonObject | null;
}>;

export type GetAvailablePaymentMethodsRequest = Readonly<{
  context: CheckoutPipelineExecutionContext;
  cartIntent: CheckoutCartIntent;
  finalQuote: FinalizePricingQuoteResult;
  delivery: CalculateDeliveryOptionsResult;
}>;

export type GetAvailablePaymentMethodsResult = Readonly<
  CheckoutPipelineStageProvenance & {
    revision: string;
    basedOnFinalQuoteRevision: string;
    basedOnDeliveryRevision: string;
    methods: readonly CheckoutPaymentMethod[];
    selectedMethodHandle: string | null;
  }
>;
