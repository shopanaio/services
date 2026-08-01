import type {
  CalculateDeliveryOptionsResult,
  CalculatePreliminaryPricingResult,
  CheckoutRecalculationRequest,
  CheckoutRecalculationResult,
  FinalizePricingQuoteResult,
  GetAvailablePaymentMethodsResult,
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
    request: CheckoutRecalculationRequest,
  ): Promise<CalculatePreliminaryPricingResult>;

  // TODO(checkout-pipeline): calculate carrier/provider options from canonical
  // transformed physical lines and complete delivery destinations.
  protected abstract calculateDelivery(
    request: CheckoutRecalculationRequest,
    preliminary: CalculatePreliminaryPricingResult,
  ): Promise<CalculateDeliveryOptionsResult>;

  // TODO(checkout-pipeline): finalize delivery discounts, taxes and payable
  // total after Delivery returns the selected option costs.
  protected abstract finalizePricing(
    request: CheckoutRecalculationRequest,
    preliminary: CalculatePreliminaryPricingResult,
    delivery: CalculateDeliveryOptionsResult,
  ): Promise<FinalizePricingQuoteResult>;

  // TODO(checkout-pipeline): resolve payment methods only from the final quote
  // so payment customization observes the final payable amount.
  protected abstract calculatePayments(
    request: CheckoutRecalculationRequest,
    finalQuote: FinalizePricingQuoteResult,
    delivery: CalculateDeliveryOptionsResult,
  ): Promise<GetAvailablePaymentMethodsResult>;

  // TODO(checkout-pipeline): validate the complete immutable snapshot including
  // cart intent and every successful upstream stage.
  protected abstract validateCheckout(
    request: CheckoutRecalculationRequest,
    preliminary: CalculatePreliminaryPricingResult,
    delivery: CalculateDeliveryOptionsResult,
    finalQuote: FinalizePricingQuoteResult,
    payment: GetAvailablePaymentMethodsResult,
  ): Promise<ValidateCheckoutResult>;
}
