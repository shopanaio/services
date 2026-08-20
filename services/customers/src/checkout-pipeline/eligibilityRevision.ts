import { createHash } from "node:crypto";
import type { CustomerCheckoutEligibilityReadModel } from "../repositories/checkout/CustomerCheckoutEligibilityRepository.js";

type EligibilityMembership = CustomerCheckoutEligibilityReadModel["memberships"][number];

export function createEligibilityRevision(input: {
  customerId: string;
  memberships: readonly EligibilityMembership[];
}): string {
  const memberships = [...input.memberships].sort(compareMemberships).map((membership) => ({
    membershipId: membership.membershipId,
    segmentId: membership.segmentId,
    source: membership.source,
    evaluatedAt: membership.evaluatedAt,
    expiresAt: membership.expiresAt ?? null,
    definitionRevision: membership.definitionRevision ?? null,
  }));
  const canonical = JSON.stringify({
    version: 1,
    customerId: input.customerId,
    memberships,
  });
  return `sha256:${createHash("sha256").update(canonical, "utf8").digest("hex")}`;
}

export function compareEligibilityMemberships(
  left: EligibilityMembership,
  right: EligibilityMembership,
): number {
  return compareMemberships(left, right);
}

function compareMemberships(left: EligibilityMembership, right: EligibilityMembership): number {
  return (
    compareStrings(left.segmentId, right.segmentId) ||
    compareStrings(left.membershipId, right.membershipId)
  );
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
