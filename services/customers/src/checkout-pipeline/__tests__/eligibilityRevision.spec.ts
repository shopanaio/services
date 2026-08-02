import { createEligibilityRevision } from "../eligibilityRevision.js";

const first = {
  membershipId: "membership-1",
  segmentId: "segment-2",
  source: "MANUAL" as const,
  evaluatedAt: "2026-08-01T10:00:00.000Z",
  expiresAt: null,
  definitionRevision: null,
};
const second = {
  membershipId: "membership-2",
  segmentId: "segment-1",
  source: "RULE" as const,
  evaluatedAt: "2026-08-01T11:00:00.000Z",
  expiresAt: "2026-08-03T11:00:00.000Z",
  definitionRevision: 4,
};

describe("customer checkout eligibility revision", () => {
  it("is stable for empty memberships and independent of row order", () => {
    const empty = createEligibilityRevision({
      customerId: "customer-1",
      memberships: [],
    });
    expect(empty).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(
      createEligibilityRevision({
        customerId: "customer-1",
        memberships: [first, second],
      })
    ).toBe(
      createEligibilityRevision({
        customerId: "customer-1",
        memberships: [second, first],
      })
    );
  });

  it("changes when an eligibility fact changes", () => {
    const baseline = createEligibilityRevision({
      customerId: "customer-1",
      memberships: [second],
    });
    expect(
      createEligibilityRevision({
        customerId: "customer-1",
        memberships: [{ ...second, definitionRevision: 5 }],
      })
    ).not.toBe(baseline);
    expect(
      createEligibilityRevision({
        customerId: "customer-1",
        memberships: [{ ...second, expiresAt: null }],
      })
    ).not.toBe(baseline);
  });
});
