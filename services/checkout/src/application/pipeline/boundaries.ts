import { ShippingPaymentModel } from "@shopana/shared-service-api";

import type {
  CalculateDeliveryOptionsRequest,
  CalculateDeliveryOptionsResult,
  CalculatePreliminaryPricingRequest,
  CalculatePreliminaryPricingResult,
  CheckoutPipelineExecutionContext,
  CheckoutPipelineStageProvenance,
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
  assertCartIntent(request.cartIntent);
  return request;
}

export function parseCalculateDeliveryOptionsRequest(
  value: unknown,
): CalculateDeliveryOptionsRequest {
  assertPayloadSize(value, "delivery options request");
  const request = calculateDeliveryOptionsRequestSchema.parse(value);
  assertProvenance(request.context, request.preliminary);
  assertCurrency(
    request.preliminary,
    request.context.currencyCode,
    "preliminary pricing",
  );
  assertPreliminaryPricingArithmetic(request.preliminary);
  assertLineLimit(request.preliminary.transformedLines, "transformed pricing lines");
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
  assertCurrency(request, request.context.currencyCode, "final pricing request");
  assertPreliminaryPricingArithmetic(request.preliminary);
  assertDeliveryGroups(
    { context: request.context, preliminary: request.preliminary },
    request.delivery,
  );
  return request;
}

export function parseGetAvailablePaymentMethodsRequest(
  value: unknown,
): GetAvailablePaymentMethodsRequest {
  assertPayloadSize(value, "payment methods request");
  const request = getAvailablePaymentMethodsRequestSchema.parse(value);
  assertProvenance(request.context, request.finalQuote);
  assertProvenance(request.context, request.delivery);
  assertEqual(
    request.finalQuote.basedOnDeliveryRevision,
    request.delivery.revision,
    "Payment request contains mismatched final quote and delivery revisions",
  );
  assertCurrency(request, request.context.currencyCode, "payment methods request");
  assertFinalPricingArithmetic(request.finalQuote);
  assertDeliveryTotal(request.delivery, request.finalQuote);
  assertLineLimit(request.cartIntent.lines, "cart intent");
  assertCartIntent(request.cartIntent);
  return request;
}

export function parseValidateCheckoutRequest(
  value: unknown,
): ValidateCheckoutRequest {
  assertPayloadSize(value, "checkout validation request");
  const request = validateCheckoutRequestSchema.parse(value);
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
  assertCurrency(request, request.context.currencyCode, "validation request");
  assertPreliminaryPricingArithmetic(request.preliminary);
  assertFinalPricingArithmetic(request.finalQuote);
  assertDeliveryTotal(request.delivery, request.finalQuote);
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
  assertCurrency(result, request.context.currencyCode, "preliminary pricing");
  assertPreliminaryPricingArithmetic(result);
  assertLineLimit(result.transformedLines, "transformed pricing lines");
  assertDeliveryIntent(request, result);
  return result;
}

export function parseCalculateDeliveryOptionsResult(
  request: CalculateDeliveryOptionsRequest,
  value: unknown,
): CalculateDeliveryOptionsResult {
  assertPayloadSize(value, "delivery options result");
  const result = calculateDeliveryOptionsResultSchema.parse(value);
  assertProvenance(request.context, result);
  assertEqual(
    result.basedOnPreliminaryRevision,
    request.preliminary.revision,
    "Delivery result has stale preliminary revision",
  );
  assertCurrency(result, request.context.currencyCode, "delivery options");
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
  assertCurrency(result, request.context.currencyCode, "final pricing");
  assertFinalPricingArithmetic(result);
  assertDeliveryTotal(request.delivery, result);
  assertLineLimit(result.lines, "final pricing lines");
  assertSameIds(
    flattenQuotedLines(request.preliminary.transformedLines).map(
      ({ lineId }) => lineId,
    ),
    flattenQuotedLines(result.lines).map(({ lineId }) => lineId),
    "Final pricing changed transformed line identity",
  );
  return result;
}

function assertDeliveryTotal(
  delivery: CalculateDeliveryOptionsResult,
  result: FinalizePricingQuoteResult,
): void {
  let maximumMerchantCollectedTotal = 0n;
  for (const group of delivery.groups) {
    const selected = group.options.find(
      ({ handle }) => handle === group.selectedOptionHandle,
    );
    if (
      selected?.shippingPaymentModel === ShippingPaymentModel.MERCHANT_COLLECTED
    ) {
      maximumMerchantCollectedTotal += BigInt(selected.cost.amountMinor);
    }
  }
  const deliveryTotal = BigInt(result.totals.deliveryTotal.amountMinor);
  if (
    deliveryTotal < 0n ||
    deliveryTotal > maximumMerchantCollectedTotal
  ) {
    throw new CheckoutPipelineBoundaryError(
      "Final deliveryTotal includes carrier-direct cost or exceeds selected merchant-collected costs",
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
  if (subtotal < 0n || discount < 0n || total !== subtotal - discount) {
    throw new CheckoutPipelineBoundaryError(
      "Preliminary merchandise totals are arithmetically inconsistent",
    );
  }
}

function assertFinalPricingArithmetic(result: FinalizePricingQuoteResult): void {
  const subtotal = BigInt(result.totals.subtotal.amountMinor);
  const discount = BigInt(result.totals.discountTotal.amountMinor);
  const tax = BigInt(result.totals.taxTotal.amountMinor);
  const delivery = BigInt(result.totals.deliveryTotal.amountMinor);
  const payable = BigInt(result.totals.payableTotal.amountMinor);
  if (
    subtotal < 0n ||
    discount < 0n ||
    tax < 0n ||
    delivery < 0n ||
    payable !== subtotal - discount + tax + delivery
  ) {
    throw new CheckoutPipelineBoundaryError(
      "Final pricing totals are arithmetically inconsistent",
    );
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
  assertSelectedHandle(
    result.selectedMethodHandle,
    result.methods.map(({ handle }) => handle),
    "payment method",
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
  const result = checkoutRecalculationResultSchema.parse(value);
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
  assertTrace(result);
  assertOutcomeSequence(result);
  assertSuccessfulStages(request, result);
  if (Date.parse(result.trace.completedAt) > Date.parse(request.context.deadlineAt)) {
    throw new CheckoutPipelineBoundaryError(
      "Pipeline result completed after the request deadline",
    );
  }
  return result;
}

function assertSuccessfulStages(
  request: CheckoutRecalculationRequest,
  result: CheckoutRecalculationResult,
): void {
  if (result.preliminaryPricing.status !== "SUCCESS") {
    return;
  }
  const preliminary = parseCalculatePreliminaryPricingResult(
    { context: request.context, cartIntent: request.cartIntent },
    result.preliminaryPricing.data,
  );
  if (result.delivery.status !== "SUCCESS") {
    return;
  }
  const delivery = parseCalculateDeliveryOptionsResult(
    { context: request.context, preliminary },
    result.delivery.data,
  );
  if (result.finalPricing.status !== "SUCCESS") {
    return;
  }
  const finalQuote = parseFinalizePricingQuoteResult(
    { context: request.context, preliminary, delivery },
    result.finalPricing.data,
  );
  if (result.payment.status !== "SUCCESS") {
    return;
  }
  const payment = parseGetAvailablePaymentMethodsResult(
    {
      context: request.context,
      cartIntent: request.cartIntent,
      finalQuote,
      delivery,
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
    result.preliminaryPricing,
    result.delivery,
    result.finalPricing,
    result.payment,
    result.validation,
  ] as const;
  let blocked = false;
  for (const outcome of outcomes) {
    if (blocked && outcome.status !== "SKIPPED") {
      throw new CheckoutPipelineBoundaryError(
        "A data-dependent stage ran after the pipeline was stopped",
      );
    }
    if (outcome.status === "SKIPPED" && !blocked) {
      blocked = true;
      continue;
    }
    if (
      outcome.status === "FAILED" ||
      outcome.issues.some(({ effect }) => effect === "STOP")
    ) {
      blocked = true;
    }
  }
}

function assertDeliveryIntent(
  request: CalculatePreliminaryPricingRequest,
  result: CalculatePreliminaryPricingResult,
): void {
  const sourceLineIds = new Set(
    flattenCartLineIds(request.cartIntent.lines),
  );
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

  const lineageLineIds = result.deliveryIntent.lineage.map(({ lineId }) => lineId);
  assertUnique(lineageLineIds, "lineage line IDs");
  assertSameIds(
    transformedLineIds,
    lineageLineIds,
    "Lineage does not cover every transformed line exactly once",
  );
  for (const lineage of result.deliveryIntent.lineage) {
    for (const sourceLineId of lineage.sourceLineIds) {
      if (!sourceLineIds.has(sourceLineId)) {
        throw new CheckoutPipelineBoundaryError(
          `Lineage references unknown source line ${sourceLineId}`,
        );
      }
    }
  }

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
      JSON.stringify(destination.address) !==
      JSON.stringify(sourceDestination.address)
    ) {
      throw new CheckoutPipelineBoundaryError(
        `Canonical destination ${destination.destinationId} changed its address snapshot`,
      );
    }
    assertEqual(
      destination.selectedDeliveryOptionHandle,
      request.cartIntent.selectedDeliveryOptionHandles[
        destination.destinationId
      ] ?? null,
      `Canonical destination ${destination.destinationId} changed its selected option`,
    );
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
  assertSameIds(
    [...physicalLineIds],
    assignedLineIds,
    "Canonical destinations must assign every physical line exactly once",
  );
}

function assertCartIntent(
  cartIntent: CheckoutRecalculationRequest["cartIntent"],
): void {
  const lineIds = flattenCartLineIds(cartIntent.lines);
  const knownLineIds = new Set(lineIds);
  assertUnique(lineIds, "cart line IDs");
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
  for (const destinationId of Object.keys(
    cartIntent.selectedDeliveryOptionHandles,
  )) {
    if (
      !cartIntent.destinations.some(
        (destination) => destination.destinationId === destinationId,
      )
    ) {
      throw new CheckoutPipelineBoundaryError(
        `Selected delivery option references unknown destination ${destinationId}`,
      );
    }
  }
}

function assertDeliveryGroups(
  request: CalculateDeliveryOptionsRequest,
  result: CalculateDeliveryOptionsResult,
): void {
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
  for (const group of result.groups) {
    assertUnique(group.lineIds, `line IDs in delivery group ${group.groupId}`);
    assertUnique(
      group.options.map(({ handle }) => handle),
      `option handles in delivery group ${group.groupId}`,
    );
    assertSelectedHandle(
      group.selectedOptionHandle,
      group.options.map(({ handle }) => handle),
      `delivery option in group ${group.groupId}`,
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
  });
}

function assertProvenance(
  context: CheckoutPipelineExecutionContext,
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

function assertCurrency(value: unknown, expected: string, path: string): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertCurrency(entry, expected, `${path}[${index}]`),
    );
    return;
  }
  if (value === null || typeof value !== "object") {
    return;
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.amountMinor === "string" &&
    typeof record.currencyCode === "string" &&
    record.currencyCode !== expected
  ) {
    throw new CheckoutPipelineBoundaryError(
      `${path} contains money in ${record.currencyCode}; expected ${expected}`,
    );
  }
  for (const [key, entry] of Object.entries(record)) {
    assertCurrency(entry, expected, `${path}.${key}`);
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
