import type { Pricing } from "@shopana/broker-types";
import type {
  CommerceFunctionBindingRef,
  CommerceFunctionRunResult,
} from "@shopana/function-runner";
import type { PricingLineDiscountCandidate } from "../../discount-function-contracts.js";
import { contentRevision } from "../../canonicalJson.js";
import type { DiscountEvaluationSnapshot } from "../../infrastructure/DiscountEvaluationRepository.js";
import { money } from "../componentPricing.js";
import {
  allocateNativeLineCandidate,
  type DiscountOwner,
} from "./NativeDiscountEngine.js";

type Code = DiscountEvaluationSnapshot["codes"][number];

export interface LineDiscountCandidate {
  candidateId: string;
  owner: DiscountOwner;
  code: Code | null;
  inputIndex: number | null;
  inputCode: string | null;
  title: string;
  source:
    | { kind: "NATIVE" }
    | {
        kind: "FUNCTION";
        candidate: PricingLineDiscountCandidate;
        binding: CommerceFunctionBindingRef;
        implementationId: string;
        trace: CommerceFunctionRunResult<unknown>["trace"];
      };
}

export function applyLineDiscountCandidates(input: {
  context: Pricing.PricingCheckoutEvaluationContext;
  roots: readonly Pricing.PricingCheckoutQuotedLine[];
  snapshot: DiscountEvaluationSnapshot;
  candidates: readonly LineDiscountCandidate[];
  codeResolutions: readonly Pricing.PricingCheckoutDiscountCodeResolution[];
}) {
  const flat = flatten(input.roots);
  const remaining = new Map(
    flat.map((line) => [line.lineId, BigInt(line.subtotal.amountMinor)]),
  );
  const applications: Pricing.PricingCheckoutDiscountApplication[] = [];
  const requirements: Pricing.PricingCheckoutDiscountUsageRequirement[] = [];
  const codes = [...input.codeResolutions];
  const acceptedOwners = new Set<string>();

  for (const candidate of [...input.candidates].sort(compareCandidates)) {
    if (acceptedOwners.has(candidate.owner.id)) continue;
    if (!compatible(candidate.owner, applications, input.snapshot)) {
      rejectCandidate(codes, candidate, "COMBINATION_EXCLUDED");
      continue;
    }
    const allocations = candidate.source.kind === "NATIVE"
      ? allocateNativeLineCandidate(
          candidate.owner,
          flat,
          remaining,
          input.snapshot,
        )
      : allocateFunctionCandidate(candidate.source.candidate, flat, remaining);
    const amount = allocations.reduce((sum, row) => sum + row.amount, 0n);
    if (amount === 0n) {
      rejectCandidate(codes, candidate, "TARGET_NOT_ELIGIBLE");
      continue;
    }

    const application = applicationOf(
      candidate,
      allocations,
      amount,
      input.context.currencyCode,
    );
    applications.push(application);
    requirements.push(
      requirementOf(application, candidate, input.snapshot, input.context),
    );
    acceptedOwners.add(candidate.owner.id);
    for (const allocation of allocations) {
      remaining.set(
        allocation.lineId,
        remaining.get(allocation.lineId)! - allocation.amount,
      );
    }
    markApplied(codes, candidate, application.applicationId);
  }

  const orderedApplications = [...applications].sort(compareApplications);
  const applicationOrder = new Map(
    orderedApplications.map((application, index) => [application.applicationId, index]),
  );
  requirements.sort(
    (left, right) =>
      applicationOrder.get(left.applicationId)! -
      applicationOrder.get(right.applicationId)!,
  );
  return {
    lines: rebuild(input.roots, orderedApplications, input.context.currencyCode),
    applications: orderedApplications,
    codeResolutions: codes,
    requirements,
  };
}

function allocateFunctionCandidate(
  candidate: PricingLineDiscountCandidate,
  lines: readonly Pricing.PricingCheckoutQuotedLine[],
  remaining: ReadonlyMap<string, bigint>,
) {
  const targets = candidate.targets.type === "ORDER"
    ? lines.filter((line) => line.contributesToTotals)
    : candidate.targets.lineIds.map(
        (lineId) => lines.find((line) => line.lineId === lineId)!,
      );
  const values = targets
    .map((line) => ({
      lineId: line.lineId,
      capacity: remaining.get(line.lineId) ?? 0n,
      quantity: line.quantity,
    }))
    .filter((row) => row.capacity > 0n);
  const total = values.reduce((sum, row) => sum + row.capacity, 0n);
  if (total === 0n) return [];

  if (candidate.allocationMethod === "EACH") {
    const allocations = values.map((row) => ({
      lineId: row.lineId,
      amount: min(
        row.capacity,
        candidate.value.type === "PERCENTAGE"
          ? row.capacity * BigInt(candidate.value.percentageBps) / 10_000n
          : BigInt(candidate.value.amount.amountMinor) * BigInt(row.quantity),
      ),
      quantity: null,
    }));
    const uncappedAmount = allocations.reduce(
      (sum, allocation) => sum + allocation.amount,
      0n,
    );
    const cappedAmount = candidate.maximumDiscount === null
      ? uncappedAmount
      : min(
          uncappedAmount,
          BigInt(candidate.maximumDiscount.amountMinor),
        );
    if (cappedAmount === uncappedAmount) {
      return allocations.filter((allocation) => allocation.amount > 0n);
    }
    return allocateProportionally(
      cappedAmount,
      allocations.map((allocation) => ({
        lineId: allocation.lineId,
        capacity: allocation.amount,
      })),
    );
  }

  let desired = candidate.value.type === "PERCENTAGE"
    ? total * BigInt(candidate.value.percentageBps) / 10_000n
    : BigInt(candidate.value.amount.amountMinor);
  if (candidate.maximumDiscount !== null) {
    desired = min(desired, BigInt(candidate.maximumDiscount.amountMinor));
  }
  return allocateProportionally(desired, values);
}

function allocateProportionally(
  requested: bigint,
  values: readonly { lineId: string; capacity: bigint }[],
) {
  const total = values.reduce((sum, row) => sum + row.capacity, 0n);
  const amount = min(requested, total);
  if (amount === 0n || total === 0n) return [];
  const shares = values.map((row) =>
    min(row.capacity, amount * row.capacity / total),
  );
  let remainder = amount - shares.reduce((sum, share) => sum + share, 0n);
  for (let index = values.length - 1; index >= 0 && remainder > 0n; index--) {
    const capacity = values[index]!.capacity - shares[index]!;
    const extra = min(remainder, capacity);
    shares[index] = shares[index]! + extra;
    remainder -= extra;
  }
  return values.flatMap((row, index) =>
    shares[index]! > 0n
      ? [{ lineId: row.lineId, amount: shares[index]!, quantity: null }]
      : [],
  );
}

function applicationOf(
  candidate: LineDiscountCandidate,
  allocations: readonly { lineId: string; amount: bigint; quantity: number | null }[],
  amount: bigint,
  currencyCode: string,
): Pricing.PricingCheckoutDiscountApplication {
  const source = candidate.source.kind === "NATIVE"
    ? { kind: "NATIVE" as const }
    : {
        kind: "FUNCTION" as const,
        functionBindingId: candidate.source.binding.functionBindingId,
        implementationId: candidate.source.implementationId,
        functionTarget: candidate.source.trace.target,
        executionId: candidate.source.trace.executionId,
        planRevision: candidate.source.trace.planRevision,
      };
  const mapped = allocations.map((allocation) => ({
    targetType: "LINE" as const,
    lineId: allocation.lineId,
    quantity: allocation.quantity,
    amount: money(allocation.amount, currencyCode),
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
    discountClass: candidate.owner.discountClass,
    method: candidate.owner.method,
    code: candidate.code && candidate.inputIndex !== null
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
    metadata: candidate.source.kind === "FUNCTION"
      ? { candidateId: candidate.candidateId }
      : asObject(candidate.owner.metadata),
  };
}

function requirementOf(
  application: Pricing.PricingCheckoutDiscountApplication,
  candidate: LineDiscountCandidate,
  snapshot: DiscountEvaluationSnapshot,
  context: Pricing.PricingCheckoutEvaluationContext,
): Pricing.PricingCheckoutDiscountUsageRequirement {
  const counter = snapshot.counters.find(
    (row) => row.discountId === candidate.owner.id,
  );
  const codeCounter = candidate.code && snapshot.codeCounters.find(
    (row) => row.codeId === candidate.code!.id,
  );
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

function rebuild(
  lines: readonly Pricing.PricingCheckoutQuotedLine[],
  applications: readonly Pricing.PricingCheckoutDiscountApplication[],
  currencyCode: string,
): Pricing.PricingCheckoutQuotedLine[] {
  return lines.map((line) => {
    const allocations = applications.flatMap((application) =>
      application.allocations
        .filter(
          (row): row is Extract<
            Pricing.PricingCheckoutDiscountAllocation,
            { targetType: "LINE" }
          > => row.targetType === "LINE" && row.lineId === line.lineId,
        )
        .map((row) => ({
          applicationId: application.applicationId,
          amount: row.amount,
          quantity: row.quantity,
        })),
    );
    const discount = allocations.reduce(
      (sum, row) => sum + BigInt(row.amount.amountMinor),
      0n,
    );
    return {
      ...line,
      total: money(BigInt(line.subtotal.amountMinor) - discount, currencyCode),
      discountAllocations: allocations,
      children: rebuild(line.children, applications, currencyCode),
    };
  });
}

function compatible(
  owner: DiscountOwner,
  accepted: readonly Pricing.PricingCheckoutDiscountApplication[],
  snapshot: DiscountEvaluationSnapshot,
): boolean {
  return accepted.every(
    (application) =>
      snapshot.combinations.some(
        (row) =>
          row.discountId === owner.id &&
          row.combinesWithClass === application.discountClass,
      ) &&
      snapshot.combinations.some(
        (row) =>
          row.discountId === application.discountId &&
          row.combinesWithClass === owner.discountClass,
      ),
  );
}

function compareCandidates(
  left: LineDiscountCandidate,
  right: LineDiscountCandidate,
): number {
  return (
    classRank(left.owner.discountClass) - classRank(right.owner.discountClass) ||
    right.owner.priority - left.owner.priority ||
    left.owner.id.localeCompare(right.owner.id) ||
    left.candidateId.localeCompare(right.candidateId) ||
    sourceKey(left).localeCompare(sourceKey(right))
  );
}

function compareApplications(
  left: Pricing.PricingCheckoutDiscountApplication,
  right: Pricing.PricingCheckoutDiscountApplication,
): number {
  return (
    right.priority - left.priority ||
    left.discountId.localeCompare(right.discountId) ||
    left.applicationId.localeCompare(right.applicationId)
  );
}

function classRank(value: Pricing.PricingCheckoutDiscountClass): number {
  return value === "PRODUCT" ? 0 : value === "ORDER" ? 1 : 2;
}

function sourceKey(candidate: LineDiscountCandidate): string {
  return candidate.source.kind === "NATIVE"
    ? "NATIVE"
    : `${candidate.source.binding.functionBindingId}:${candidate.source.implementationId}`;
}

function markApplied(
  results: Pricing.PricingCheckoutDiscountCodeResolution[],
  candidate: LineDiscountCandidate,
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
  candidate: LineDiscountCandidate,
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

function flatten(
  lines: readonly Pricing.PricingCheckoutQuotedLine[],
): Pricing.PricingCheckoutQuotedLine[] {
  return lines.flatMap((line) => [line, ...flatten(line.children)]);
}

function asObject(value: unknown): Pricing.PricingCheckoutJsonObject | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Pricing.PricingCheckoutJsonObject
    : null;
}

function min(left: bigint, right: bigint): bigint {
  return left < right ? left : right;
}
