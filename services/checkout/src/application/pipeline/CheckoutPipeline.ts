import type {
  CalculateDeliveryOptionsResult,
  CalculateDeliveryOptionsRequest,
  CalculatePreliminaryPricingRequest,
  CalculatePreliminaryPricingResult,
  CheckoutRecalculationRequest,
  CheckoutRecalculationResult,
  FinalizePricingQuoteRequest,
  FinalizePricingQuoteResult,
  GetAvailablePaymentMethodsRequest,
  GetAvailablePaymentMethodsResult,
  ValidateCheckoutRequest,
  ValidateCheckoutResult,
} from "./contracts/index.js";
import type {
  CheckoutValidationPort,
  DeliveryCheckoutPort,
  PaymentsCheckoutPort,
  PricingCheckoutPort,
} from "./ports/index.js";

export interface CheckoutPipelinePorts {
  readonly pricing: PricingCheckoutPort;
  readonly delivery: DeliveryCheckoutPort;
  readonly payments: PaymentsCheckoutPort;
  readonly validation: CheckoutValidationPort;
}

export interface CheckoutPipeline {
  recalculate(
    request: CheckoutRecalculationRequest,
  ): Promise<CheckoutRecalculationResult>;
}

/**
 * Typed orchestration boundary for every checkout change that can affect
 * merchandise, availability, money, delivery, payment or validation.
 *
 * Pricing owns merchandise resolution, cart transforms, availability snapshots,
 * discounts and monetary arithmetic. Checkout only sequences domain stages and
 * returns a version-bound snapshot that its caller must apply with compare-and-
 * swap on checkout version.
 */
export abstract class BaseCheckoutPipeline implements CheckoutPipeline {
  protected constructor(protected readonly ports: CheckoutPipelinePorts) {}

  // TODO(checkout-pipeline): implement deterministic orchestration, deadline
  // enforcement, short-circuit rules, issue aggregation and execution trace.
  abstract recalculate(
    request: CheckoutRecalculationRequest,
  ): Promise<CheckoutRecalculationResult>;

  // TODO(checkout-pipeline): ask Pricing to resolve canonical merchandise,
  // availability, cart transforms, line discounts and preliminary totals.
  protected abstract calculatePreliminaryPricing(
    request: CalculatePreliminaryPricingRequest,
  ): Promise<CalculatePreliminaryPricingResult>;

  // TODO(checkout-pipeline): calculate carrier/provider options from canonical
  // transformed physical lines. Build destinations with the exported
  // toCheckoutDeliveryDestinations helper; source cart line IDs are invalid.
  protected abstract calculateDelivery(
    request: CalculateDeliveryOptionsRequest,
  ): Promise<CalculateDeliveryOptionsResult>;

  // TODO(checkout-pipeline): finalize delivery discounts and payable total after
  // Delivery returns selected option costs. V1 emits explicit zero tax totals.
  protected abstract finalizePricing(
    request: FinalizePricingQuoteRequest,
  ): Promise<FinalizePricingQuoteResult>;

  // TODO(checkout-pipeline): resolve payment methods only from the final quote
  // so payment customization observes the final payable amount.
  protected abstract calculatePayments(
    request: GetAvailablePaymentMethodsRequest,
  ): Promise<GetAvailablePaymentMethodsResult>;

  // TODO(checkout-pipeline): validate the complete immutable snapshot including
  // cart intent and every successful upstream stage.
  protected abstract validateCheckout(
    request: ValidateCheckoutRequest,
  ): Promise<ValidateCheckoutResult>;
}
