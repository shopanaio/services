import { randomUUID } from "node:crypto";
import type { Catalog, Pricing } from "@shopana/broker-types";
import type { ContextStore } from "@shopana/shared-context";
import type { PricingCatalogMerchandisePort } from "../contracts.js";
import { toCatalogMerchandiseParams } from "../catalog-merchandise.js";
import { canonicalJson, contentRevision } from "../canonicalJson.js";
import { PricingCheckoutError } from "../errors.js";
import { buildDeliveryIntent } from "../domain/deliveryIntent.js";
import { validateFinalDelivery } from "../domain/finalDeliveryValidation.js";
import { money } from "../domain/componentPricing.js";
import { transformLines } from "../domain/lineTransformation.js";
import { PricingCheckoutQuoteRepository } from "../infrastructure/PricingCheckoutQuoteRepository.js";
import { DiscountEvaluationRepository } from "../infrastructure/DiscountEvaluationRepository.js";
import {
  applyDeliveryFunctionOutputs,
  applyLineFunctionOutputs,
  buildDeliveryFunctionInput,
  buildLineFunctionInput,
  functionOwnerIds,
} from "../domain/discounts/FunctionDiscountEngine.js";
import { PricingFunctionBindingRepository } from "../infrastructure/PricingFunctionBindingRepository.js";
import { PricingDiscountFunctionRunner } from "../functions/PricingDiscountFunctionRunner.js";

export class PricingCheckoutQuoteService {
  constructor(
    private readonly catalog: PricingCatalogMerchandisePort,
    private readonly snapshots: PricingCheckoutQuoteRepository,
    private readonly discounts: DiscountEvaluationRepository,
    private readonly functionBindings: PricingFunctionBindingRepository,
    private readonly functionRunner: PricingDiscountFunctionRunner,
  ) {}

  async calculatePreliminaryQuote(
    params: Pricing.CalculateCheckoutPreliminaryQuoteParams,
    store: ContextStore,
  ): Promise<Pricing.CalculateCheckoutPreliminaryQuoteResult> {
    this.validateContext(params.context, store);
    const requestDigest = contentRevision("pricing-preliminary-request", params);
    const attempt = attemptOf(params.context, requestDigest);
    const replay = await this.snapshots.findPreliminary(attempt);
    if (replay) return replay;
    const catalogResult = await this.catalog.resolve(
      toCatalogMerchandiseParams(params.context, params.cartIntent),
    );
    if (!catalogResult.ok)
      throw new PricingCheckoutError(
        "PRICING_CATALOG_UNAVAILABLE",
        "Catalog merchandise is unavailable",
        catalogResult.retryable,
        { code: catalogResult.code },
      );
    assertCatalogCoverage(params.cartIntent.lines, catalogResult, params.context.currencyCode);
    const transformed = transformLines(
      params.cartIntent,
      catalogResult,
      params.context.currencyCode,
    );
    const deliveryIntent = buildDeliveryIntent(params.cartIntent, transformed.flat);
    const discountSnapshot = await this.discounts.read(store.id);
    const functionInput = buildLineFunctionInput(
      params.context,
      transformed.lines,
      params.cartIntent.discountCodes,
    );
    const activeBindings = await this.functionBindings.listActive({
      storeId: store.id,
      target: "cart.lines.discounts.generate.run",
      discountIds: functionOwnerIds(
        params.context,
        transformed.lines,
        params.cartIntent.discountCodes,
        discountSnapshot,
        ["PRODUCT", "ORDER"],
      ),
    });
    const functionRun =
      activeBindings.bindings.length === 0
        ? undefined
        : await this.functionRunner.runLines({
            storeId: store.id,
            bindings: activeBindings.bindings,
            bindingSetRevision: activeBindings.bindingSetRevision,
            input: functionInput,
            executionId: params.context.executionId,
            correlationId: params.context.correlationId,
            deadlineAt: params.context.deadlineAt,
          });
    const discountResult = applyLineFunctionOutputs({
      context: params.context,
      lines: transformed.lines,
      codes: params.cartIntent.discountCodes,
      snapshot: discountSnapshot,
      bindings: activeBindings.bindings,
      run: functionRun,
    });
    const discountedFlat = flattenQuoted(discountResult.lines);
    const subtotal = transformed.flat
      .filter((line) => line.contributesToTotals)
      .reduce((sum, line) => sum + BigInt(line.subtotal.amountMinor), 0n);
    const total = discountedFlat
      .filter((line) => line.contributesToTotals)
      .reduce((sum, line) => sum + BigInt(line.total.amountMinor), 0n);
    const stable = {
      executionId: params.context.executionId,
      checkoutId: params.context.checkoutId,
      currencyCode: params.context.currencyCode,
      discountEvaluationRevision: discountResult.revision,
      transformedLines: discountResult.lines,
      sourceLineResolutions: transformed.resolutions,
      deliveryIntent,
      merchandiseRevision: catalogResult.merchandiseRevision,
      availabilityRevision: catalogResult.availabilityRevision,
      appliedDiscounts: discountResult.applications,
      discountCodeResolutions: discountResult.codeResolutions,
      usageRequirements: discountResult.requirements,
      preliminaryTotals: {
        merchandiseSubtotal: money(subtotal, params.context.currencyCode),
        merchandiseDiscountTotal: money(subtotal - total, params.context.currencyCode),
        merchandiseTotal: money(total, params.context.currencyCode),
      },
    };
    const result: Pricing.CalculateCheckoutPreliminaryQuoteResult = {
      preliminaryQuoteId: randomUUID(),
      revision: contentRevision("pricing-preliminary-quote", stable),
      ...stable,
    };
    return this.snapshots.savePreliminary(attempt, result);
  }

  async finalizeQuote(
    params: Pricing.FinalizeCheckoutPricingQuoteParams,
    store: ContextStore,
  ): Promise<Pricing.FinalizeCheckoutPricingQuoteResult> {
    this.validateContext(params.context, store);
    assertProvenance(params);
    const requestDigest = contentRevision("pricing-final-request", params);
    const attempt = attemptOf(params.context, requestDigest);
    const replay = await this.snapshots.findFinal(attempt);
    if (replay) return replay;
    const persisted = await this.snapshots.getPreliminaryById(
      store.id,
      params.preliminary.preliminaryQuoteId,
    );
    if (!persisted || canonicalJson(persisted) !== canonicalJson(params.preliminary))
      throw new PricingCheckoutError(
        "PRICING_FINAL_PRELIMINARY_MISMATCH",
        "Preliminary quote is not the persisted Pricing snapshot",
        false,
      );
    const deliverySubtotal = validateFinalDelivery(
      params.preliminary,
      params.delivery,
      params.context.currencyCode,
    );
    const merchandiseTotal = BigInt(
      params.preliminary.preliminaryTotals.merchandiseTotal.amountMinor,
    );
    const currency = params.context.currencyCode;
    const discountSnapshot = await this.discounts.read(store.id);
    const functionInput = buildDeliveryFunctionInput(
      params.context,
      params.preliminary,
      params.delivery,
    );
    const activeBindings = await this.functionBindings.listActive({
      storeId: store.id,
      target: "cart.delivery-options.discounts.generate.run",
      discountIds: functionOwnerIds(
        params.context,
        params.preliminary.transformedLines,
        functionInput.discountCodes,
        discountSnapshot,
        ["SHIPPING"],
      ),
    });
    const functionRun =
      activeBindings.bindings.length === 0
        ? undefined
        : await this.functionRunner.runDelivery({
            storeId: store.id,
            bindings: activeBindings.bindings,
            bindingSetRevision: activeBindings.bindingSetRevision,
            input: functionInput,
            executionId: params.context.executionId,
            correlationId: params.context.correlationId,
            deadlineAt: params.context.deadlineAt,
          });
    const shipping = applyDeliveryFunctionOutputs({
      context: params.context,
      preliminary: params.preliminary,
      delivery: params.delivery,
      snapshot: discountSnapshot,
      bindings: activeBindings.bindings,
      run: functionRun,
    });
    const deliveryDiscount = shipping.applications.reduce(
      (sum, app) => sum + BigInt(app.amount.amountMinor),
      0n,
    );
    const deliveryTotal = deliverySubtotal - deliveryDiscount;
    const appliedDiscounts = [
      ...params.preliminary.appliedDiscounts,
      ...shipping.applications,
    ].sort(
      (left, right) =>
        right.priority - left.priority ||
        left.discountId.localeCompare(right.discountId) ||
        left.applicationId.localeCompare(right.applicationId),
    );
    const stable = {
      executionId: params.context.executionId,
      checkoutId: params.context.checkoutId,
      currencyCode: currency,
      discountEvaluationRevision: shipping.revision,
      basedOnPreliminaryDiscountEvaluationRevision: params.preliminary.discountEvaluationRevision,
      basedOnPreliminaryRevision: params.preliminary.revision,
      basedOnDeliveryRevision: params.delivery.revision,
      lines: params.preliminary.transformedLines,
      appliedDiscounts,
      discountCodeResolutions: shipping.codes,
      usageRequirements: [...params.preliminary.usageRequirements, ...shipping.requirements],
      totals: {
        ...params.preliminary.preliminaryTotals,
        taxTotal: money(0n, currency),
        deliverySubtotal: money(deliverySubtotal, currency),
        deliveryDiscountTotal: money(deliveryDiscount, currency),
        deliveryTotal: money(deliveryTotal, currency),
        payableTotal: money(merchandiseTotal + deliveryTotal, currency),
      },
    };
    const result: Pricing.FinalizeCheckoutPricingQuoteResult = {
      quoteId: randomUUID(),
      revision: contentRevision("pricing-final-quote", stable),
      ...stable,
    };
    return this.snapshots.saveFinal(attempt, params.preliminary.preliminaryQuoteId, result);
  }

  private validateContext(
    context: Pricing.PricingCheckoutEvaluationContext,
    store: ContextStore,
  ): void {
    if (context.storeId !== store.id)
      throw new PricingCheckoutError(
        "PRICING_CHECKOUT_STORE_NOT_FOUND",
        "Store context mismatch",
        false,
      );
    if (context.currencyCode !== store.currencyCode)
      throw new PricingCheckoutError(
        "PRICING_CHECKOUT_CURRENCY_MISMATCH",
        "Checkout currency must match store currency",
        false,
      );
    if (Date.parse(context.deadlineAt) <= Date.now())
      throw new PricingCheckoutError(
        "PRICING_CHECKOUT_REQUEST_INVALID",
        "Checkout pricing deadline has expired",
        false,
      );
  }
}

function attemptOf(context: Pricing.PricingCheckoutEvaluationContext, requestDigest: string) {
  return {
    storeId: context.storeId,
    checkoutId: context.checkoutId,
    executionId: context.executionId,
    requestDigest,
  };
}
function flattenQuoted(
  lines: readonly Pricing.PricingCheckoutQuotedLine[],
): Pricing.PricingCheckoutQuotedLine[] {
  return lines.flatMap((line) => [line, ...flattenQuoted(line.children)]);
}
function assertCatalogCoverage(
  lines: readonly Pricing.PricingCheckoutCartLineIntent[],
  result: Extract<Catalog.ResolveCheckoutMerchandiseResult, { ok: true }>,
  currencyCode: string,
): void {
  const expected = flattenWithParent(lines);
  if (result.lines.length !== expected.length)
    throw new PricingCheckoutError(
      "PRICING_CATALOG_RESPONSE_INVALID",
      "Catalog returned incomplete line coverage",
      false,
    );
  result.lines.forEach((row, index) => {
    const source = expected[index]!;
    const actual = row.status === "RESOLVED" ? row.line : row;
    if (
      actual.lineId !== source.line.lineId ||
      actual.variantId !== source.line.variantId ||
      actual.parentLineId !== source.parentLineId ||
      (row.status === "RESOLVED" &&
        (row.line.quantity !== source.line.quantity ||
          canonicalJson(row.line.purchase) !== canonicalJson(source.line.purchase) ||
          row.line.price.price.currencyCode !== currencyCode ||
          row.line.price.compareAtPrice?.currencyCode !== currencyCode ||
          (row.line.componentSelection?.componentItemId ?? null) !==
            (source.line.componentSelection?.componentItemId ?? null))) ||
      (row.status === "REJECTED" &&
        row.componentItemId !== (source.line.componentSelection?.componentItemId ?? null))
    )
      throw new PricingCheckoutError(
        "PRICING_CATALOG_RESPONSE_INVALID",
        "Catalog line order, identity or currency mismatch",
        false,
      );
  });
}
function flattenWithParent(
  lines: readonly Pricing.PricingCheckoutCartLineIntent[],
  parentLineId: string | null = null,
): Array<{ line: Pricing.PricingCheckoutCartLineIntent; parentLineId: string | null }> {
  return lines.flatMap((line) => [
    { line, parentLineId },
    ...flattenWithParent(line.children, line.lineId),
  ]);
}
function assertProvenance(params: Pricing.FinalizeCheckoutPricingQuoteParams): void {
  const { context, preliminary, delivery } = params;
  const expected = [
    context.executionId,
    context.checkoutId,
    context.expectedCheckoutVersion,
    context.currencyCode,
  ];
  const preliminaryActual = [
    preliminary.executionId,
    preliminary.checkoutId,
    preliminary.basedOnCheckoutVersion,
    preliminary.currencyCode,
  ];
  if (preliminaryActual.some((value, index) => value !== expected[index]))
    throw new PricingCheckoutError(
      "PRICING_FINAL_PRELIMINARY_MISMATCH",
      "Preliminary quote provenance mismatch",
      false,
    );
  const deliveryActual = [
    delivery.executionId,
    delivery.checkoutId,
    delivery.basedOnCheckoutVersion,
    delivery.currencyCode,
  ];
  if (deliveryActual.some((value, index) => value !== expected[index]))
    throw new PricingCheckoutError(
      "PRICING_FINAL_DELIVERY_MISMATCH",
      "Delivery snapshot provenance mismatch",
      false,
    );
  if (delivery.basedOnPreliminaryRevision !== preliminary.revision)
    throw new PricingCheckoutError(
      "PRICING_FINAL_DELIVERY_MISMATCH",
      "Delivery is based on a stale preliminary quote",
      false,
    );
}
