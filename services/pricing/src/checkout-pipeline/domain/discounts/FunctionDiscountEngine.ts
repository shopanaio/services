import type { Pricing } from "@shopana/broker-types";
import type {
  CommerceFunctionBindingRef,
  CommerceFunctionRunResult,
} from "@shopana/function-runner";
import { PricingCheckoutError } from "../../errors.js";
import type {
  PricingDeliveryDiscountFunctionOutput,
  PricingDeliveryDiscountFunctionInput,
  PricingLineDiscountFunctionOutput,
  PricingLineDiscountFunctionInput,
} from "../../discount-function-contracts.js";
import type { DiscountEvaluationSnapshot } from "../../infrastructure/DiscountEvaluationRepository.js";
import { money } from "../componentPricing.js";
import {
  collectNativeLineCandidates,
  collectNativeShippingCandidates,
  discountEligibility,
  initialLineCodeResolutions,
  type DiscountOwner,
} from "./NativeDiscountEngine.js";
import {
  applyLineDiscountCandidates,
  type LineDiscountCandidate,
} from "./LineDiscountApplicator.js";
import {
  applyShippingDiscountCandidates,
  type ShippingDiscountCandidate,
} from "./ShippingDiscountApplicator.js";

type Code = DiscountEvaluationSnapshot["codes"][number];
type ResolvedOwner = {
  owner: DiscountOwner;
  code: Code | null;
  inputIndex: number | null;
  inputCode: string | null;
};

export function functionOwnerIds(
  context: Pricing.PricingCheckoutEvaluationContext,
  lines: readonly Pricing.PricingCheckoutQuotedLine[],
  codes: readonly string[],
  snapshot: DiscountEvaluationSnapshot,
  classes: readonly Pricing.PricingCheckoutDiscountClass[],
): string[] {
  return [
    ...new Set(resolveOwners(context, lines, codes, snapshot, classes).map((row) => row.owner.id)),
  ].sort();
}

export function buildLineFunctionInput(
  context: Pricing.PricingCheckoutEvaluationContext,
  lines: readonly Pricing.PricingCheckoutQuotedLine[],
  codes: readonly string[],
): PricingLineDiscountFunctionInput {
  const flat = flatten(lines);
  return {
    schemaVersion: 1 as const,
    context: functionContext(context),
    lines: flat.map((line) => ({
      lineId: line.lineId,
      quantity: line.quantity,
      purchaseType: line.purchase.type,
      sellingPlanId: line.purchase.sellingPlanId,
      merchandise: {
        variantId: line.merchandise.variantId,
        productId: line.merchandise.targeting.productId,
        categoryIds: [...line.merchandise.targeting.categoryIds],
        tagIds: [...line.merchandise.targeting.tagIds],
        featureIds: [...line.merchandise.targeting.featureIds],
        optionValueIds: [...line.merchandise.targeting.optionValueIds],
      },
      unitPrice: line.unitPrice,
      subtotal: line.subtotal,
    })),
    discountCodes: [...codes],
    merchandiseSubtotal: money(
      flat
        .filter((line) => line.contributesToTotals)
        .reduce((sum, line) => sum + BigInt(line.subtotal.amountMinor), 0n),
      context.currencyCode,
    ),
  } as PricingLineDiscountFunctionInput;
}

export function buildDeliveryFunctionInput(
  context: Pricing.PricingCheckoutEvaluationContext,
  preliminary: Pricing.CalculateCheckoutPreliminaryQuoteResult,
  delivery: Pricing.PricingCheckoutDeliverySnapshot,
): PricingDeliveryDiscountFunctionInput {
  return {
    schemaVersion: 1 as const,
    context: functionContext(context),
    merchandiseTotal: preliminary.preliminaryTotals.merchandiseTotal,
    groups: delivery.groups.map((group) => {
      const selected =
        group.selectedOptionHandle === null
          ? null
          : (group.options.find((option) => option.handle === group.selectedOptionHandle) ?? null);
      return {
        groupId: group.groupId,
        lineIds: [...group.lineIds],
        selectedOption: selected
          ? {
              handle: selected.handle,
              code: selected.code,
              providerCode: selected.carrierCode ?? selected.code,
              cost: selected.cost,
            }
          : null,
      };
    }),
    discountCodes: preliminary.discountCodeResolutions.map((row) => row.inputCode),
  } as PricingDeliveryDiscountFunctionInput;
}

export function applyLineFunctionOutputs(input: {
  context: Pricing.PricingCheckoutEvaluationContext;
  lines: readonly Pricing.PricingCheckoutQuotedLine[];
  codes: readonly string[];
  snapshot: DiscountEvaluationSnapshot;
  bindings: readonly CommerceFunctionBindingRef[];
  run?: CommerceFunctionRunResult<PricingLineDiscountFunctionOutput> & {
    invalidFunctionBindingIds?: readonly string[];
  };
}) {
  const flat = flatten(input.lines);
  const owners = resolveOwners(input.context, flat, input.codes, input.snapshot, [
    "PRODUCT",
    "ORDER",
  ]);
  const codeResolutions = initialLineCodeResolutions(
    input.context,
    input.lines,
    input.codes,
    input.snapshot,
  );
  const candidates: LineDiscountCandidate[] = collectNativeLineCandidates(
    input.context,
    input.lines,
    input.codes,
    input.snapshot,
  );
  for (const output of input.run?.outputs ?? []) {
    const binding = input.bindings.find(
      (row) => row.functionBindingId === output.functionBindingId,
    );
    const resolved = owners.find((row) => row.owner.id === binding?.owner.resourceId);
    if (!binding || !resolved) continue;
    const outputError = validateLineOutput(
      output.data,
      resolved.owner,
      flat,
      input.context.currencyCode,
    );
    if (outputError) {
      if (binding.failureMode === "REQUIRED")
        throw new PricingCheckoutError("PRICING_FUNCTION_OUTPUT_INVALID", outputError, false);
      markInvalidOwner(codeResolutions, resolved);
      continue;
    }
    for (const candidate of output.data.candidates) {
      candidates.push({
        candidateId: candidate.candidateId,
        owner: resolved.owner,
        code: resolved.code,
        inputIndex: resolved.inputIndex,
        inputCode: resolved.inputCode,
        title: candidate.title,
        source: {
          kind: "FUNCTION",
          candidate,
          binding,
          implementationId: output.implementationId,
          trace: input.run!.trace,
        },
      });
    }
  }
  if (input.run) {
    markFunctionFailures(codeResolutions, owners, input.bindings, input.run);
  }
  const applied = applyLineDiscountCandidates({
    context: input.context,
    roots: input.lines,
    snapshot: input.snapshot,
    candidates,
    codeResolutions,
  });
  return applied;
}

export function applyDeliveryFunctionOutputs(input: {
  context: Pricing.PricingCheckoutEvaluationContext;
  preliminary: Pricing.CalculateCheckoutPreliminaryQuoteResult;
  delivery: Pricing.PricingCheckoutDeliverySnapshot;
  snapshot: DiscountEvaluationSnapshot;
  bindings: readonly CommerceFunctionBindingRef[];
  run?: CommerceFunctionRunResult<PricingDeliveryDiscountFunctionOutput> & {
    invalidFunctionBindingIds?: readonly string[];
  };
}) {
  const codes = input.preliminary.discountCodeResolutions.map((row) => row.inputCode);
  const owners = resolveOwners(
    input.context,
    flatten(input.preliminary.transformedLines),
    codes,
    input.snapshot,
    ["SHIPPING"],
  );
  const codeResolutions = [...input.preliminary.discountCodeResolutions];
  const knownGroups = new Map(input.delivery.groups.map((group) => [group.groupId, 0n] as const));
  const candidates: ShippingDiscountCandidate[] = collectNativeShippingCandidates(
    input.context,
    input.preliminary,
    input.delivery,
    input.snapshot,
  );
  for (const output of input.run?.outputs ?? []) {
    const binding = input.bindings.find(
      (row) => row.functionBindingId === output.functionBindingId,
    );
    const resolved = owners.find((row) => row.owner.id === binding?.owner.resourceId);
    if (!binding || !resolved) continue;
    const outputError = validateDeliveryOutput(
      output.data,
      resolved.owner,
      knownGroups,
      input.context.currencyCode,
    );
    if (outputError) {
      if (binding.failureMode === "REQUIRED")
        throw new PricingCheckoutError("PRICING_FUNCTION_OUTPUT_INVALID", outputError, false);
      markInvalidOwner(codeResolutions, resolved);
      continue;
    }
    for (const candidate of output.data.candidates) {
      candidates.push({
        candidateId: candidate.candidateId,
        owner: resolved.owner,
        code: resolved.code,
        inputIndex: resolved.inputIndex,
        inputCode: resolved.inputCode,
        title: candidate.title,
        groupIds: candidate.groupIds,
        value: candidate.value,
        maximumShippingPrice: candidate.maximumShippingPrice,
        source: {
          kind: "FUNCTION",
          binding,
          implementationId: output.implementationId,
          trace: input.run!.trace,
        },
      });
    }
  }
  if (input.run) {
    markFunctionFailures(codeResolutions, owners, input.bindings, input.run);
  }
  const applied = applyShippingDiscountCandidates({
    context: input.context,
    preliminary: input.preliminary,
    delivery: input.delivery,
    snapshot: input.snapshot,
    candidates,
    codeResolutions,
  });
  return applied;
}

function resolveOwners(
  context: Pricing.PricingCheckoutEvaluationContext,
  lines: readonly Pricing.PricingCheckoutQuotedLine[],
  inputCodes: readonly string[],
  snapshot: DiscountEvaluationSnapshot,
  classes: readonly Pricing.PricingCheckoutDiscountClass[],
): ResolvedOwner[] {
  const result: ResolvedOwner[] = [];
  for (const owner of snapshot.discounts) {
    if (owner.calculationStrategy !== "FUNCTION" || !classes.includes(owner.discountClass))
      continue;
    if (owner.method === "AUTOMATIC") {
      if (!discountEligibility(owner, null, context, [...lines], snapshot))
        result.push({ owner, code: null, inputIndex: null, inputCode: null });
      continue;
    }
    inputCodes.forEach((inputCode, inputIndex) => {
      const code = snapshot.codes.find(
        (row) => row.discountId === owner.id && row.normalizedCode === normalize(inputCode),
      );
      if (code && !discountEligibility(owner, code, context, [...lines], snapshot))
        result.push({ owner, code, inputIndex, inputCode });
    });
  }
  return result.sort(
    (left, right) =>
      right.owner.priority - left.owner.priority || left.owner.id.localeCompare(right.owner.id),
  );
}

function markFunctionFailures(
  results: Pricing.PricingCheckoutDiscountCodeResolution[],
  owners: readonly ResolvedOwner[],
  bindings: readonly CommerceFunctionBindingRef[],
  run: CommerceFunctionRunResult<unknown> & { invalidFunctionBindingIds?: readonly string[] },
) {
  const invalid = new Set(run.invalidFunctionBindingIds ?? []);
  const failed = new Set(
    run.trace.implementations
      .filter((row) => row.status !== "SUCCEEDED" && row.functionBindingId !== null)
      .map((row) => row.functionBindingId!),
  );
  for (const bindingId of new Set([...invalid, ...failed])) {
    const binding = bindings.find((row) => row.functionBindingId === bindingId);
    const resolved = owners.find(
      (row) => row.owner.id === binding?.owner.resourceId && row.inputIndex !== null,
    );
    if (!resolved || resolved.inputIndex === null) continue;
    const previous = results[resolved.inputIndex];
    if (previous?.status === "APPLIED") continue;
    results[resolved.inputIndex] = {
      inputCode: previous?.inputCode ?? resolved.code!.code,
      normalizedCode: resolved.code!.normalizedCode!,
      status: "REJECTED",
      discountId: resolved.owner.id,
      codeId: resolved.code!.id,
      reason: invalid.has(bindingId) ? "INVALID_FUNCTION_OUTPUT" : "FUNCTION_FAILED",
      message: invalid.has(bindingId) ? "invalid function output" : "discount function failed",
      retryable: false,
    };
  }
}

function markInvalidOwner(
  results: Pricing.PricingCheckoutDiscountCodeResolution[],
  resolved: ResolvedOwner,
) {
  if (resolved.inputIndex === null || !resolved.code) return;
  const previous = results[resolved.inputIndex];
  results[resolved.inputIndex] = {
    inputCode: previous?.inputCode ?? resolved.inputCode!,
    normalizedCode: resolved.code.normalizedCode!,
    status: "REJECTED",
    discountId: resolved.owner.id,
    codeId: resolved.code.id,
    reason: "INVALID_FUNCTION_OUTPUT",
    message: "invalid function output",
    retryable: false,
  };
}

function validateLineOutput(
  output: PricingLineDiscountFunctionOutput,
  owner: DiscountOwner,
  lines: readonly Pricing.PricingCheckoutQuotedLine[],
  currencyCode: string,
): string | null {
  const candidateIds = new Set<string>();
  const lineIds = new Set(
    lines.filter((line) => line.contributesToTotals).map((line) => line.lineId),
  );
  for (const candidate of output.candidates) {
    if (candidateIds.has(candidate.candidateId))
      return `Duplicate function candidate ${candidate.candidateId}`;
    candidateIds.add(candidate.candidateId);
    if (candidate.discountClass !== owner.discountClass)
      return "Function candidate class does not match its owner";
    if (
      candidate.targets.type === "LINES" &&
      (new Set(candidate.targets.lineIds).size !== candidate.targets.lineIds.length ||
        candidate.targets.lineIds.some((id) => !lineIds.has(id)))
    )
      return "Function candidate references an unknown or duplicate line";
    if (!candidateCurrencyMatches(candidate.value, candidate.maximumDiscount, currencyCode))
      return "Function candidate currency does not match checkout currency";
  }
  return null;
}

function validateDeliveryOutput(
  output: PricingDeliveryDiscountFunctionOutput,
  owner: DiscountOwner,
  groups: ReadonlyMap<string, bigint>,
  currencyCode: string,
): string | null {
  const candidateIds = new Set<string>();
  for (const candidate of output.candidates) {
    if (candidateIds.has(candidate.candidateId))
      return `Duplicate function candidate ${candidate.candidateId}`;
    candidateIds.add(candidate.candidateId);
    if (owner.discountClass !== "SHIPPING")
      return "Function candidate class does not match its owner";
    if (
      new Set(candidate.groupIds).size !== candidate.groupIds.length ||
      candidate.groupIds.some((id) => !groups.has(id))
    )
      return "Function candidate references an unknown or duplicate delivery group";
    if (!candidateCurrencyMatches(candidate.value, candidate.maximumShippingPrice, currencyCode))
      return "Function candidate currency does not match checkout currency";
  }
  return null;
}

function candidateCurrencyMatches(
  value: { type: string; amount?: Pricing.PricingCheckoutMoney },
  maximum: Pricing.PricingCheckoutMoney | null,
  currencyCode: string,
) {
  return (
    (!value.amount || value.amount.currencyCode === currencyCode) &&
    (!maximum || maximum.currencyCode === currencyCode)
  );
}

function functionContext(context: Pricing.PricingCheckoutEvaluationContext) {
  return {
    storeId: context.storeId,
    checkoutId: context.checkoutId,
    currencyCode: context.currencyCode,
    localeCode: context.localeCode,
    channelCode: context.channelCode,
    effectiveAt: context.effectiveAt,
    buyer: context.buyerEligibility
      ? {
          customerId: context.buyerEligibility.customerId,
          countryCode: context.buyerEligibility.countryCode,
          marketId: context.buyerEligibility.marketId,
          companyId: context.buyerEligibility.companyId,
          segmentIds: [...context.buyerEligibility.segmentIds],
        }
      : null,
  };
}
function flatten(
  lines: readonly Pricing.PricingCheckoutQuotedLine[],
): Pricing.PricingCheckoutQuotedLine[] {
  return lines.flatMap((line) => [line, ...flatten(line.children)]);
}
function normalize(code: string) {
  return code.trim().toUpperCase();
}
