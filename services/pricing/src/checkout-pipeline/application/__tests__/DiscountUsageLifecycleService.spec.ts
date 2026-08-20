import type { Pricing } from "@shopana/broker-types";
import { groupUsageRequirements } from "../DiscountUsageLifecycleService.js";

describe("discount usage grouping", () => {
  it("counts multiple applications of one discount as one usage group", () => {
    const groups = groupUsageRequirements([
      requirement("application-b", true),
      requirement("application-a", true),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toEqual(
      expect.objectContaining({
        discountId: "discount-1",
        reservationRequired: true,
        applicationIds: ["application-a", "application-b"],
      }),
    );
  });

  it("keeps unlimited usage as a commit-only group", () => {
    const groups = groupUsageRequirements([requirement("application-a", false)]);

    expect(groups).toEqual([
      expect.objectContaining({
        discountId: "discount-1",
        reservationRequired: false,
      }),
    ]);
  });

  it("rejects duplicate application identities", () => {
    expect(() =>
      groupUsageRequirements([
        requirement("application-a", true),
        requirement("application-a", true),
      ]),
    ).toThrow("duplicate applications");
  });

  it("rejects multiple usage identities for one discount", () => {
    expect(() =>
      groupUsageRequirements([
        requirement("application-a", true),
        { ...requirement("application-b", true), codeId: "code-2" },
      ]),
    ).toThrow("multiple usage identities");
  });
});

function requirement(
  applicationId: string,
  reservationRequired: boolean,
): Pricing.PricingCheckoutDiscountUsageRequirement {
  return {
    applicationId,
    discountId: "discount-1",
    codeId: null,
    customerId: "customer-1",
    configurationRevision: "3",
    usageCounterRevision: "counter-4",
    reservationRequired,
  };
}
