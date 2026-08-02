import type {
  CheckoutRecalculationRequest,
  ValidateCheckoutRequest,
} from "../contracts/index.js";

const money = { amountMinor: "0", currencyCode: "USD" } as const;

export function validationRequestFixture(): ValidateCheckoutRequest {
  const now = Date.now();
  const context = {
    executionId: "execution-1",
    correlationId: "correlation-1",
    deadlineAt: new Date(now + 60_000).toISOString(),
    requestedAt: new Date(now).toISOString(),
    checkoutId: "checkout-1",
    expectedCheckoutVersion: 3,
    storeId: "store-1",
    currencyCode: "USD",
    localeCode: null,
    channelCode: "web",
    effectiveAt: new Date(now).toISOString(),
    buyer: {
      customerId: "customer-secret",
      email: "private@example.com",
      phone: "+380000000000",
      countryCode: "UA",
      marketId: "market-1",
      companyId: "company-1",
      segmentIds: ["segment-1"],
      segmentMembershipRevision: "segments-v1",
      data: { privateBuyerData: "buyer-data-secret" },
    },
  } as const;
  const cartIntent = {
    lines: [],
    discountCodes: [],
    destinations: [],
    selectedDeliveryOptions: [],
    selectedPaymentMethod: null,
    attributes: { privateCartAttribute: "cart-attribute-secret" },
  } as const;
  const preliminary = {
    executionId: context.executionId,
    checkoutId: context.checkoutId,
    basedOnCheckoutVersion: context.expectedCheckoutVersion,
    currencyCode: context.currencyCode,
    preliminaryQuoteId: "preliminary-1",
    revision: "preliminary-v1",
    discountEvaluationRevision: "discounts-preliminary-v1",
    transformedLines: [],
    sourceLineResolutions: [],
    deliveryIntent: {
      revision: "delivery-intent-v1",
      lineage: [],
      destinations: [],
      unassignedPhysicalLineIds: [],
    },
    merchandiseRevision: "merchandise-v1",
    availabilityRevision: "availability-v1",
    appliedDiscounts: [],
    discountCodeResolutions: [],
    usageRequirements: [],
    preliminaryTotals: {
      merchandiseSubtotal: money,
      merchandiseDiscountTotal: money,
      merchandiseTotal: money,
    },
  } as const;
  const delivery = {
    executionId: context.executionId,
    checkoutId: context.checkoutId,
    basedOnCheckoutVersion: context.expectedCheckoutVersion,
    currencyCode: context.currencyCode,
    revision: "delivery-v1",
    basedOnPreliminaryRevision: preliminary.revision,
    ratePlanRevision: "rate-plan-v1",
    eligibilityRevision: "delivery-eligibility-v1",
    customizationRevision: "delivery-customization-v1",
    customizationPolicyRevision: "delivery-policy-v1",
    groups: [],
    orphanedSelectionResets: [],
    carrierServiceExecutions: [],
    issues: [],
  } as const;
  const finalQuote = {
    executionId: context.executionId,
    checkoutId: context.checkoutId,
    basedOnCheckoutVersion: context.expectedCheckoutVersion,
    currencyCode: context.currencyCode,
    quoteId: "quote-1",
    revision: "final-v1",
    discountEvaluationRevision: "discounts-final-v1",
    basedOnPreliminaryDiscountEvaluationRevision:
      preliminary.discountEvaluationRevision,
    basedOnPreliminaryRevision: preliminary.revision,
    basedOnDeliveryRevision: delivery.revision,
    lines: [],
    appliedDiscounts: [],
    discountCodeResolutions: [],
    usageRequirements: [],
    totals: {
      merchandiseSubtotal: money,
      merchandiseDiscountTotal: money,
      merchandiseTotal: money,
      taxTotal: money,
      deliverySubtotal: money,
      deliveryDiscountTotal: money,
      deliveryTotal: money,
      payableTotal: money,
    },
  } as const;
  const payment = {
    executionId: context.executionId,
    checkoutId: context.checkoutId,
    basedOnCheckoutVersion: context.expectedCheckoutVersion,
    currencyCode: context.currencyCode,
    revision: "payment-v1",
    discoveryRevision: "payment-discovery-v1",
    customizationRevision: "payment-customization-v1",
    basedOnFinalQuoteRevision: finalQuote.revision,
    basedOnDeliveryRevision: delivery.revision,
    methods: [],
    selection: { status: "NONE" },
    issues: [],
  } as const;
  return {
    context,
    cartIntent,
    preliminary,
    delivery,
    finalQuote,
    payment,
  };
}

export function recalculationRequestFixture(): CheckoutRecalculationRequest {
  const { context, cartIntent } = validationRequestFixture();
  return { context, change: "CREATE", cartIntent };
}
