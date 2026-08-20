import type { Pricing } from "@shopana/broker-types";
import type {
  CommerceFunctionBindingRef,
  CommerceFunctionRunResult,
} from "@shopana/function-runner";
import type { PricingDeliveryDiscountCandidate } from "../../discount-function-contracts.js";
import { contentRevision } from "../../canonicalJson.js";
import type { DiscountEvaluationSnapshot } from "../../infrastructure/DiscountEvaluationRepository.js";
import { money } from "../componentPricing.js";
import type { DiscountOwner } from "./NativeDiscountEngine.js";

type Code = DiscountEvaluationSnapshot["codes"][number];

export interface ShippingDiscountCandidate {
  candidateId: string;
  owner: DiscountOwner;
  code: Code | null;
  inputIndex: number | null;
  inputCode: string | null;
  title: string;
  groupIds: readonly string[];
  value: PricingDeliveryDiscountCandidate["value"];
  maximumShippingPrice: Pricing.PricingCheckoutMoney | null;
  source:
    | { kind: "NATIVE" }
    | {
        kind: "FUNCTION";
        binding: CommerceFunctionBindingRef;
        implementationId: string;
        trace: CommerceFunctionRunResult<unknown>["trace"];
      };
}

export function applyShippingDiscountCandidates(input: {
  context: Pricing.PricingCheckoutEvaluationContext;
  preliminary: Pricing.CalculateCheckoutPreliminaryQuoteResult;
  delivery: Pricing.PricingCheckoutDeliverySnapshot;
  snapshot: DiscountEvaluationSnapshot;
  candidates: readonly ShippingDiscountCandidate[];
  codeResolutions: readonly Pricing.PricingCheckoutDiscountCodeResolution[];
}) {
  const originalCosts = selectedCosts(input.delivery);
  const remaining = new Map(originalCosts);
  const applications: Pricing.PricingCheckoutDiscountApplication[] = [];
  const requirements: Pricing.PricingCheckoutDiscountUsageRequirement[] = [];
  const codes = [...input.codeResolutions];
  const acceptedOwners = new Set<string>();

  for (const candidate of [...input.candidates].sort(compareCandidates)) {
    if (acceptedOwners.has(candidate.owner.id)) continue;
    if (
      !compatible(
        candidate.owner,
        [...input.preliminary.appliedDiscounts, ...applications],
        input.snapshot,
      )
    ) {
      rejectCandidate(codes, candidate, "COMBINATION_EXCLUDED");
      continue;
    }

    const requestedGroups = new Set(candidate.groupIds);
    const eligibleGroupIds = input.delivery.groups
      .filter(
        (group) =>
          requestedGroups.has(group.groupId) &&
          originalCosts.has(group.groupId) &&
          (candidate.maximumShippingPrice === null ||
            originalCosts.get(group.groupId)! <=
              BigInt(candidate.maximumShippingPrice.amountMinor)),
      )
      .map((group) => group.groupId);
    const allocations = allocateCandidate(candidate, eligibleGroupIds, remaining);
    const amount = allocations.reduce((sum, row) => sum + row.amount, 0n);
    if (amount === 0n) {
      rejectCandidate(codes, candidate, "TARGET_NOT_ELIGIBLE");
      continue;
    }

    const application = applicationOf(candidate, allocations, amount, input.context.currencyCode);
    applications.push(application);
    requirements.push(requirementOf(application, candidate, input.snapshot, input.context));
    acceptedOwners.add(candidate.owner.id);
    for (const allocation of allocations) {
      remaining.set(allocation.groupId, remaining.get(allocation.groupId)! - allocation.amount);
    }
    markApplied(codes, candidate, application.applicationId);
  }

  for (let index = 0; index < codes.length; index++) {
    const resolution = codes[index]!;
    if (resolution.status === "PENDING") {
      codes[index] = {
        inputCode: resolution.inputCode,
        normalizedCode: resolution.normalizedCode,
        status: "REJECTED",
        discountId: resolution.discountId,
        codeId: resolution.codeId,
        reason: "TARGET_NOT_ELIGIBLE",
        message: "target not eligible",
        retryable: false,
      };
    }
  }

  return { applications, codes, requirements };
}

function selectedCosts(delivery: Pricing.PricingCheckoutDeliverySnapshot) {
  const result = new Map<string, bigint>();
  for (const group of delivery.groups) {
    const selected = group.options.find((option) => option.handle === group.selectedOptionHandle);
    if (selected) result.set(group.groupId, BigInt(selected.cost.amountMinor));
  }
  return result;
}

function allocateCandidate(
  candidate: ShippingDiscountCandidate,
  groupIds: readonly string[],
  remaining: ReadonlyMap<string, bigint>,
) {
  const values = groupIds
    .map((groupId) => ({ groupId, capacity: remaining.get(groupId) ?? 0n }))
    .filter((row) => row.capacity > 0n);
  const total = values.reduce((sum, row) => sum + row.capacity, 0n);
  if (total === 0n) return [];
  const desired =
    candidate.value.type === "FREE"
      ? total
      : candidate.value.type === "PERCENTAGE"
        ? (total * BigInt(candidate.value.percentageBps)) / 10_000n
        : min(BigInt(candidate.value.amount.amountMinor), total);
  return allocateProportionally(desired, values);
}

function allocateProportionally(
  requested: bigint,
  values: readonly { groupId: string; capacity: bigint }[],
) {
  const total = values.reduce((sum, row) => sum + row.capacity, 0n);
  const amount = min(requested, total);
  if (amount === 0n || total === 0n) return [];
  const shares = values.map((row) => min(row.capacity, (amount * row.capacity) / total));
  let remainder = amount - shares.reduce((sum, share) => sum + share, 0n);
  for (let index = values.length - 1; index >= 0 && remainder > 0n; index--) {
    const capacity = values[index]!.capacity - shares[index]!;
    const extra = min(remainder, capacity);
    shares[index] = shares[index]! + extra;
    remainder -= extra;
  }
  return values.flatMap((row, index) =>
    shares[index]! > 0n ? [{ groupId: row.groupId, amount: shares[index]! }] : [],
  );
}

function applicationOf(
  candidate: ShippingDiscountCandidate,
  allocations: readonly { groupId: string; amount: bigint }[],
  amount: bigint,
  currencyCode: string,
): Pricing.PricingCheckoutDiscountApplication {
  const source =
    candidate.source.kind === "NATIVE"
      ? { kind: "NATIVE" as const }
      : {
          kind: "FUNCTION" as const,
          functionBindingId: candidate.source.binding.functionBindingId,
          implementationId: candidate.source.implementationId,
          functionTarget: candidate.source.trace.target,
          executionId: candidate.source.trace.executionId,
          planRevision: candidate.source.trace.planRevision,
        };
  const mapped = allocations.map((row) => ({
    targetType: "DELIVERY_GROUP" as const,
    groupId: row.groupId,
    amount: money(row.amount, currencyCode),
  }));
  return {
    applicationId: contentRevision("pricing-discount-application", {
      discountId: candidate.owner.id,
      candidateId: candidate.candidateId,
      allocations: mapped,
      source,
    }),
    discountId: candidate.owner.id,
    configurationRevision: String(candidate.owner.revision),
    discountClass: "SHIPPING",
    method: candidate.owner.method,
    code:
      candidate.code && candidate.inputIndex !== null
        ? {
            codeId: candidate.code.id,
            inputCode: candidate.inputCode!,
            normalizedCode: candidate.code.normalizedCode!,
          }
        : null,
    source,
    title: candidate.title,
    priority: candidate.owner.priority,
    amount: money(amount, currencyCode),
    allocations: mapped,
    metadata:
      candidate.source.kind === "FUNCTION"
        ? { candidateId: candidate.candidateId }
        : asObject(candidate.owner.metadata),
  };
}

function requirementOf(
  application: Pricing.PricingCheckoutDiscountApplication,
  candidate: ShippingDiscountCandidate,
  snapshot: DiscountEvaluationSnapshot,
  context: Pricing.PricingCheckoutEvaluationContext,
): Pricing.PricingCheckoutDiscountUsageRequirement {
  const counter = snapshot.counters.find((row) => row.discountId === candidate.owner.id);
  const codeCounter =
    candidate.code && snapshot.codeCounters.find((row) => row.codeId === candidate.code!.id);
  return {
    applicationId: application.applicationId,
    discountId: candidate.owner.id,
    codeId: candidate.code?.id ?? null,
    customerId: context.buyerEligibility?.customerId ?? null,
    configurationRevision: String(candidate.owner.revision),
    usageCounterRevision: contentRevision("pricing-discount-usage", {
      aggregate: String(counter?.version ?? 0n),
      code: String(codeCounter?.version ?? 0n),
    }),
    reservationRequired:
      candidate.owner.usageLimit !== null ||
      candidate.code?.usageLimit != null ||
      candidate.owner.appliesOncePerCustomer,
  };
}

function compatible(
  owner: DiscountOwner,
  accepted: readonly Pricing.PricingCheckoutDiscountApplication[],
  snapshot: DiscountEvaluationSnapshot,
): boolean {
  return accepted.every(
    (application) =>
      snapshot.combinations.some(
        (row) => row.discountId === owner.id && row.combinesWithClass === application.discountClass,
      ) &&
      snapshot.combinations.some(
        (row) =>
          row.discountId === application.discountId &&
          row.combinesWithClass === owner.discountClass,
      ),
  );
}

function compareCandidates(
  left: ShippingDiscountCandidate,
  right: ShippingDiscountCandidate,
): number {
  return (
    right.owner.priority - left.owner.priority ||
    left.owner.id.localeCompare(right.owner.id) ||
    left.candidateId.localeCompare(right.candidateId) ||
    sourceKey(left).localeCompare(sourceKey(right))
  );
}

function sourceKey(candidate: ShippingDiscountCandidate): string {
  return candidate.source.kind === "NATIVE"
    ? "NATIVE"
    : `${candidate.source.binding.functionBindingId}:${candidate.source.implementationId}`;
}

function markApplied(
  results: Pricing.PricingCheckoutDiscountCodeResolution[],
  candidate: ShippingDiscountCandidate,
  applicationId: string,
): void {
  if (candidate.inputIndex === null || !candidate.code) return;
  results[candidate.inputIndex] = {
    inputCode: candidate.inputCode!,
    normalizedCode: candidate.code.normalizedCode!,
    status: "APPLIED",
    discountId: candidate.owner.id,
    codeId: candidate.code.id,
    applicationIds: [applicationId],
  };
}

function rejectCandidate(
  results: Pricing.PricingCheckoutDiscountCodeResolution[],
  candidate: ShippingDiscountCandidate,
  reason: "COMBINATION_EXCLUDED" | "TARGET_NOT_ELIGIBLE",
): void {
  if (candidate.inputIndex === null || !candidate.code) return;
  if (results[candidate.inputIndex]?.status === "APPLIED") return;
  results[candidate.inputIndex] = {
    inputCode: candidate.inputCode!,
    normalizedCode: candidate.code.normalizedCode!,
    status: "REJECTED",
    discountId: candidate.owner.id,
    codeId: candidate.code.id,
    reason,
    message: reason.replaceAll("_", " ").toLowerCase(),
    retryable: false,
  };
}

function asObject(value: unknown): Pricing.PricingCheckoutJsonObject | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Pricing.PricingCheckoutJsonObject)
    : null;
}

function min(left: bigint, right: bigint): bigint {
  return left < right ? left : right;
}
