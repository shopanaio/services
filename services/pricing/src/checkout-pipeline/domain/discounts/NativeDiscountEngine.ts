import type { Pricing } from "@shopana/broker-types";
import { money } from "../componentPricing.js";
import type { DiscountEvaluationSnapshot } from "../../infrastructure/DiscountEvaluationRepository.js";
import { planBuyXGetYUnits } from "./buyXGetYUnits.js";
import type { LineDiscountCandidate } from "./LineDiscountApplicator.js";
import type { ShippingDiscountCandidate } from "./ShippingDiscountApplicator.js";

export type DiscountOwner = DiscountEvaluationSnapshot["discounts"][number];
type Owner = DiscountOwner;
export type NativeLineAllocation = { lineId: string; amount: bigint; quantity: number | null };
type Allocation = NativeLineAllocation;

export function collectNativeLineCandidates(
  context: Pricing.PricingCheckoutEvaluationContext,
  roots: readonly Pricing.PricingCheckoutQuotedLine[],
  inputCodes: readonly string[],
  snapshot: DiscountEvaluationSnapshot,
): LineDiscountCandidate[] {
  const lines = flatten(roots);
  return owners(context, inputCodes, snapshot, ["PRODUCT", "ORDER"])
    .filter(
      (candidate) =>
        discountEligibility(candidate.owner, candidate.code, context, lines, snapshot) === null,
    )
    .map((candidate) => ({
      candidateId: "native",
      owner: candidate.owner,
      code: candidate.code,
      inputIndex: candidate.inputIndex,
      inputCode: candidate.inputIndex === null ? null : inputCodes[candidate.inputIndex]!,
      title: candidate.owner.title ?? candidate.code?.code ?? "Discount",
      source: { kind: "NATIVE" },
    }));
}

export function initialLineCodeResolutions(
  context: Pricing.PricingCheckoutEvaluationContext,
  roots: readonly Pricing.PricingCheckoutQuotedLine[],
  inputCodes: readonly string[],
  snapshot: DiscountEvaluationSnapshot,
): Pricing.PricingCheckoutDiscountCodeResolution[] {
  const lines = flatten(roots);
  return inputCodes.map((inputCode) => {
    const normalizedCode = normalize(inputCode);
    const code = snapshot.codes.find((candidate) => candidate.normalizedCode === normalizedCode);
    if (!code) return rejected(inputCode, null, null, "NOT_FOUND");
    const owner = snapshot.discounts.find((candidate) => candidate.id === code.discountId) ?? null;
    if (!owner) return rejected(inputCode, null, code, "NOT_ACTIVE");
    const reason = discountEligibility(owner, code, context, lines, snapshot);
    if (reason) return rejected(inputCode, owner, code, reason);
    if (owner.discountClass === "SHIPPING") {
      return {
        inputCode,
        normalizedCode,
        status: "PENDING",
        discountId: owner.id,
        codeId: code.id,
        reason: "AWAITING_DELIVERY",
      };
    }
    return rejected(inputCode, owner, code, "TARGET_NOT_ELIGIBLE");
  });
}

export function allocateNativeLineCandidate(
  owner: DiscountOwner,
  lines: Pricing.PricingCheckoutQuotedLine[],
  remaining: Map<string, bigint>,
  snapshot: DiscountEvaluationSnapshot,
): NativeLineAllocation[] {
  return owner.kind === "BUY_X_GET_Y"
    ? buyXGetY(owner, lines, remaining, snapshot)
    : amountOff(owner, lines, remaining, snapshot);
}

export function collectNativeShippingCandidates(
  context: Pricing.PricingCheckoutEvaluationContext,
  preliminary: Pricing.CalculateCheckoutPreliminaryQuoteResult,
  delivery: Pricing.PricingCheckoutDeliverySnapshot,
  snapshot: DiscountEvaluationSnapshot,
): ShippingDiscountCandidate[] {
  const inputCodes = preliminary.discountCodeResolutions.map((resolution) => resolution.inputCode);
  const lines = flatten(preliminary.transformedLines);
  return owners(context, inputCodes, snapshot, ["SHIPPING"])
    .filter(
      (candidate) =>
        discountEligibility(candidate.owner, candidate.code, context, lines, snapshot) === null,
    )
    .flatMap((candidate): ShippingDiscountCandidate[] => {
      const rule = snapshot.freeShipping.find((row) => row.discountId === candidate.owner.id);
      if (!rule) return [];
      return [
        {
          candidateId: "native",
          owner: candidate.owner,
          code: candidate.code,
          inputIndex: candidate.inputIndex,
          inputCode: candidate.inputIndex === null ? null : inputCodes[candidate.inputIndex]!,
          title: candidate.owner.title ?? candidate.code?.code ?? "Shipping discount",
          groupIds: delivery.groups.map((group) => group.groupId),
          value: { type: "FREE" },
          maximumShippingPrice:
            rule.maximumShippingPriceMinor === null
              ? null
              : money(rule.maximumShippingPriceMinor, context.currencyCode),
          source: { kind: "NATIVE" },
        },
      ];
    });
}

function owners(
  context: Pricing.PricingCheckoutEvaluationContext,
  codes: readonly string[],
  snapshot: DiscountEvaluationSnapshot,
  classes: Owner["discountClass"][],
) {
  const result: Array<{
    owner: Owner;
    code: DiscountEvaluationSnapshot["codes"][number] | null;
    inputIndex: number | null;
  }> = [];
  for (const owner of snapshot.discounts) {
    if (owner.calculationStrategy !== "NATIVE" || !classes.includes(owner.discountClass)) continue;
    if (owner.method === "AUTOMATIC") result.push({ owner, code: null, inputIndex: null });
    else
      codes.forEach((input, index) => {
        const code = snapshot.codes.find(
          (row) => row.discountId === owner.id && row.normalizedCode === normalize(input),
        );
        if (code) result.push({ owner, code, inputIndex: index });
      });
  }
  return result;
}
export function discountEligibility(
  owner: Owner,
  code: DiscountEvaluationSnapshot["codes"][number] | null,
  context: Pricing.PricingCheckoutEvaluationContext,
  lines: Pricing.PricingCheckoutQuotedLine[],
  s: DiscountEvaluationSnapshot,
): Pricing.PricingCheckoutDiscountCodeRejectionReason | null {
  if (code?.status === "DISABLED") return "DISABLED";
  const at = context.effectiveAt;
  if (
    owner.state !== "ACTIVE" ||
    owner.startsAt > at ||
    (owner.endsAt !== null && owner.endsAt <= at)
  )
    return "NOT_ACTIVE";
  if (owner.currency !== context.currencyCode) return "NOT_ACTIVE";
  if (
    !s.channels.some(
      (row) => row.discountId === owner.id && row.channelCode === context.channelCode,
    )
  )
    return "CHANNEL_NOT_ELIGIBLE";
  if (
    (lines.some((line) => line.purchase.type === "ONE_TIME") && !owner.appliesOnOneTimePurchase) ||
    (lines.some((line) => line.purchase.type === "SUBSCRIPTION") && !owner.appliesOnSubscription)
  )
    return "PURCHASE_TYPE_NOT_ELIGIBLE";
  const buyer = s.buyerContexts.find((row) => row.discountId === owner.id);
  if (
    buyer?.contextType === "CUSTOMERS" &&
    !s.customers.some(
      (row) =>
        row.discountId === owner.id &&
        row.customerId === context.buyerEligibility?.customerId &&
        row.referenceStatus === "VALID",
    )
  )
    return "BUYER_NOT_ELIGIBLE";
  if (
    buyer?.contextType === "SEGMENTS" &&
    !s.segments.some(
      (row) =>
        row.discountId === owner.id &&
        context.buyerEligibility?.segmentIds.includes(row.segmentId) &&
        row.referenceStatus === "VALID",
    )
  )
    return "BUYER_NOT_ELIGIBLE";
  const count = s.counters.find((row) => row.discountId === owner.id);
  if (
    owner.usageLimit !== null &&
    (count?.reservedCount ?? 0n) + (count?.committedCount ?? 0n) - (count?.reversedCount ?? 0n) >=
      owner.usageLimit
  )
    return "USAGE_LIMIT_REACHED";
  const cc = code && s.codeCounters.find((row) => row.codeId === code.id);
  if (
    code?.usageLimit !== null &&
    code?.usageLimit !== undefined &&
    (cc?.reservedCount ?? 0n) + (cc?.committedCount ?? 0n) - (cc?.reversedCount ?? 0n) >=
      code.usageLimit
  )
    return "USAGE_LIMIT_REACHED";
  if (owner.appliesOncePerCustomer) {
    const customerId = context.buyerEligibility?.customerId;
    if (!customerId) return "BUYER_NOT_ELIGIBLE";
    const hasReservation = s.reservations.some(
      (row) =>
        row.discountId === owner.id &&
        row.customerId === customerId &&
        (row.status === "COMMITTED" ||
          (row.status === "ACTIVE" && Date.parse(row.expiresAt) > Date.parse(context.effectiveAt))),
    );
    const hasRedemption = s.redemptions.some(
      (row) =>
        row.discountId === owner.id && row.customerId === customerId && row.status === "COMMITTED",
    );
    if (hasReservation || hasRedemption) return "USAGE_LIMIT_REACHED";
  }
  const min = s.minimums.find((row) => row.discountId === owner.id);
  const contributing = lines.filter((line) => line.contributesToTotals);
  if (
    min?.requirementType === "SUBTOTAL" &&
    contributing.reduce((sum, line) => sum + BigInt(line.subtotal.amountMinor), 0n) <
      min.subtotalMinor!
  )
    return "MINIMUM_REQUIREMENT_NOT_MET";
  if (
    min?.requirementType === "QUANTITY" &&
    contributing.reduce((sum, line) => sum + line.quantity, 0) < min.quantity!
  )
    return "MINIMUM_REQUIREMENT_NOT_MET";
  return null;
}
function eligibleLines(
  owner: Owner,
  lines: Pricing.PricingCheckoutQuotedLine[],
  snapshot: DiscountEvaluationSnapshot,
  role: "QUALIFIER" | "BENEFIT",
) {
  const contributing = lines.filter((line) => line.contributesToTotals);
  const selection = snapshot.selections.find(
    (row) => row.discountId === owner.id && row.role === role,
  );
  if (!selection) {
    return owner.kind === "AMOUNT_OFF_ORDER" ? contributing : [];
  }
  if (selection.targetType === "ALL_PRODUCTS") return contributing;

  const ids = new Set(
    snapshot.targets
      .filter(
        (row) =>
          row.discountId === owner.id && row.role === role && row.referenceStatus === "VALID",
      )
      .map((row) => row.targetId),
  );
  return contributing.filter((line) =>
    selection.targetType === "PRODUCTS"
      ? ids.has(line.merchandise.targeting.productId)
      : selection.targetType === "VARIANTS"
        ? ids.has(line.merchandise.variantId)
        : line.merchandise.targeting.categoryIds.some((id) => ids.has(id)),
  );
}
function amountOff(
  owner: Owner,
  lines: Pricing.PricingCheckoutQuotedLine[],
  remaining: Map<string, bigint>,
  s: DiscountEvaluationSnapshot,
): Allocation[] {
  const rule = s.amountOff.find((row) => row.discountId === owner.id);
  if (!rule) return [];
  const eligible = eligibleLines(owner, lines, s, "BENEFIT").filter(
    (line) => remaining.get(line.lineId)! > 0n,
  );
  if (!eligible.length) return [];
  const total = eligible.reduce((sum, line) => sum + remaining.get(line.lineId)!, 0n);
  if (rule.allocationMethod === "EACH") {
    const raw = eligible.map((line) => ({
      lineId: line.lineId,
      amount: min(
        remaining.get(line.lineId)!,
        rule.valueType === "PERCENTAGE"
          ? (remaining.get(line.lineId)! * BigInt(rule.percentageBps!)) / 10_000n
          : BigInt(line.quantity) * rule.amountMinor!,
      ),
      quantity: null,
    }));
    const rawTotal = raw.reduce((sum, row) => sum + row.amount, 0n);
    const capped =
      rule.maximumDiscountMinor === null ? rawTotal : min(rawTotal, rule.maximumDiscountMinor);
    return capped === rawTotal
      ? raw.filter((row) => row.amount > 0n)
      : allocateProportionally(
          capped,
          raw.map((row) => ({ lineId: row.lineId, weight: row.amount })),
        );
  }
  let amount =
    rule.valueType === "PERCENTAGE"
      ? (total * BigInt(rule.percentageBps!)) / 10_000n
      : min(rule.amountMinor!, total);
  if (rule.maximumDiscountMinor !== null) amount = min(amount, rule.maximumDiscountMinor);
  return allocateProportionally(
    amount,
    eligible.map((line) => ({ lineId: line.lineId, weight: remaining.get(line.lineId)! })),
  );
}
function buyXGetY(
  owner: Owner,
  lines: Pricing.PricingCheckoutQuotedLine[],
  remaining: Map<string, bigint>,
  s: DiscountEvaluationSnapshot,
): Allocation[] {
  const rule = s.buyXGetY.find((row) => row.discountId === owner.id);
  if (!rule) return [];
  const plan = planBuyXGetYUnits({
    allLinesInPreorder: lines,
    qualifierLines: eligibleLines(owner, lines, s, "QUALIFIER"),
    benefitLines: eligibleLines(owner, lines, s, "BENEFIT"),
    requirement:
      rule.requirementType === "QUANTITY"
        ? { type: "QUANTITY", requiredQuantity: rule.requiredQuantity! }
        : { type: "SUBTOTAL", requiredSubtotal: rule.requiredSubtotalMinor! },
    benefitQuantity: rule.benefitQuantity,
    usesPerOrderLimit: rule.usesPerOrderLimit,
  });
  const result: Allocation[] = [];
  for (const selection of plan.benefitSelections) {
    const unit = selection.unitPrice;
    const per =
      rule.benefitStrategy === "FREE"
        ? unit
        : rule.benefitValueType === "PERCENTAGE"
          ? (unit * BigInt(rule.benefitPercentageBps!)) / 10_000n
          : min(unit, rule.benefitAmountMinor!);
    const nominalAmount = per * BigInt(selection.quantity);
    const amount = min(nominalAmount, remaining.get(selection.lineId) ?? 0n);
    if (amount > 0n) {
      result.push({
        lineId: selection.lineId,
        amount,
        quantity: amount === nominalAmount ? selection.quantity : null,
      });
    }
  }
  return result;
}
export function allocateProportionally(
  requestedAmount: bigint,
  values: readonly { lineId: string; weight: bigint }[],
): NativeLineAllocation[] {
  const eligible = values.filter(({ weight }) => weight > 0n);
  const totalCapacity = eligible.reduce((sum, row) => sum + row.weight, 0n);
  const amount = min(requestedAmount, totalCapacity);
  if (amount <= 0n || totalCapacity === 0n) return [];

  const shares = eligible.map(({ weight }) => min(weight, (amount * weight) / totalCapacity));
  let remainder = amount - shares.reduce((sum, current) => sum + current, 0n);

  for (let index = eligible.length - 1; index >= 0 && remainder > 0n; index--) {
    const capacity = eligible[index]!.weight - shares[index]!;
    const extra = min(remainder, capacity);
    shares[index] = shares[index]! + extra;
    remainder -= extra;
  }
  if (remainder !== 0n) {
    throw new RangeError("Discount allocation exceeds eligible capacity");
  }

  return eligible.flatMap((row, index) =>
    shares[index]! > 0n ? [{ lineId: row.lineId, amount: shares[index]!, quantity: null }] : [],
  );
}

export function canonicalCounterVersions(
  snapshot: Pick<DiscountEvaluationSnapshot, "counters" | "codeCounters">,
) {
  return {
    counters: [...snapshot.counters]
      .sort((left, right) => left.discountId.localeCompare(right.discountId))
      .map((row) => ({ id: row.discountId, version: String(row.version) })),
    codeCounters: [...snapshot.codeCounters]
      .sort(
        (left, right) =>
          left.discountId.localeCompare(right.discountId) ||
          left.codeId.localeCompare(right.codeId),
      )
      .map((row) => ({ id: row.codeId, version: String(row.version) })),
  };
}
function rejected(
  inputCode: string,
  owner: Owner | null,
  code: DiscountEvaluationSnapshot["codes"][number] | null,
  reason: Pricing.PricingCheckoutDiscountCodeRejectionReason,
): Pricing.PricingCheckoutDiscountCodeResolution {
  return {
    inputCode,
    normalizedCode: normalize(inputCode),
    status: "REJECTED",
    discountId: owner?.id ?? null,
    codeId: code?.id ?? null,
    reason,
    message: reason.replaceAll("_", " ").toLowerCase(),
    retryable: false,
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
function min(a: bigint, b: bigint) {
  return a < b ? a : b;
}
