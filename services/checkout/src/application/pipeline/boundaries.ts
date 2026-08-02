import type {
  CalculateDeliveryOptionsRequest,
  CalculateDeliveryOptionsResult,
  CalculatePreliminaryPricingRequest,
  CalculatePreliminaryPricingResult,
  CheckoutPipelineExecutionContext,
  CheckoutPipelineEligibilityContext,
  CheckoutPipelineStage,
  CheckoutPipelineStageContext,
  CheckoutPipelineStageProvenance,
  CheckoutDeliveryOptionSelectionIntent,
  CheckoutDeliveryOptionSelectionResolution,
  CheckoutDiscountApplication,
  CheckoutPaymentMethodSelectionIntent,
  CheckoutPaymentMethodSelectionResolution,
  CheckoutPaymentDeliverySnapshot,
  CheckoutPricingCartIntent,
  CheckoutPricingDeliverySnapshot,
  CheckoutQuotedLine,
  CheckoutRecalculationRequest,
  CheckoutRecalculationResult,
  FinalizePricingQuoteRequest,
  FinalizePricingQuoteResult,
  GetAvailablePaymentMethodsRequest,
  GetAvailablePaymentMethodsResult,
  ValidateCheckoutRequest,
  ValidateCheckoutResult,
} from "./contracts/index.js";
import {
  CHECKOUT_PIPELINE_MAX_LINES,
  CHECKOUT_PIPELINE_MAX_PAYLOAD_BYTES,
  calculateDeliveryOptionsRequestSchema,
  calculateDeliveryOptionsResultSchema,
  calculatePreliminaryPricingRequestSchema,
  calculatePreliminaryPricingResultSchema,
  checkoutRecalculationRequestSchema,
  checkoutRecalculationResultSchema,
  finalizePricingQuoteRequestSchema,
  finalizePricingQuoteResultSchema,
  getAvailablePaymentMethodsRequestSchema,
  getAvailablePaymentMethodsResultSchema,
  validateCheckoutRequestSchema,
  validateCheckoutResultSchema,
} from "./schemas.js";

export class CheckoutPipelineBoundaryError extends Error {
  readonly code = "CHECKOUT_PIPELINE_BOUNDARY_VIOLATION";

  constructor(message: string) {
    super(message);
    this.name = "CheckoutPipelineBoundaryError";
  }
}

export function toCheckoutPipelineStageContext(
  context: CheckoutPipelineExecutionContext,
): CheckoutPipelineStageContext {
  return {
    executionId: context.executionId,
    correlationId: context.correlationId,
    deadlineAt: context.deadlineAt,
    requestedAt: context.requestedAt,
    checkoutId: context.checkoutId,
    expectedCheckoutVersion: context.expectedCheckoutVersion,
    storeId: context.storeId,
    currencyCode: context.currencyCode,
    localeCode: context.localeCode,
    channelCode: context.channelCode,
    effectiveAt: context.effectiveAt,
  };
}

export function toCheckoutPipelineEligibilityContext(
  context: CheckoutPipelineExecutionContext,
): CheckoutPipelineEligibilityContext {
  return {
    ...toCheckoutPipelineStageContext(context),
    buyerEligibility:
      context.buyer === null
        ? null
        : {
            customerId: context.buyer.customerId,
            countryCode: context.buyer.countryCode,
            marketId: context.buyer.marketId,
            companyId: context.buyer.companyId,
            segmentIds: context.buyer.segmentIds,
            segmentMembershipRevision:
              context.buyer.segmentMembershipRevision,
          },
  };
}

export function toPaymentsCheckoutEvaluationContext(
  context: CheckoutPipelineExecutionContext,
): GetAvailablePaymentMethodsRequest["context"] {
  return {
    ...toCheckoutPipelineEligibilityContext(context),
    targetCheckoutVersion: context.expectedCheckoutVersion + 1,
  };
}

export function toCheckoutDeliveryContext(
  context: CheckoutPipelineExecutionContext,
): CalculateDeliveryOptionsRequest["context"] {
  return {
    ...toCheckoutPipelineEligibilityContext(context),
    targetCheckoutVersion: context.expectedCheckoutVersion + 1,
  };
}

export function toCheckoutPricingCartIntent(
  cartIntent: CheckoutRecalculationRequest["cartIntent"],
): CheckoutPricingCartIntent {
  return {
    lines: cartIntent.lines,
    discountCodes: cartIntent.discountCodes,
    destinations: cartIntent.destinations.map((destination) => ({
      destinationId: destination.destinationId,
      location: {
        countryCode: destination.address.countryCode,
        provinceCode: destination.address.provinceCode,
        postalCode: destination.address.postalCode,
      },
      lineIds: destination.lineIds,
    })),
    attributes: cartIntent.attributes,
  };
}

/**
 * Preserve Checkout-owned addresses while replacing source line IDs with the
 * canonical transformed assignments produced by Pricing.
 */
export function toCheckoutDeliveryDestinations(
  cartDestinations: CheckoutRecalculationRequest["cartIntent"]["destinations"],
  preliminary: CalculatePreliminaryPricingResult,
): CalculateDeliveryOptionsRequest["destinations"] {
  assertUnique(
    cartDestinations.map(({ destinationId }) => destinationId),
    "cart delivery destination IDs",
  );
  return preliminary.deliveryIntent.destinations.map((canonical) => {
    const source = cartDestinations.find(
      ({ destinationId }) => destinationId === canonical.destinationId,
    );
    if (source === undefined) {
      throw new CheckoutPipelineBoundaryError(
        `Missing checkout address for destination ${canonical.destinationId}`,
      );
    }
    return {
      destinationId: canonical.destinationId,
      address: source.address,
      lineIds: canonical.transformedLineIds,
    };
  });
}

export function toCheckoutPricingDeliverySnapshot(
  delivery: CalculateDeliveryOptionsResult,
): CheckoutPricingDeliverySnapshot {
  return {
    executionId: delivery.executionId,
    checkoutId: delivery.checkoutId,
    basedOnCheckoutVersion: delivery.basedOnCheckoutVersion,
    currencyCode: delivery.currencyCode,
    revision: delivery.revision,
    basedOnPreliminaryRevision: delivery.basedOnPreliminaryRevision,
    groups: delivery.groups.map((group) => ({
      groupId: group.groupId,
      lineIds: group.lineIds,
      options: group.options.map((option) => ({
        handle: option.handle,
        code: option.code,
        carrierCode: option.carrier?.code ?? null,
        deliveryMethodType: option.deliveryMethodType,
        cost: option.cost,
      })),
      selectedOptionHandle:
        group.selection.status === "SELECTED"
          ? group.selection.optionHandle
          : null,
    })),
  };
}

export function toCheckoutPaymentDeliverySnapshot(
  delivery: CalculateDeliveryOptionsResult,
  preliminary: CalculatePreliminaryPricingResult,
): CheckoutPaymentDeliverySnapshot {
  const referencedDestinationIds = new Set(
    delivery.groups.map(({ destinationId }) => destinationId),
  );
  const destinations = preliminary.deliveryIntent.destinations
    .filter(({ destinationId }) => referencedDestinationIds.has(destinationId))
    .map(({ destinationId, location }) => ({ destinationId, location }));
  assertPaymentDeliverySnapshot(
    {
      executionId: delivery.executionId,
      checkoutId: delivery.checkoutId,
      basedOnCheckoutVersion: delivery.basedOnCheckoutVersion,
      currencyCode: delivery.currencyCode,
      revision: delivery.revision,
      basedOnPreliminaryRevision: delivery.basedOnPreliminaryRevision,
      destinations,
      groups: delivery.groups.map((group) => ({
        groupId: group.groupId,
        destinationId: group.destinationId,
        lineIds: group.lineIds,
        selectedOption: toPaymentSelectedOption(group),
      })),
    },
    delivery,
  );
  return {
    executionId: delivery.executionId,
    checkoutId: delivery.checkoutId,
    basedOnCheckoutVersion: delivery.basedOnCheckoutVersion,
    currencyCode: delivery.currencyCode,
    revision: delivery.revision,
    basedOnPreliminaryRevision: delivery.basedOnPreliminaryRevision,
    destinations,
    groups: delivery.groups.map((group) => ({
      groupId: group.groupId,
      destinationId: group.destinationId,
      lineIds: group.lineIds,
      selectedOption: toPaymentSelectedOption(group),
    })),
  };
}

function toPaymentSelectedOption(
  group: CalculateDeliveryOptionsResult["groups"][number],
): CheckoutPaymentDeliverySnapshot["groups"][number]["selectedOption"] {
  if (group.selection.status !== "SELECTED") return null;
  const selectedHandle = group.selection.optionHandle;
  const option = group.options.find(({ handle }) => handle === selectedHandle);
  return option === undefined
    ? null
    : {
        handle: option.handle,
        code: option.code,
        carrierCode: option.carrier?.code ?? null,
        deliveryMethodType: option.deliveryMethodType,
        cost: option.cost,
      };
}

function toPricingDeliverySnapshot(
  delivery: CheckoutPaymentDeliverySnapshot,
): CheckoutPricingDeliverySnapshot {
  return {
    executionId: delivery.executionId,
    checkoutId: delivery.checkoutId,
    basedOnCheckoutVersion: delivery.basedOnCheckoutVersion,
    currencyCode: delivery.currencyCode,
    revision: delivery.revision,
    basedOnPreliminaryRevision: delivery.basedOnPreliminaryRevision,
    groups: delivery.groups.map((group) => ({
      groupId: group.groupId,
      lineIds: group.lineIds,
      options: group.selectedOption === null ? [] : [group.selectedOption],
      selectedOptionHandle: group.selectedOption?.handle ?? null,
    })),
  };
}

export function parseCheckoutRecalculationRequest(
  value: unknown,
): CheckoutRecalculationRequest {
  assertPayloadSize(value, "checkout recalculation request");
  const request = checkoutRecalculationRequestSchema.parse(value);
  assertLineLimit(request.cartIntent.lines, "cart intent");
  assertCartIntent(request.cartIntent);
  return request;
}

export function parseCalculatePreliminaryPricingRequest(
  value: unknown,
): CalculatePreliminaryPricingRequest {
  assertPayloadSize(value, "preliminary pricing request");
  const request = calculatePreliminaryPricingRequestSchema.parse(value);
  assertLineLimit(request.cartIntent.lines, "cart intent");
  assertPricingCartIntent(request.cartIntent);
  return request;
}

export function parseCalculateDeliveryOptionsRequest(
  value: unknown,
): CalculateDeliveryOptionsRequest {
  assertPayloadSize(value, "delivery options request");
  const request = calculateDeliveryOptionsRequestSchema.parse(value);
  assertEqual(
    request.context.targetCheckoutVersion,
    request.context.expectedCheckoutVersion + 1,
    "Delivery target checkout version must follow the committed base version",
  );
  assertProvenance(request.context, request.preliminary);
  assertPreliminaryCurrencies(request.preliminary, request.context.currencyCode);
  assertPreliminaryPricingArithmetic(request.preliminary);
  assertLineLimit(request.preliminary.transformedLines, "transformed pricing lines");
  assertDeliveryRequest(request);
  return request;
}

export function parseFinalizePricingQuoteRequest(
  value: unknown,
): FinalizePricingQuoteRequest {
  assertPayloadSize(value, "final pricing request");
  const request = finalizePricingQuoteRequestSchema.parse(value);
  assertProvenance(request.context, request.preliminary);
  assertProvenance(request.context, request.delivery);
  assertEqual(
    request.delivery.basedOnPreliminaryRevision,
    request.preliminary.revision,
    "Final pricing request contains mismatched preliminary and delivery revisions",
  );
  assertPreliminaryCurrencies(request.preliminary, request.context.currencyCode);
  assertPricingDeliveryCurrencies(request.delivery, request.context.currencyCode);
  assertPreliminaryPricingArithmetic(request.preliminary);
  assertPricingDeliverySnapshot(request.delivery, request.preliminary);
  return request;
}

export function parseGetAvailablePaymentMethodsRequest(
  value: unknown,
): GetAvailablePaymentMethodsRequest {
  assertPayloadSize(value, "payment methods request");
  const request = getAvailablePaymentMethodsRequestSchema.parse(value);
  assertEqual(
    request.context.targetCheckoutVersion,
    request.context.expectedCheckoutVersion + 1,
    "Payment target checkout version must follow the committed base version",
  );
  assertProvenance(request.context, request.finalQuote);
  assertProvenance(request.context, request.delivery);
  assertEqual(
    request.finalQuote.basedOnDeliveryRevision,
    request.delivery.revision,
    "Payment request contains mismatched final quote and delivery revisions",
  );
  assertEqual(
    request.delivery.basedOnPreliminaryRevision,
    request.finalQuote.basedOnPreliminaryRevision,
    "Payment request delivery snapshot is based on a stale preliminary quote",
  );
  assertFinalCurrencies(request.finalQuote, request.context.currencyCode);
  assertPaymentDeliveryCurrencies(request.delivery, request.context.currencyCode);
  assertFinalPricingArithmetic(request.finalQuote);
  assertDeliveryTotal(toPricingDeliverySnapshot(request.delivery), request.finalQuote);
  return request;
}

export function parseValidateCheckoutRequest(
  value: unknown,
): ValidateCheckoutRequest {
  assertPayloadSize(value, "checkout validation request");
  const request = validateCheckoutRequestSchema.parse(value) as ValidateCheckoutRequest;
  assertProvenance(request.context, request.preliminary);
  assertProvenance(request.context, request.delivery);
  assertProvenance(request.context, request.finalQuote);
  assertProvenance(request.context, request.payment);
  assertEqual(
    request.delivery.basedOnPreliminaryRevision,
    request.preliminary.revision,
    "Validation request contains a stale delivery revision",
  );
  assertEqual(
    request.finalQuote.basedOnDeliveryRevision,
    request.delivery.revision,
    "Validation request contains a stale final quote revision",
  );
  assertEqual(
    request.finalQuote.basedOnPreliminaryRevision,
    request.preliminary.revision,
    "Validation request contains a stale preliminary quote revision",
  );
  assertEqual(
    request.payment.basedOnFinalQuoteRevision,
    request.finalQuote.revision,
    "Validation request contains a stale payment revision",
  );
  assertEqual(
    request.payment.basedOnDeliveryRevision,
    request.delivery.revision,
    "Validation request contains a stale payment delivery revision",
  );
  assertPreliminaryCurrencies(request.preliminary, request.context.currencyCode);
  assertDeliveryCurrencies(request.delivery, request.context.currencyCode);
  assertFinalCurrencies(request.finalQuote, request.context.currencyCode);
  assertPreliminaryPricingArithmetic(request.preliminary);
  assertFinalPricingArithmetic(request.finalQuote);
  assertDeliveryTotal(
    toCheckoutPricingDeliverySnapshot(request.delivery),
    request.finalQuote,
  );
  assertLineLimit(request.cartIntent.lines, "cart intent");
  assertCartIntent(request.cartIntent);
  return request;
}

export function parseCalculatePreliminaryPricingResult(
  request: CalculatePreliminaryPricingRequest,
  value: unknown,
): CalculatePreliminaryPricingResult {
  assertPayloadSize(value, "preliminary pricing result");
  const result = calculatePreliminaryPricingResultSchema.parse(value);
  assertProvenance(request.context, result);
  assertPreliminaryCurrencies(result, request.context.currencyCode);
  assertPreliminaryPricingArithmetic(result);
  assertDiscountContract(
    result,
    request.cartIntent.discountCodes,
    "PRELIMINARY",
    [],
  );
  assertLineLimit(result.transformedLines, "transformed pricing lines");
  assertDeliveryIntent(request, result);
  return result;
}

export function parseCalculateDeliveryOptionsResult(
  request: CalculateDeliveryOptionsRequest,
  value: unknown,
): CalculateDeliveryOptionsResult {
  assertPayloadSize(value, "delivery options result");
  const result = calculateDeliveryOptionsResultSchema.parse(value) as CalculateDeliveryOptionsResult;
  assertProvenance(request.context, result);
  assertEqual(
    result.basedOnPreliminaryRevision,
    request.preliminary.revision,
    "Delivery result has stale preliminary revision",
  );
  assertDeliveryCurrencies(result, request.context.currencyCode);
  assertDeliveryGroups(request, result);
  return result;
}

export function parseFinalizePricingQuoteResult(
  request: FinalizePricingQuoteRequest,
  value: unknown,
): FinalizePricingQuoteResult {
  assertPayloadSize(value, "final pricing result");
  const result = finalizePricingQuoteResultSchema.parse(value);
  assertProvenance(request.context, result);
  assertEqual(
    result.basedOnPreliminaryRevision,
    request.preliminary.revision,
    "Final pricing result has stale preliminary revision",
  );
  assertEqual(
    result.basedOnDeliveryRevision,
    request.delivery.revision,
    "Final pricing result has stale delivery revision",
  );
  assertEqual(
    result.basedOnPreliminaryDiscountEvaluationRevision,
    request.preliminary.discountEvaluationRevision,
    "Final pricing result has stale preliminary discount evaluation revision",
  );
  assertFinalCurrencies(result, request.context.currencyCode);
  assertFinalPricingArithmetic(result);
  assertDeliveryTotal(request.delivery, result);
  assertDiscountContract(
    result,
    request.preliminary.discountCodeResolutions.map(({ inputCode }) => inputCode),
    "FINAL",
    request.delivery.groups.map(({ groupId }) => groupId),
  );
  assertLineLimit(result.lines, "final pricing lines");
  assertJsonEqual(
    result.lines,
    request.preliminary.transformedLines,
    "Final pricing changed immutable merchandise lines",
  );
  assertJsonEqual(
    result.appliedDiscounts.filter(
      ({ discountClass }) => discountClass !== "SHIPPING",
    ),
    request.preliminary.appliedDiscounts,
    "Final pricing changed immutable merchandise discount applications",
  );
  assertJsonEqual(
    {
      merchandiseSubtotal: result.totals.merchandiseSubtotal,
      merchandiseDiscountTotal: result.totals.merchandiseDiscountTotal,
      merchandiseTotal: result.totals.merchandiseTotal,
    },
    request.preliminary.preliminaryTotals,
    "Final pricing changed immutable merchandise totals",
  );
  return result;
}

function assertDeliveryTotal(
  delivery: CheckoutPricingDeliverySnapshot,
  result: FinalizePricingQuoteResult,
): void {
  let maximumMerchantCollectedTotal = 0n;
  for (const group of delivery.groups) {
    const selected = group.options.find(
      ({ handle }) => handle === group.selectedOptionHandle,
    );
    if (selected !== undefined) {
      maximumMerchantCollectedTotal += BigInt(selected.cost.amountMinor);
    }
  }
  const deliveryTotal = BigInt(result.totals.deliveryTotal.amountMinor);
  const deliverySubtotal = BigInt(
    result.totals.deliverySubtotal.amountMinor,
  );
  const deliveryDiscount = BigInt(
    result.totals.deliveryDiscountTotal.amountMinor,
  );
  if (
    deliverySubtotal !== maximumMerchantCollectedTotal ||
    deliveryTotal !== deliverySubtotal - deliveryDiscount
  ) {
    throw new CheckoutPipelineBoundaryError(
      "Final delivery totals do not match selected merchant-collected options",
    );
  }
}

function assertPreliminaryPricingArithmetic(
  result: CalculatePreliminaryPricingResult,
): void {
  const subtotal = BigInt(
    result.preliminaryTotals.merchandiseSubtotal.amountMinor,
  );
  const discount = BigInt(
    result.preliminaryTotals.merchandiseDiscountTotal.amountMinor,
  );
  const total = BigInt(result.preliminaryTotals.merchandiseTotal.amountMinor);
  const lineTotals = calculateContributingLineTotals(result.transformedLines);
  if (
    subtotal < 0n ||
    discount < 0n ||
    total < 0n ||
    total !== subtotal - discount ||
    subtotal !== lineTotals.subtotal ||
    discount !== lineTotals.discount ||
    total !== lineTotals.total
  ) {
    throw new CheckoutPipelineBoundaryError(
      "Preliminary merchandise totals are arithmetically inconsistent",
    );
  }
}

function assertFinalPricingArithmetic(result: FinalizePricingQuoteResult): void {
  const subtotal = BigInt(result.totals.merchandiseSubtotal.amountMinor);
  const discount = BigInt(
    result.totals.merchandiseDiscountTotal.amountMinor,
  );
  const merchandiseTotal = BigInt(
    result.totals.merchandiseTotal.amountMinor,
  );
  const tax = BigInt(result.totals.taxTotal.amountMinor);
  const delivery = BigInt(result.totals.deliveryTotal.amountMinor);
  const payable = BigInt(result.totals.payableTotal.amountMinor);
  const lineTotals = calculateContributingLineTotals(result.lines);
  if (
    subtotal < 0n ||
    discount < 0n ||
    merchandiseTotal < 0n ||
    tax !== 0n ||
    delivery < 0n ||
    payable < 0n ||
    merchandiseTotal !== subtotal - discount ||
    subtotal !== lineTotals.subtotal ||
    discount !== lineTotals.discount ||
    merchandiseTotal !== lineTotals.total ||
    payable !== merchandiseTotal + tax + delivery
  ) {
    throw new CheckoutPipelineBoundaryError(
      "Final pricing totals are arithmetically inconsistent or violate the V1 zero-tax policy",
    );
  }
}

function calculateContributingLineTotals(
  lines: readonly CheckoutQuotedLine[],
): Readonly<{ subtotal: bigint; discount: bigint; total: bigint }> {
  let subtotal = 0n;
  let discount = 0n;
  let total = 0n;
  for (const line of flattenQuotedLines(lines)) {
    const lineSubtotal = BigInt(line.subtotal.amountMinor);
    const lineDiscount = line.discountAllocations.reduce(
      (sum, allocation) => sum + BigInt(allocation.amount.amountMinor),
      0n,
    );
    const lineTotal = BigInt(line.total.amountMinor);
    const expectedSubtotal =
      BigInt(line.unitPrice.amountMinor) * BigInt(line.quantity);
    if (
      lineSubtotal < 0n ||
      lineDiscount < 0n ||
      lineTotal < 0n ||
      lineSubtotal !== expectedSubtotal ||
      lineTotal !== lineSubtotal - lineDiscount
    ) {
      throw new CheckoutPipelineBoundaryError(
        `Quoted line ${line.lineId} has inconsistent monetary totals`,
      );
    }
    if (!line.contributesToTotals) {
      continue;
    }
    subtotal += lineSubtotal;
    discount += lineDiscount;
    total += lineTotal;
  }
  return { subtotal, discount, total };
}

function assertDiscountContract(
  result: CalculatePreliminaryPricingResult | FinalizePricingQuoteResult,
  inputCodes: readonly string[],
  stage: "PRELIMINARY" | "FINAL",
  deliveryGroupIds: readonly string[],
): void {
  const applications = result.appliedDiscounts;
  assertUnique(
    applications.map(({ applicationId }) => applicationId),
    "discount application IDs",
  );
  const sortedApplicationIds = [...applications]
    .sort(
      (left, right) =>
        right.priority - left.priority ||
        left.discountId.localeCompare(right.discountId) ||
        left.applicationId.localeCompare(right.applicationId),
    )
    .map(({ applicationId }) => applicationId);
  assertJsonEqual(
    applications.map(({ applicationId }) => applicationId),
    sortedApplicationIds,
    "Discount applications must use stable priority/discount/application order",
  );
  const applicationById = new Map(
    applications.map((application) => [application.applicationId, application]),
  );
  const quotedLines = flattenQuotedLines(
    "transformedLines" in result ? result.transformedLines : result.lines,
  );
  const lineIds = new Set(quotedLines.map(({ lineId }) => lineId));
  const deliveryGroups = new Set(deliveryGroupIds);

  for (const application of applications) {
    assertDiscountApplication(
      application,
      lineIds,
      deliveryGroups,
      result.currencyCode,
      stage,
    );
  }

  const mirroredLineAllocations = new Map<string, bigint>();
  for (const line of quotedLines) {
    const localIds = line.discountAllocations.map(
      ({ applicationId }) => applicationId,
    );
    assertUnique(localIds, `discount allocations for line ${line.lineId}`);
    for (const allocation of line.discountAllocations) {
      const application = applicationById.get(allocation.applicationId);
      if (!application) {
        throw new CheckoutPipelineBoundaryError(
          `Line ${line.lineId} references unknown discount application ${allocation.applicationId}`,
        );
      }
      const matching = application.allocations.filter(
        (entry) =>
          entry.targetType === "LINE" &&
          entry.lineId === line.lineId &&
          entry.quantity === allocation.quantity &&
          entry.amount.amountMinor === allocation.amount.amountMinor &&
          entry.amount.currencyCode === allocation.amount.currencyCode,
      );
      if (matching.length !== 1) {
        throw new CheckoutPipelineBoundaryError(
          `Line ${line.lineId} discount allocation is not mirrored exactly once by its application`,
        );
      }
      mirroredLineAllocations.set(
        allocation.applicationId,
        (mirroredLineAllocations.get(allocation.applicationId) ?? 0n) +
          BigInt(allocation.amount.amountMinor),
      );
    }
  }

  for (const application of applications) {
    const lineAmount = application.allocations
      .filter((allocation) => allocation.targetType === "LINE")
      .reduce((sum, allocation) => sum + BigInt(allocation.amount.amountMinor), 0n);
    if ((mirroredLineAllocations.get(application.applicationId) ?? 0n) !== lineAmount) {
      throw new CheckoutPipelineBoundaryError(
        `Discount application ${application.applicationId} has an unmirrored line allocation`,
      );
    }
  }

  const merchandiseApplicationTotal = applications
    .flatMap(({ allocations }) => allocations)
    .filter((allocation) => allocation.targetType === "LINE")
    .reduce((sum, allocation) => sum + BigInt(allocation.amount.amountMinor), 0n);
  const expectedMerchandiseDiscount = BigInt(
    "preliminaryTotals" in result
      ? result.preliminaryTotals.merchandiseDiscountTotal.amountMinor
      : result.totals.merchandiseDiscountTotal.amountMinor,
  );
  if (merchandiseApplicationTotal !== expectedMerchandiseDiscount) {
    throw new CheckoutPipelineBoundaryError(
      "Merchandise discount applications do not equal the quote merchandise discount total",
    );
  }
  const deliveryApplicationTotal = applications
    .flatMap(({ allocations }) => allocations)
    .filter((allocation) => allocation.targetType === "DELIVERY_GROUP")
    .reduce((sum, allocation) => sum + BigInt(allocation.amount.amountMinor), 0n);
  const expectedDeliveryDiscount =
    "totals" in result
      ? BigInt(result.totals.deliveryDiscountTotal.amountMinor)
      : 0n;
  if (deliveryApplicationTotal !== expectedDeliveryDiscount) {
    throw new CheckoutPipelineBoundaryError(
      "Delivery discount applications do not equal the quote delivery discount total",
    );
  }

  assertUnique(
    result.usageRequirements.map(({ applicationId }) => applicationId),
    "discount usage requirement application IDs",
  );
  for (const requirement of result.usageRequirements) {
    const application = applicationById.get(requirement.applicationId);
    if (
      !application ||
      application.discountId !== requirement.discountId ||
      application.configurationRevision !== requirement.configurationRevision ||
      (application.code?.codeId ?? null) !== requirement.codeId
    ) {
      throw new CheckoutPipelineBoundaryError(
        `Usage requirement for ${requirement.applicationId} does not match its discount application`,
      );
    }
  }

  if (result.discountCodeResolutions.length !== inputCodes.length) {
    throw new CheckoutPipelineBoundaryError(
      "Every submitted discount code must have exactly one resolution",
    );
  }
  result.discountCodeResolutions.forEach((resolution, index) => {
    if (resolution.inputCode !== inputCodes[index]) {
      throw new CheckoutPipelineBoundaryError(
        "Discount code resolutions must preserve input order and spelling",
      );
    }
    if (resolution.status === "APPLIED") {
      assertUnique(
        resolution.applicationIds,
        `discount applications for code ${resolution.inputCode}`,
      );
      for (const applicationId of resolution.applicationIds) {
        const application = applicationById.get(applicationId);
        if (
          !application ||
          application.discountId !== resolution.discountId ||
          application.code?.codeId !== resolution.codeId
        ) {
          throw new CheckoutPipelineBoundaryError(
            `Applied code ${resolution.inputCode} references an inconsistent application`,
          );
        }
      }
    }
    if (stage === "FINAL" && resolution.status === "PENDING") {
      throw new CheckoutPipelineBoundaryError(
        `Final quote left discount code ${resolution.inputCode} pending`,
      );
    }
    if (resolution.normalizedCode !== resolution.inputCode.trim().toUpperCase()) {
      throw new CheckoutPipelineBoundaryError(
        `Discount code ${resolution.inputCode} has an invalid normalized representation`,
      );
    }
  });

  for (const application of applications) {
    if (application.method !== "CODE") {
      continue;
    }
    const matchingResolutions = result.discountCodeResolutions.filter(
      (resolution) =>
        resolution.status === "APPLIED" &&
        resolution.applicationIds.includes(application.applicationId),
    );
    if (matchingResolutions.length !== 1 || application.code === null) {
      throw new CheckoutPipelineBoundaryError(
        `Code discount application ${application.applicationId} must have exactly one applied code resolution`,
      );
    }
    const resolution = matchingResolutions[0];
    if (
      !resolution ||
      resolution.discountId !== application.discountId ||
      resolution.codeId !== application.code.codeId ||
      resolution.inputCode !== application.code.inputCode ||
      resolution.normalizedCode !== application.code.normalizedCode
    ) {
      throw new CheckoutPipelineBoundaryError(
        `Code discount application ${application.applicationId} does not match its applied code resolution`,
      );
    }
  }
}

function assertDiscountApplication(
  application: CheckoutDiscountApplication,
  lineIds: ReadonlySet<string>,
  deliveryGroupIds: ReadonlySet<string>,
  currencyCode: string,
  stage: "PRELIMINARY" | "FINAL",
): void {
  if (
    (application.method === "CODE") !== (application.code !== null)
  ) {
    throw new CheckoutPipelineBoundaryError(
      `Discount application ${application.applicationId} has inconsistent method and code provenance`,
    );
  }
  if (
    BigInt(application.amount.amountMinor) <= 0n ||
    application.allocations.length === 0
  ) {
    throw new CheckoutPipelineBoundaryError(
      `Discount application ${application.applicationId} must have a positive allocated amount`,
    );
  }
  if (stage === "PRELIMINARY" && application.discountClass === "SHIPPING") {
    throw new CheckoutPipelineBoundaryError(
      "Preliminary pricing cannot apply shipping discounts",
    );
  }
  const allocationTotal = application.allocations.reduce(
    (sum, allocation) => sum + BigInt(allocation.amount.amountMinor),
    0n,
  );
  if (allocationTotal !== BigInt(application.amount.amountMinor)) {
    throw new CheckoutPipelineBoundaryError(
      `Discount application ${application.applicationId} amount does not equal its allocations`,
    );
  }
  for (const allocation of application.allocations) {
    if (allocation.amount.currencyCode !== currencyCode) {
      throw new CheckoutPipelineBoundaryError(
        `Discount application ${application.applicationId} has an allocation in another currency`,
      );
    }
    if (allocation.targetType === "LINE" && !lineIds.has(allocation.lineId)) {
      throw new CheckoutPipelineBoundaryError(
        `Discount application ${application.applicationId} targets unknown line ${allocation.lineId}`,
      );
    }
    if (
      allocation.targetType === "DELIVERY_GROUP" &&
      !deliveryGroupIds.has(allocation.groupId)
    ) {
      throw new CheckoutPipelineBoundaryError(
        `Discount application ${application.applicationId} targets unknown delivery group ${allocation.groupId}`,
      );
    }
    if (stage === "PRELIMINARY" && allocation.targetType !== "LINE") {
      throw new CheckoutPipelineBoundaryError(
        "Preliminary pricing cannot contain delivery discount allocations",
      );
    }
    if (
      allocation.targetType === "DELIVERY_GROUP" &&
      application.discountClass !== "SHIPPING"
    ) {
      throw new CheckoutPipelineBoundaryError(
        `Non-shipping discount ${application.applicationId} targets a delivery group`,
      );
    }
    if (
      allocation.targetType === "LINE" &&
      application.discountClass === "SHIPPING"
    ) {
      throw new CheckoutPipelineBoundaryError(
        `Shipping discount ${application.applicationId} targets a merchandise line`,
      );
    }
  }
}

export function parseGetAvailablePaymentMethodsResult(
  request: GetAvailablePaymentMethodsRequest,
  value: unknown,
): GetAvailablePaymentMethodsResult {
  assertPayloadSize(value, "payment methods result");
  const result = getAvailablePaymentMethodsResultSchema.parse(value);
  assertProvenance(request.context, result);
  assertEqual(
    result.basedOnFinalQuoteRevision,
    request.finalQuote.revision,
    "Payment result has stale final quote revision",
  );
  assertEqual(
    result.basedOnDeliveryRevision,
    request.delivery.revision,
    "Payment result has stale delivery revision",
  );
  assertPaymentSelectionSource(
    request.selection,
    result.selection,
    result.methods.map(({ handle }) => handle),
  );
  assertUnique(
    result.methods.map(({ handle }) => handle),
    "payment method handles",
  );
  return result;
}

export function parseValidateCheckoutResult(
  request: ValidateCheckoutRequest,
  value: unknown,
): ValidateCheckoutResult {
  assertPayloadSize(value, "checkout validation result");
  const result = validateCheckoutResultSchema.parse(value);
  assertProvenance(request.context, result);
  assertEqual(
    result.basedOnFinalQuoteRevision,
    request.finalQuote.revision,
    "Validation result has stale final quote revision",
  );
  assertEqual(
    result.basedOnPaymentRevision,
    request.payment.revision,
    "Validation result has stale payment revision",
  );
  return result;
}

export function parseCheckoutRecalculationResult(
  request: CheckoutRecalculationRequest,
  value: unknown,
): CheckoutRecalculationResult {
  assertPayloadSize(value, "checkout recalculation result");
  const result = checkoutRecalculationResultSchema.parse(value) as CheckoutRecalculationResult;
  assertEqual(
    result.executionId,
    request.context.executionId,
    "Pipeline result executionId does not match request",
  );
  assertEqual(
    result.checkoutId,
    request.context.checkoutId,
    "Pipeline result checkoutId does not match request",
  );
  assertEqual(
    result.basedOnCheckoutVersion,
    request.context.expectedCheckoutVersion,
    "Pipeline result is based on a stale checkout version",
  );
  assertEqual(
    result.trace.executionId,
    request.context.executionId,
    "Execution trace executionId does not match request",
  );
  assertEqual(
    result.trace.correlationId,
    request.context.correlationId,
    "Execution trace correlationId does not match request",
  );
  assertEqual(
    result.trace.deadlineAt,
    request.context.deadlineAt,
    "Execution trace deadline does not match request",
  );
  assertTrace(result);
  assertOutcomeSequence(result);
  assertAggregateIssues(result);
  assertSuccessfulStages(request, result);
  return result;
}

function assertSuccessfulStages(
  request: CheckoutRecalculationRequest,
  result: CheckoutRecalculationResult,
): void {
  if (result.preliminaryPricing.status !== "SUCCESS") {
    return;
  }
  const deliveryContext = toCheckoutDeliveryContext(request.context);
  const eligibilityContext = toCheckoutPipelineEligibilityContext(
    request.context,
  );
  const preliminary = parseCalculatePreliminaryPricingResult(
    {
      context: eligibilityContext,
      cartIntent: toCheckoutPricingCartIntent(request.cartIntent),
    },
    result.preliminaryPricing.data,
  );
  if (result.delivery.status !== "SUCCESS") {
    return;
  }
  const delivery = parseCalculateDeliveryOptionsResult(
    {
      context: deliveryContext,
      preliminary,
      destinations: toCheckoutDeliveryDestinations(
        request.cartIntent.destinations,
        preliminary,
      ),
      selections: request.cartIntent.selectedDeliveryOptions,
      cartAttributes: request.cartIntent.attributes,
    },
    result.delivery.data,
  );
  if (result.finalPricing.status !== "SUCCESS") {
    return;
  }
  const finalQuote = parseFinalizePricingQuoteResult(
    {
      context: eligibilityContext,
      preliminary,
      delivery: toCheckoutPricingDeliverySnapshot(delivery),
    },
    result.finalPricing.data,
  );
  if (result.payment.status !== "SUCCESS") {
    return;
  }
  const payment = parseGetAvailablePaymentMethodsResult(
    {
      context: {
        ...eligibilityContext,
        targetCheckoutVersion: eligibilityContext.expectedCheckoutVersion + 1,
      },
      selection: request.cartIntent.selectedPaymentMethod,
      finalQuote,
      delivery: toCheckoutPaymentDeliverySnapshot(delivery, preliminary),
    },
    result.payment.data,
  );
  if (result.validation.status === "SUCCESS") {
    parseValidateCheckoutResult(
      {
        context: request.context,
        cartIntent: request.cartIntent,
        preliminary,
        delivery,
        finalQuote,
        payment,
      },
      result.validation.data,
    );
  }
}

function assertOutcomeSequence(result: CheckoutRecalculationResult): void {
  const outcomes = [
    ["PRICING_PRELIMINARY", result.preliminaryPricing],
    ["DELIVERY", result.delivery],
    ["PRICING_FINAL", result.finalPricing],
    ["PAYMENT", result.payment],
    ["VALIDATION", result.validation],
  ] as const;
  let blockingStage: CheckoutPipelineStage | null = null;
  for (const [stage, outcome] of outcomes) {
    if (blockingStage !== null && outcome.status !== "SKIPPED") {
      throw new CheckoutPipelineBoundaryError(
        "A data-dependent stage ran after the pipeline was stopped",
      );
    }
    if (outcome.status === "SKIPPED") {
      if (
        blockingStage === null ||
        outcome.reason.code !== "CHECKOUT_PIPELINE_UPSTREAM_BLOCKED" ||
        outcome.reason.message !==
          "Checkout stage was skipped because an upstream stage blocked execution." ||
        outcome.reason.upstreamStage !== blockingStage
      ) {
        throw new CheckoutPipelineBoundaryError(
          "Skipped checkout stage has a non-canonical upstream reason",
        );
      }
      continue;
    }
    if (
      outcome.status === "FAILED" ||
      outcome.issues.some(({ effect }) => effect === "STOP")
    ) {
      blockingStage = stage;
    }
  }
}

function assertAggregateIssues(result: CheckoutRecalculationResult): void {
  const expectedIssues = [
    ...result.preliminaryPricing.issues,
    ...result.delivery.issues,
    ...result.finalPricing.issues,
    ...result.payment.issues,
    ...result.validation.issues,
  ];
  assertJsonEqual(
    result.issues,
    expectedIssues,
    "Aggregate pipeline issues must equal stage issues in execution order",
  );
}

function assertDeliveryIntent(
  request: CalculatePreliminaryPricingRequest,
  result: CalculatePreliminaryPricingResult,
): void {
  const sourceLineIdList = flattenCartLineIds(request.cartIntent.lines);
  const sourceLineIds = new Set(sourceLineIdList);
  const sourceDestinations = new Map<string, string>();
  const destinationIntents = new Map(
    request.cartIntent.destinations.map((destination) => [
      destination.destinationId,
      destination,
    ]),
  );
  for (const destination of request.cartIntent.destinations) {
    for (const lineId of destination.lineIds) {
      sourceDestinations.set(lineId, destination.destinationId);
    }
  }
  const transformedLines = flattenQuotedLines(result.transformedLines);
  const transformedLineIds = transformedLines.map(({ lineId }) => lineId);
  assertUnique(transformedLineIds, "transformed line IDs");

  assertUnique(
    result.sourceLineResolutions.map(({ sourceLineId }) => sourceLineId),
    "source line resolution IDs",
  );
  assertSameIds(
    sourceLineIdList,
    result.sourceLineResolutions.map(({ sourceLineId }) => sourceLineId),
    "Every source line must have an explicit pricing resolution",
  );

  const resolutionPairs: string[] = [];
  for (const resolution of result.sourceLineResolutions) {
    if (resolution.status === "REMOVED") {
      continue;
    }
    assertUnique(
      resolution.transformedLineIds,
      `transformed line IDs for source line ${resolution.sourceLineId}`,
    );
    for (const transformedLineId of resolution.transformedLineIds) {
      if (!transformedLineIds.includes(transformedLineId)) {
        throw new CheckoutPipelineBoundaryError(
          `Source line ${resolution.sourceLineId} references unknown transformed line ${transformedLineId}`,
        );
      }
      resolutionPairs.push(
        JSON.stringify([resolution.sourceLineId, transformedLineId]),
      );
    }
  }

  const lineageLineIds = result.deliveryIntent.lineage.map(({ lineId }) => lineId);
  assertUnique(lineageLineIds, "lineage line IDs");
  assertSameIds(
    transformedLineIds,
    lineageLineIds,
    "Lineage does not cover every transformed line exactly once",
  );
  const lineagePairs: string[] = [];
  for (const lineage of result.deliveryIntent.lineage) {
    assertUnique(
      lineage.sourceLineIds,
      `source line IDs for transformed line ${lineage.lineId}`,
    );
    for (const sourceLineId of lineage.sourceLineIds) {
      if (!sourceLineIds.has(sourceLineId)) {
        throw new CheckoutPipelineBoundaryError(
          `Lineage references unknown source line ${sourceLineId}`,
        );
      }
      lineagePairs.push(JSON.stringify([sourceLineId, lineage.lineId]));
    }
  }
  assertSameIds(
    resolutionPairs,
    lineagePairs,
    "Source line resolutions do not match transformed line lineage",
  );

  const physicalLineIds = new Set(
    transformedLines
      .filter(({ merchandise }) => merchandise.isPhysical)
      .map(({ lineId }) => lineId),
  );
  const assignedLineIds: string[] = [];
  const destinationIds = result.deliveryIntent.destinations.map(
    ({ destinationId }) => destinationId,
  );
  assertUnique(destinationIds, "canonical destination IDs");
  for (const destination of result.deliveryIntent.destinations) {
    const sourceDestination = destinationIntents.get(destination.destinationId);
    if (sourceDestination === undefined) {
      throw new CheckoutPipelineBoundaryError(
        `Canonical intent contains unknown destination ${destination.destinationId}`,
      );
    }
    if (
      JSON.stringify(destination.location) !==
      JSON.stringify(sourceDestination.location)
    ) {
      throw new CheckoutPipelineBoundaryError(
        `Canonical destination ${destination.destinationId} changed its pricing location`,
      );
    }
    for (const lineId of destination.transformedLineIds) {
      if (!physicalLineIds.has(lineId)) {
        throw new CheckoutPipelineBoundaryError(
          `Destination ${destination.destinationId} references non-physical or unknown line ${lineId}`,
        );
      }
      const lineage = result.deliveryIntent.lineage.find(
        (entry) => entry.lineId === lineId,
      );
      if (
        lineage === undefined ||
        lineage.sourceLineIds.some(
          (sourceLineId) =>
            sourceDestinations.get(sourceLineId) !== destination.destinationId,
        )
      ) {
        throw new CheckoutPipelineBoundaryError(
          `Transformed line ${lineId} crosses source destination boundaries`,
        );
      }
      assignedLineIds.push(lineId);
    }
  }
  const unassignedLineIds = result.deliveryIntent.unassignedPhysicalLineIds;
  assertUnique(unassignedLineIds, "unassigned physical line IDs");
  for (const lineId of unassignedLineIds) {
    if (!physicalLineIds.has(lineId)) {
      throw new CheckoutPipelineBoundaryError(
        `Unassigned physical line list references non-physical or unknown line ${lineId}`,
      );
    }
    const lineage = result.deliveryIntent.lineage.find(
      (entry) => entry.lineId === lineId,
    );
    if (
      lineage === undefined ||
      lineage.sourceLineIds.some((sourceLineId) =>
        sourceDestinations.has(sourceLineId),
      )
    ) {
      throw new CheckoutPipelineBoundaryError(
        `Unassigned physical line ${lineId} has a source destination`,
      );
    }
  }
  assertSameIds(
    [...physicalLineIds],
    [...assignedLineIds, ...unassignedLineIds],
    "Every physical line must be assigned or explicitly marked unassigned",
  );
}

function assertCartIntent(
  cartIntent: CheckoutRecalculationRequest["cartIntent"],
): void {
  const lineIds = flattenCartLineIds(cartIntent.lines);
  const knownLineIds = new Set(lineIds);
  assertUnique(lineIds, "cart line IDs");
  assertNormalizedDiscountCodes(cartIntent.discountCodes);
  assertPurchaseIntents(cartIntent.lines);
  assertUnique(
    cartIntent.destinations.map(({ destinationId }) => destinationId),
    "cart destination IDs",
  );
  const assignedLineIds: string[] = [];
  for (const destination of cartIntent.destinations) {
    assertUnique(
      destination.lineIds,
      `line IDs in destination ${destination.destinationId}`,
    );
    for (const lineId of destination.lineIds) {
      if (!knownLineIds.has(lineId)) {
        throw new CheckoutPipelineBoundaryError(
          `Destination ${destination.destinationId} references unknown cart line ${lineId}`,
        );
      }
      assignedLineIds.push(lineId);
    }
  }
  assertUnique(assignedLineIds, "cart destination line assignments");
  assertUnique(
    cartIntent.selectedDeliveryOptions.map(({ groupId }) => groupId),
    "selected delivery group IDs",
  );
}

function assertPricingCartIntent(cartIntent: CheckoutPricingCartIntent): void {
  const lineIds = flattenCartLineIds(cartIntent.lines);
  const knownLineIds = new Set(lineIds);
  assertUnique(lineIds, "pricing cart line IDs");
  assertNormalizedDiscountCodes(cartIntent.discountCodes);
  assertPurchaseIntents(cartIntent.lines);
  assertUnique(
    cartIntent.destinations.map(({ destinationId }) => destinationId),
    "pricing destination IDs",
  );
  const assignedLineIds: string[] = [];
  for (const destination of cartIntent.destinations) {
    assertUnique(
      destination.lineIds,
      `pricing destination ${destination.destinationId} line IDs`,
    );
    for (const lineId of destination.lineIds) {
      if (!knownLineIds.has(lineId)) {
        throw new CheckoutPipelineBoundaryError(
          `Pricing destination ${destination.destinationId} references unknown line ${lineId}`,
        );
      }
      assignedLineIds.push(lineId);
    }
  }
  assertUnique(assignedLineIds, "pricing destination line assignments");
}

function assertDeliveryGroups(
  request: CalculateDeliveryOptionsRequest,
  result: CalculateDeliveryOptionsResult,
): void {
  const canonicalDestinationIds = request.preliminary.deliveryIntent.destinations.map(
    ({ destinationId }) => destinationId,
  );
  assertUnique(canonicalDestinationIds, "canonical delivery destination IDs");
  const canonicalDestinations = new Set(canonicalDestinationIds);
  const assignments = new Map<string, string>();
  for (const destination of request.preliminary.deliveryIntent.destinations) {
    for (const lineId of destination.transformedLineIds) {
      assignments.set(lineId, destination.destinationId);
    }
  }
  const groupedLineIds: string[] = [];
  assertUnique(
    result.groups.map(({ groupId }) => groupId),
    "delivery group IDs",
  );
  assertUnique(
    result.orphanedSelectionResets.map(({ groupId }) => groupId),
    "orphaned delivery selection reset group IDs",
  );
  for (const group of result.groups) {
    if (group.lineIds.length === 0) {
      throw new CheckoutPipelineBoundaryError(
        `Delivery group ${group.groupId} must contain at least one canonical physical line`,
      );
    }
    if (!canonicalDestinations.has(group.destinationId)) {
      throw new CheckoutPipelineBoundaryError(
        `Delivery group ${group.groupId} references unknown canonical destination ${group.destinationId}`,
      );
    }
    assertUnique(group.lineIds, `line IDs in delivery group ${group.groupId}`);
    assertUnique(
      group.options.map(({ handle }) => handle),
      `option handles in delivery group ${group.groupId}`,
    );
    for (const option of group.options) {
      if (
        option.estimatedMinDeliveryAt !== null &&
        option.estimatedMaxDeliveryAt !== null &&
        Date.parse(option.estimatedMaxDeliveryAt) <
          Date.parse(option.estimatedMinDeliveryAt)
      ) {
        throw new CheckoutPipelineBoundaryError(
          `Delivery option ${option.handle} has an inverted estimate window`,
        );
      }
    }
    assertDeliverySelectionSource(
      request.selections.find(
        ({ groupId }) => groupId === group.groupId,
      ) ?? null,
      group.selection,
      group.options.map(({ handle }) => handle),
      group.groupId,
    );
    for (const lineId of group.lineIds) {
      if (assignments.get(lineId) !== group.destinationId) {
        throw new CheckoutPipelineBoundaryError(
          `Delivery group ${group.groupId} has an invalid destination assignment for line ${lineId}`,
        );
      }
      groupedLineIds.push(lineId);
    }
  }
  assertSameIds(
    [...assignments.keys()],
    groupedLineIds,
    "Delivery groups must cover every assigned physical line exactly once",
  );
  for (const reset of result.orphanedSelectionResets) {
    const source = request.selections.find(
      ({ groupId }) => groupId === reset.groupId,
    );
    if (
      source === undefined ||
      result.groups.some(({ groupId }) => groupId === reset.groupId)
    ) {
      throw new CheckoutPipelineBoundaryError(
        `Delivery returned an invalid orphaned selection reset for group ${reset.groupId}`,
      );
    }
    assertJsonEqual(
      {
        optionHandle: reset.previousOptionHandle,
        customerInput: reset.customerInput,
      },
      {
        optionHandle: source.optionHandle,
        customerInput: source.customerInput,
      },
      `Delivery changed orphaned shopper input for group ${reset.groupId}`,
    );
  }
  for (const source of request.selections) {
    if (
      !result.groups.some(({ groupId }) => groupId === source.groupId) &&
      !result.orphanedSelectionResets.some(
        ({ groupId }) => groupId === source.groupId,
      )
    ) {
      throw new CheckoutPipelineBoundaryError(
        `Delivery omitted reset reason for removed group ${source.groupId}`,
      );
    }
  }
}

function assertDeliveryRequest(request: CalculateDeliveryOptionsRequest): void {
  assertUnique(
    request.destinations.map(({ destinationId }) => destinationId),
    "delivery request destination IDs",
  );
  assertUnique(
    request.selections.map(({ groupId }) => groupId),
    "delivery request selection group IDs",
  );
  assertSameIds(
    request.preliminary.deliveryIntent.destinations.map(
      ({ destinationId }) => destinationId,
    ),
    request.destinations.map(({ destinationId }) => destinationId),
    "Delivery request must contain exactly the canonical destinations",
  );
  for (const canonical of request.preliminary.deliveryIntent.destinations) {
    const destination = request.destinations.find(
      ({ destinationId }) => destinationId === canonical.destinationId,
    );
    if (destination === undefined) {
      throw new CheckoutPipelineBoundaryError(
        `Delivery request is missing destination ${canonical.destinationId}`,
      );
    }
    assertJsonEqual(
      canonical.location,
      {
        countryCode: destination.address.countryCode,
        provinceCode: destination.address.provinceCode,
        postalCode: destination.address.postalCode,
      },
      `Delivery destination ${canonical.destinationId} does not match its pricing location`,
    );
    assertSameIds(
      canonical.transformedLineIds,
      destination.lineIds,
      `Delivery destination ${canonical.destinationId} line assignment changed after pricing`,
    );
  }
}

function assertPricingDeliverySnapshot(
  delivery: CheckoutPricingDeliverySnapshot,
  preliminary?: CalculatePreliminaryPricingResult,
): void {
  assertUnique(
    delivery.groups.map(({ groupId }) => groupId),
    "pricing delivery group IDs",
  );
  const knownLineIds = preliminary
    ? new Set(
        flattenQuotedLines(preliminary.transformedLines).map(
          ({ lineId }) => lineId,
        ),
      )
    : null;
  const groupedLineIds: string[] = [];
  for (const group of delivery.groups) {
    assertUnique(group.lineIds, `pricing delivery group ${group.groupId} lines`);
    assertUnique(
      group.options.map(({ handle }) => handle),
      `pricing delivery group ${group.groupId} option handles`,
    );
    assertSelectedHandle(
      group.selectedOptionHandle,
      group.options.map(({ handle }) => handle),
      `pricing delivery option in group ${group.groupId}`,
    );
    if (
      knownLineIds !== null &&
      group.lineIds.some((lineId) => !knownLineIds.has(lineId))
    ) {
      throw new CheckoutPipelineBoundaryError(
        `Pricing delivery group ${group.groupId} references an unknown transformed line`,
      );
    }
    groupedLineIds.push(...group.lineIds);
  }
  assertUnique(groupedLineIds, "pricing delivery group line assignments");
  if (preliminary !== undefined) {
    assertSameIds(
      preliminary.deliveryIntent.destinations.flatMap(
        ({ transformedLineIds }) => transformedLineIds,
      ),
      groupedLineIds,
      "Pricing delivery snapshot must cover every assigned physical line",
    );
  }
}

function assertPaymentDeliverySnapshot(
  snapshot: CheckoutPaymentDeliverySnapshot,
  result: CalculateDeliveryOptionsResult,
): void {
  assertUnique(
    snapshot.destinations.map(({ destinationId }) => destinationId),
    "payment delivery destination IDs",
  );
  assertUnique(
    snapshot.groups.map(({ groupId }) => groupId),
    "payment delivery group IDs",
  );
  const destinationIds = new Set(
    snapshot.destinations.map(({ destinationId }) => destinationId),
  );
  assertSameIds(
    [...new Set(result.groups.map(({ destinationId }) => destinationId))],
    [...destinationIds],
    "Payment delivery snapshot must contain exactly the referenced destinations",
  );
  assertSameIds(
    result.groups.map(({ groupId }) => groupId),
    snapshot.groups.map(({ groupId }) => groupId),
    "Payment delivery snapshot must cover every delivery group",
  );
  for (const group of snapshot.groups) {
    const source = result.groups.find(({ groupId }) => groupId === group.groupId);
    if (source === undefined || !destinationIds.has(group.destinationId)) {
      throw new CheckoutPipelineBoundaryError(
        `Payment delivery group ${group.groupId} has an invalid destination`,
      );
    }
    const expectedSelectedOption = toPaymentSelectedOption(source);
    assertJsonEqual(
      {
        destinationId: group.destinationId,
        lineIds: group.lineIds,
        selectedOption: group.selectedOption,
      },
      {
        destinationId: source.destinationId,
        lineIds: source.lineIds,
        selectedOption: expectedSelectedOption,
      },
      `Payment delivery group ${group.groupId} changed delivery facts`,
    );
  }
}

function assertTrace(result: CheckoutRecalculationResult): void {
  const expected = [
    ["PRICING_PRELIMINARY", result.preliminaryPricing],
    ["DELIVERY", result.delivery],
    ["PRICING_FINAL", result.finalPricing],
    ["PAYMENT", result.payment],
    ["VALIDATION", result.validation],
  ] as const;
  assertEqual(
    result.trace.stages.length,
    expected.length,
    "Execution trace must contain every pipeline stage exactly once",
  );
  const executionStartedAt = Date.parse(result.trace.startedAt);
  const executionCompletedAt = Date.parse(result.trace.completedAt);
  if (executionCompletedAt < executionStartedAt) {
    throw new CheckoutPipelineBoundaryError(
      "Execution trace completes before it starts",
    );
  }
  expected.forEach(([stage, outcome], index) => {
    const actual = result.trace.stages[index];
    assertEqual(actual?.stage, stage, `Execution trace stage ${index} is invalid`);
    assertEqual(
      actual?.status,
      outcome.status,
      `Execution trace status for ${stage} does not match its outcome`,
    );
    if (JSON.stringify(actual) !== JSON.stringify(outcome.trace)) {
      throw new CheckoutPipelineBoundaryError(
        `Execution trace for ${stage} does not match its stage outcome trace`,
      );
    }
    if (outcome.issues.some((issue) => issue.stage !== stage)) {
      throw new CheckoutPipelineBoundaryError(
        `Stage outcome ${stage} contains an issue owned by another stage`,
      );
    }
    if (
      actual !== undefined &&
      Date.parse(actual.completedAt) < Date.parse(actual.startedAt)
    ) {
      throw new CheckoutPipelineBoundaryError(
        `Execution trace for ${stage} completes before it starts`,
      );
    }
    if (
      actual !== undefined &&
      (Date.parse(actual.startedAt) < executionStartedAt ||
        Date.parse(actual.completedAt) > executionCompletedAt)
    ) {
      throw new CheckoutPipelineBoundaryError(
        `Execution trace for ${stage} is outside the execution window`,
      );
    }
    const previous = result.trace.stages[index - 1];
    if (
      actual !== undefined &&
      previous !== undefined &&
      Date.parse(actual.startedAt) < Date.parse(previous.completedAt)
    ) {
      throw new CheckoutPipelineBoundaryError(
        `Execution trace stage ${stage} overlaps its predecessor`,
      );
    }
    if (
      actual?.resultObservedAt !== undefined &&
      Date.parse(actual.resultObservedAt) > Date.parse(result.trace.deadlineAt)
    ) {
      throw new CheckoutPipelineBoundaryError(
        `Execution trace for ${stage} accepted a result after the deadline`,
      );
    }
    if (
      outcome.status === "SUCCESS" &&
      (actual?.resultObservedAt === undefined ||
        actual.inputRevision === undefined ||
        actual.outputRevision === undefined)
    ) {
      throw new CheckoutPipelineBoundaryError(
        `Successful execution trace for ${stage} lacks settlement or revisions`,
      );
    }
    if (
      outcome.status === "FAILED" &&
      outcome.failure.code !== "CHECKOUT_PIPELINE_DEADLINE_EXCEEDED" &&
      actual?.inputRevision !== undefined &&
      actual.resultObservedAt === undefined
    ) {
      throw new CheckoutPipelineBoundaryError(
        `Failed execution trace for ${stage} lacks its observed settlement`,
      );
    }
    if (
      outcome.status === "SKIPPED" &&
      (actual?.resultObservedAt !== undefined ||
        actual?.inputRevision !== undefined ||
        actual?.outputRevision !== undefined)
    ) {
      throw new CheckoutPipelineBoundaryError(
        `Skipped execution trace for ${stage} contains port artifacts`,
      );
    }
  });

  const deadlineFailures = expected.filter(
    ([, outcome]) =>
      outcome.status === "FAILED" &&
      outcome.failure.code === "CHECKOUT_PIPELINE_DEADLINE_EXCEEDED",
  );
  if (!result.trace.deadlineExceeded) {
    if (result.trace.deadlineObservedAt !== null || deadlineFailures.length !== 0) {
      throw new CheckoutPipelineBoundaryError(
        "Execution trace reports inconsistent deadline state",
      );
    }
    return;
  }
  if (
    result.trace.deadlineObservedAt === null ||
    Date.parse(result.trace.deadlineObservedAt) < Date.parse(result.trace.deadlineAt) ||
    deadlineFailures.length !== 1
  ) {
    throw new CheckoutPipelineBoundaryError(
      "Execution trace deadline failure is invalid",
    );
  }
  const deadlineStageIndex = expected.findIndex(
    ([, outcome]) =>
      outcome.status === "FAILED" &&
      outcome.failure.code === "CHECKOUT_PIPELINE_DEADLINE_EXCEEDED",
  );
  if (
    deadlineStageIndex < 0 ||
    expected.slice(deadlineStageIndex + 1).some(([, outcome]) => outcome.status !== "SKIPPED")
  ) {
    throw new CheckoutPipelineBoundaryError(
      "Stages after the deadline failure must be skipped",
    );
  }
}

function assertProvenance(
  context: CheckoutPipelineStageContext,
  result: CheckoutPipelineStageProvenance,
): void {
  assertEqual(
    result.executionId,
    context.executionId,
    "Stage result executionId does not match request",
  );
  assertEqual(
    result.checkoutId,
    context.checkoutId,
    "Stage result checkoutId does not match request",
  );
  assertEqual(
    result.basedOnCheckoutVersion,
    context.expectedCheckoutVersion,
    "Stage result is based on a stale checkout version",
  );
  assertEqual(
    result.currencyCode,
    context.currencyCode,
    "Stage result currency does not match request",
  );
}

function assertPreliminaryCurrencies(
  result: CalculatePreliminaryPricingResult,
  expected: string,
): void {
  assertQuotedLineCurrencies(result.transformedLines, expected);
  result.appliedDiscounts.forEach((discount) =>
    assertMoneyCurrency(discount.amount, expected, "applied discount"),
  );
  Object.entries(result.preliminaryTotals).forEach(([field, money]) =>
    assertMoneyCurrency(money, expected, `preliminaryTotals.${field}`),
  );
}

function assertDeliveryCurrencies(
  result: CalculateDeliveryOptionsResult,
  expected: string,
): void {
  result.groups.forEach((group) =>
    group.options.forEach((option) =>
      assertMoneyCurrency(option.cost, expected, "delivery option cost"),
    ),
  );
}

function assertPricingDeliveryCurrencies(
  delivery: CheckoutPricingDeliverySnapshot,
  expected: string,
): void {
  delivery.groups.forEach((group) =>
    group.options.forEach((option) =>
      assertMoneyCurrency(option.cost, expected, "pricing delivery cost"),
    ),
  );
}

function assertPaymentDeliveryCurrencies(
  delivery: CheckoutPaymentDeliverySnapshot,
  expected: string,
): void {
  delivery.groups.forEach(({ selectedOption }) => {
    if (selectedOption !== null) {
      assertMoneyCurrency(
        selectedOption.cost,
        expected,
        "payment delivery option cost",
      );
    }
  });
}

function assertFinalCurrencies(
  result: FinalizePricingQuoteResult,
  expected: string,
): void {
  assertQuotedLineCurrencies(result.lines, expected);
  result.appliedDiscounts.forEach((discount) =>
    assertMoneyCurrency(discount.amount, expected, "applied discount"),
  );
  Object.entries(result.totals).forEach(([field, money]) =>
    assertMoneyCurrency(money, expected, `totals.${field}`),
  );
}

function assertQuotedLineCurrencies(
  lines: readonly CheckoutQuotedLine[],
  expected: string,
): void {
  for (const line of flattenQuotedLines(lines)) {
    assertMoneyCurrency(line.unitPrice, expected, `line ${line.lineId}.unitPrice`);
    assertMoneyCurrency(
      line.originalUnitPrice,
      expected,
      `line ${line.lineId}.originalUnitPrice`,
    );
    if (line.compareAtUnitPrice !== null) {
      assertMoneyCurrency(
        line.compareAtUnitPrice,
        expected,
        `line ${line.lineId}.compareAtUnitPrice`,
      );
    }
    assertMoneyCurrency(line.subtotal, expected, `line ${line.lineId}.subtotal`);
    assertMoneyCurrency(line.total, expected, `line ${line.lineId}.total`);
    line.discountAllocations.forEach((allocation) =>
      assertMoneyCurrency(
        allocation.amount,
        expected,
        `line ${line.lineId} discount`,
      ),
    );
  }
}

function assertMoneyCurrency(
  money: Readonly<{ currencyCode: string }>,
  expected: string,
  field: string,
): void {
  if (money.currencyCode !== expected) {
    throw new CheckoutPipelineBoundaryError(
      `${field} uses ${money.currencyCode}; expected ${expected}`,
    );
  }
}

function assertPayloadSize(value: unknown, label: string): void {
  let serialized: string;
  try {
    const result = JSON.stringify(value);
    if (result === undefined) {
      throw new Error("not JSON serializable");
    }
    serialized = result;
  } catch {
    throw new CheckoutPipelineBoundaryError(`${label} must be JSON serializable`);
  }
  const bytes = new TextEncoder().encode(serialized).byteLength;
  if (bytes > CHECKOUT_PIPELINE_MAX_PAYLOAD_BYTES) {
    throw new CheckoutPipelineBoundaryError(
      `${label} exceeds ${CHECKOUT_PIPELINE_MAX_PAYLOAD_BYTES} bytes`,
    );
  }
}

type NestedCheckoutLine = Readonly<{
  children: readonly NestedCheckoutLine[];
}>;

function assertLineLimit(
  lines: readonly NestedCheckoutLine[],
  label: string,
): void {
  let count = 0;
  const visit = (entries: readonly NestedCheckoutLine[]): void => {
    for (const entry of entries) {
      count += 1;
      if (count > CHECKOUT_PIPELINE_MAX_LINES) {
        throw new CheckoutPipelineBoundaryError(
          `${label} exceeds ${CHECKOUT_PIPELINE_MAX_LINES} total lines`,
        );
      }
      visit(entry.children);
    }
  };
  visit(lines);
}

function flattenQuotedLines(
  lines: readonly CheckoutQuotedLine[],
): readonly CheckoutQuotedLine[] {
  return lines.flatMap((line) => [line, ...flattenQuotedLines(line.children)]);
}

function flattenCartLineIds(
  lines: CheckoutRecalculationRequest["cartIntent"]["lines"],
): readonly string[] {
  return lines.flatMap((line) => [
    line.lineId,
    ...flattenCartLineIds(line.children),
  ]);
}

function assertNormalizedDiscountCodes(codes: readonly string[]): void {
  assertUnique(
    codes.map((code) => code.trim().toUpperCase()),
    "normalized discount codes",
  );
}

function assertPurchaseIntents(
  lines: CheckoutRecalculationRequest["cartIntent"]["lines"],
): void {
  for (const line of lines) {
    if (
      (line.purchase.type === "ONE_TIME" &&
        line.purchase.sellingPlanId !== null) ||
      (line.purchase.type === "SUBSCRIPTION" &&
        line.purchase.sellingPlanId === null)
    ) {
      throw new CheckoutPipelineBoundaryError(
        `Cart line ${line.lineId} has an inconsistent purchase type and selling plan`,
      );
    }
    assertPurchaseIntents(line.children);
  }
}

function assertSelectedHandle(
  selected: string | null,
  available: readonly string[],
  label: string,
): void {
  if (selected !== null && !available.includes(selected)) {
    throw new CheckoutPipelineBoundaryError(
      `Selected ${label} ${selected} is not available`,
    );
  }
}

function assertDeliverySelectionSource(
  source: CheckoutDeliveryOptionSelectionIntent | null,
  result: CheckoutDeliveryOptionSelectionResolution,
  availableHandles: readonly string[],
  groupId: string,
): void {
  if (source === null) {
    if (result.status !== "NONE") {
      throw new CheckoutPipelineBoundaryError(
        `Delivery fabricated a selection for group ${groupId}`,
      );
    }
    return;
  }
  if (result.status === "RESET") {
    if (
      result.previousOptionHandle !== source.optionHandle ||
      JSON.stringify(result.customerInput) !==
        JSON.stringify(source.customerInput)
    ) {
      throw new CheckoutPipelineBoundaryError(
        `Delivery must explicitly reset the unavailable selection for group ${groupId}`,
      );
    }
    return;
  }
  if (!availableHandles.includes(source.optionHandle)) {
    throw new CheckoutPipelineBoundaryError(
      `Delivery must explicitly reset the unavailable selection for group ${groupId}`,
    );
  }
  assertJsonEqual(
    result,
    {
      status: "SELECTED",
      optionHandle: source.optionHandle,
      customerInput: source.customerInput,
    },
    `Delivery changed shopper input for group ${groupId}`,
  );
}

function assertPaymentSelectionSource(
  source: CheckoutPaymentMethodSelectionIntent | null,
  result: CheckoutPaymentMethodSelectionResolution,
  availableHandles: readonly string[],
): void {
  if (source === null) {
    if (result.status !== "NONE") {
      throw new CheckoutPipelineBoundaryError(
        "Payments fabricated a method selection",
      );
    }
    return;
  }
  if (result.status === "RESET") {
    if (
      result.previousMethodHandle !== source.methodHandle ||
      JSON.stringify(result.customerInput) !==
        JSON.stringify(source.customerInput)
    ) {
      throw new CheckoutPipelineBoundaryError(
        "Payments must explicitly reset the unavailable method selection",
      );
    }
    return;
  }
  if (!availableHandles.includes(source.methodHandle)) {
    throw new CheckoutPipelineBoundaryError(
      "Payments must explicitly reset the unavailable method selection",
    );
  }
  assertJsonEqual(
    result,
    {
      status: "SELECTED",
      methodHandle: source.methodHandle,
      customerInput: source.customerInput,
    },
    "Payments changed shopper payment input",
  );
}

function assertJsonEqual(
  actual: unknown,
  expected: unknown,
  message: string,
): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new CheckoutPipelineBoundaryError(message);
  }
}

function assertSameIds(
  expected: readonly string[],
  actual: readonly string[],
  message: string,
): void {
  assertUnique(expected, `${message}: expected IDs`);
  assertUnique(actual, `${message}: actual IDs`);
  if (
    expected.length !== actual.length ||
    expected.some((id) => !actual.includes(id))
  ) {
    throw new CheckoutPipelineBoundaryError(message);
  }
}

function assertUnique(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) {
    throw new CheckoutPipelineBoundaryError(`${label} must be unique`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new CheckoutPipelineBoundaryError(message);
  }
}
