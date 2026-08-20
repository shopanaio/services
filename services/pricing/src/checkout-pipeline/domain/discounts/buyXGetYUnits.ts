import type { Pricing } from "@shopana/broker-types";

export interface CanonicalUnitRange {
  lineId: string;
  linePreorderIndex: number;
  startUnitIndex: number;
  quantity: number;
  unitPrice: bigint;
}

export type BuyXGetYRequirement =
  { type: "QUANTITY"; requiredQuantity: number } | { type: "SUBTOTAL"; requiredSubtotal: bigint };

export interface BuyXGetYUnitPlan {
  uses: bigint;
  qualifierReservations: CanonicalUnitRange[];
  benefitSelections: CanonicalUnitRange[];
}

export function planBuyXGetYUnits(input: {
  allLinesInPreorder: readonly Pricing.PricingCheckoutQuotedLine[];
  qualifierLines: readonly Pricing.PricingCheckoutQuotedLine[];
  benefitLines: readonly Pricing.PricingCheckoutQuotedLine[];
  requirement: BuyXGetYRequirement;
  benefitQuantity: number;
  usesPerOrderLimit: number | null;
}): BuyXGetYUnitPlan {
  const preorderByLineId = new Map(
    input.allLinesInPreorder.map((line, index) => [line.lineId, index]),
  );
  const qualifierRanges = canonicalRanges(input.qualifierLines, preorderByLineId);
  const possibleUses = countPossibleUses(qualifierRanges, input.requirement);
  const uses =
    input.usesPerOrderLimit === null
      ? possibleUses
      : min(possibleUses, BigInt(input.usesPerOrderLimit));
  if (uses === 0n) {
    return { uses, qualifierReservations: [], benefitSelections: [] };
  }

  const qualifierReservations = reserveQualifierRanges(qualifierRanges, input.requirement, uses);
  const reservedByLineId = new Map<string, number>();
  for (const range of qualifierReservations) {
    reservedByLineId.set(
      range.lineId,
      Math.max(reservedByLineId.get(range.lineId) ?? 0, range.startUnitIndex + range.quantity),
    );
  }
  const benefitRanges = canonicalRanges(
    input.benefitLines,
    preorderByLineId,
    reservedByLineId,
  ).sort(compareBenefitRange);
  const benefitSelections = takeUnits(benefitRanges, uses * BigInt(input.benefitQuantity));

  return { uses, qualifierReservations, benefitSelections };
}

export function canonicalRanges(
  lines: readonly Pricing.PricingCheckoutQuotedLine[],
  preorderByLineId: ReadonlyMap<string, number>,
  excludedPrefixByLineId: ReadonlyMap<string, number> = new Map(),
): CanonicalUnitRange[] {
  return lines
    .map((line) => {
      const startUnitIndex = Math.min(line.quantity, excludedPrefixByLineId.get(line.lineId) ?? 0);
      return {
        lineId: line.lineId,
        linePreorderIndex: preorderByLineId.get(line.lineId) ?? Number.MAX_SAFE_INTEGER,
        startUnitIndex,
        quantity: line.quantity - startUnitIndex,
        unitPrice: BigInt(line.unitPrice.amountMinor),
      };
    })
    .filter((range) => range.quantity > 0)
    .sort(
      (left, right) =>
        left.linePreorderIndex - right.linePreorderIndex ||
        left.startUnitIndex - right.startUnitIndex,
    );
}

function countPossibleUses(
  qualifierRanges: readonly CanonicalUnitRange[],
  requirement: BuyXGetYRequirement,
): bigint {
  if (requirement.type === "QUANTITY") {
    return (
      qualifierRanges.reduce((sum, range) => sum + BigInt(range.quantity), 0n) /
      BigInt(requirement.requiredQuantity)
    );
  }

  let uses = 0n;
  let currentUseSubtotal = 0n;
  for (const range of qualifierRanges) {
    if (range.unitPrice === 0n) continue;
    let available = BigInt(range.quantity);
    if (currentUseSubtotal > 0n) {
      const needed = ceilDivide(requirement.requiredSubtotal - currentUseSubtotal, range.unitPrice);
      if (available < needed) {
        currentUseSubtotal += available * range.unitPrice;
        continue;
      }
      available -= needed;
      uses += 1n;
      currentUseSubtotal = 0n;
    }

    const unitsPerUse = ceilDivide(requirement.requiredSubtotal, range.unitPrice);
    uses += available / unitsPerUse;
    currentUseSubtotal = (available % unitsPerUse) * range.unitPrice;
  }
  return uses;
}

function reserveQualifierRanges(
  ranges: readonly CanonicalUnitRange[],
  requirement: BuyXGetYRequirement,
  uses: bigint,
): CanonicalUnitRange[] {
  if (requirement.type === "QUANTITY") {
    return takeUnits(ranges, uses * BigInt(requirement.requiredQuantity));
  }

  let remainingUses = uses;
  let currentUseSubtotal = 0n;
  const result: CanonicalUnitRange[] = [];
  for (const range of ranges) {
    if (remainingUses === 0n) break;
    if (range.unitPrice === 0n) {
      appendRange(result, range, range.quantity);
      continue;
    }

    let available = BigInt(range.quantity);
    let consumed = 0n;
    if (currentUseSubtotal > 0n) {
      const needed = ceilDivide(requirement.requiredSubtotal - currentUseSubtotal, range.unitPrice);
      const taken = min(available, needed);
      available -= taken;
      consumed += taken;
      currentUseSubtotal += taken * range.unitPrice;
      if (currentUseSubtotal >= requirement.requiredSubtotal) {
        remainingUses -= 1n;
        currentUseSubtotal = 0n;
      }
    }

    if (remainingUses > 0n && available > 0n) {
      const unitsPerUse = ceilDivide(requirement.requiredSubtotal, range.unitPrice);
      const completeUses = min(remainingUses, available / unitsPerUse);
      const completeUnits = completeUses * unitsPerUse;
      available -= completeUnits;
      consumed += completeUnits;
      remainingUses -= completeUses;

      if (remainingUses > 0n && available > 0n) {
        consumed += available;
        currentUseSubtotal = available * range.unitPrice;
      }
    }
    appendRange(result, range, Number(consumed));
  }
  if (remainingUses !== 0n) {
    throw new RangeError("Buy X Get Y qualifier subtotal cannot be reserved");
  }
  return result;
}

function appendRange(
  result: CanonicalUnitRange[],
  source: CanonicalUnitRange,
  quantity: number,
): void {
  if (quantity === 0) return;
  const previous = result.at(-1);
  if (
    previous?.lineId === source.lineId &&
    previous.startUnitIndex + previous.quantity === source.startUnitIndex
  ) {
    previous.quantity += quantity;
    return;
  }
  result.push({ ...source, quantity });
}

function takeUnits(
  ranges: readonly CanonicalUnitRange[],
  requestedQuantity: bigint,
): CanonicalUnitRange[] {
  let remaining = requestedQuantity;
  const result: CanonicalUnitRange[] = [];
  for (const range of ranges) {
    if (remaining === 0n) break;
    const quantity = Number(min(remaining, BigInt(range.quantity)));
    if (quantity === 0) continue;
    result.push({ ...range, quantity });
    remaining -= BigInt(quantity);
  }
  return result;
}

function compareBenefitRange(left: CanonicalUnitRange, right: CanonicalUnitRange): number {
  if (left.unitPrice < right.unitPrice) return -1;
  if (left.unitPrice > right.unitPrice) return 1;
  return (
    left.linePreorderIndex - right.linePreorderIndex || left.startUnitIndex - right.startUnitIndex
  );
}

function ceilDivide(value: bigint, divisor: bigint): bigint {
  return (value + divisor - 1n) / divisor;
}

function min(left: bigint, right: bigint): bigint {
  return left < right ? left : right;
}
