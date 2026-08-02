import type { ServiceBroker } from "@shopana/shared-kernel";
import {
  CustomersCheckoutActions,
  DeliveryCheckoutActions,
  PaymentsCheckoutActions,
  PricingCheckoutActions,
  type Customers,
} from "@shopana/broker-types";
import {
  parseCalculateDeliveryOptionsRequest,
  parseCalculateDeliveryOptionsResult,
  parseCalculatePreliminaryPricingRequest,
  parseCalculatePreliminaryPricingResult,
  parseFinalizePricingQuoteRequest,
  parseFinalizePricingQuoteResult,
  parseGetAvailablePaymentMethodsRequest,
  parseGetAvailablePaymentMethodsResult,
} from "../../application/pipeline/boundaries.js";
import { CheckoutPipelineStageError } from "../../application/pipeline/CheckoutPipelineStageError.js";
import type {
  CalculateDeliveryOptionsRequest,
  CalculateDeliveryOptionsResult,
  CalculatePreliminaryPricingRequest,
  CalculatePreliminaryPricingResult,
  FinalizePricingQuoteRequest,
  FinalizePricingQuoteResult,
  GetAvailablePaymentMethodsRequest,
  GetAvailablePaymentMethodsResult,
} from "../../application/pipeline/contracts/index.js";
import type {
  DeliveryCheckoutPort,
  PaymentsCheckoutPort,
  PricingCheckoutPort,
} from "../../application/pipeline/ports/index.js";
import {
  CheckoutMutationError,
  type CheckoutBuyerEligibilityPort,
  type CheckoutBuyerEligibilitySnapshot,
} from "../../application/mutations/contracts.js";

export class BrokerPricingCheckoutAdapter implements PricingCheckoutPort {
  constructor(private readonly broker: ServiceBroker) {}

  async calculatePreliminaryQuote(
    raw: CalculatePreliminaryPricingRequest,
  ): Promise<CalculatePreliminaryPricingResult> {
    const request = parseCalculatePreliminaryPricingRequest(raw);
    try {
      const result = await this.broker.call(
        PricingCheckoutActions.calculatePreliminaryQuote,
        request,
      );
      return parseCalculatePreliminaryPricingResult(request, result);
    } catch (cause) {
      throw stageFailure(
        cause,
        "CHECKOUT_PRELIMINARY_PRICING_UNAVAILABLE",
        "Checkout pricing is temporarily unavailable.",
      );
    }
  }

  async finalizeQuote(
    raw: FinalizePricingQuoteRequest,
  ): Promise<FinalizePricingQuoteResult> {
    const request = parseFinalizePricingQuoteRequest(raw);
    try {
      const result = await this.broker.call(
        PricingCheckoutActions.finalizeQuote,
        request,
      );
      return parseFinalizePricingQuoteResult(request, result);
    } catch (cause) {
      throw stageFailure(
        cause,
        "CHECKOUT_FINAL_PRICING_UNAVAILABLE",
        "Checkout pricing is temporarily unavailable.",
      );
    }
  }
}

export class BrokerDeliveryCheckoutAdapter implements DeliveryCheckoutPort {
  constructor(private readonly broker: ServiceBroker) {}

  async calculateOptions(
    raw: CalculateDeliveryOptionsRequest,
  ): Promise<CalculateDeliveryOptionsResult> {
    const request = parseCalculateDeliveryOptionsRequest(raw);
    try {
      const result = await this.broker.call(
        DeliveryCheckoutActions.calculateOptions,
        request,
      );
      return parseCalculateDeliveryOptionsResult(request, result);
    } catch (cause) {
      throw stageFailure(
        cause,
        "CHECKOUT_DELIVERY_UNAVAILABLE",
        "Checkout delivery options are temporarily unavailable.",
      );
    }
  }
}

export class BrokerPaymentsCheckoutAdapter implements PaymentsCheckoutPort {
  constructor(private readonly broker: ServiceBroker) {}

  async getAvailableMethods(
    raw: GetAvailablePaymentMethodsRequest,
  ): Promise<GetAvailablePaymentMethodsResult> {
    const request = parseGetAvailablePaymentMethodsRequest(raw);
    try {
      const result = await this.broker.call(
        PaymentsCheckoutActions.getAvailableMethods,
        request,
      );
      return parseGetAvailablePaymentMethodsResult(request, result);
    } catch (cause) {
      throw stageFailure(
        cause,
        "CHECKOUT_PAYMENT_METHODS_UNAVAILABLE",
        "Checkout payment methods are temporarily unavailable.",
      );
    }
  }
}

export class BrokerCustomersCheckoutEligibilityAdapter
  implements CheckoutBuyerEligibilityPort
{
  constructor(private readonly broker: ServiceBroker) {}

  async resolve(
    input: Customers.ResolveCheckoutBuyerEligibilityParams,
  ): Promise<CheckoutBuyerEligibilitySnapshot> {
    let result: Customers.ResolveCheckoutBuyerEligibilityResult;
    try {
      result = await this.broker.call(
        CustomersCheckoutActions.resolveBuyerEligibility,
        input,
      );
    } catch (cause) {
      throw new CheckoutMutationError(
        "BUYER_ELIGIBILITY_RESOLUTION_FAILED",
        "Buyer eligibility could not be resolved.",
        true,
        { cause },
      );
    }
    if (!result.ok) {
      throw new CheckoutMutationError(
        result.code,
        result.message,
        result.retryable,
      );
    }
    if (
      result.storeId !== input.storeId ||
      result.customerId !== input.customerId ||
      result.effectiveAt !== input.effectiveAt
    ) {
      throw new CheckoutMutationError(
        "BUYER_ELIGIBILITY_RESPONSE_INVALID",
        "Buyer eligibility response did not match the checkout request.",
        true,
      );
    }
    return result;
  }
}

function stageFailure(
  cause: unknown,
  code: string,
  message: string,
): CheckoutPipelineStageError {
  if (cause instanceof CheckoutPipelineStageError) return cause;
  return new CheckoutPipelineStageError({
    code,
    message,
    retryable: true,
    cause,
  });
}
