import type { Pricing } from "@shopana/broker-types";
import { validateFinalDelivery } from "../finalDeliveryValidation.js";

describe("final delivery validation", () => {
  it("returns the subtotal of selected merchant-collected options", () => {
    expect(
      validateFinalDelivery(
        preliminary(["line-a", "line-b"]),
        delivery([
          group("group-a", ["line-a"], 40n),
          group("group-b", ["line-b"], 60n),
        ]),
        "USD",
      ),
    ).toBe(100n);
  });

  it("rejects duplicate group IDs", () => {
    expect(() =>
      validateFinalDelivery(
        preliminary(["line-a", "line-b"]),
        delivery([
          group("duplicate", ["line-a"], 40n),
          group("duplicate", ["line-b"], 60n),
        ]),
        "USD",
      ),
    ).toThrow("Duplicate delivery group ID");
  });

  it("rejects missing, unknown, or duplicated physical line assignments", () => {
    expect(() =>
      validateFinalDelivery(
        preliminary(["line-a", "line-b"]),
        delivery([group("group-a", ["line-a", "line-c"], 40n)]),
        "USD",
      ),
    ).toThrow("do not exactly cover preliminary physical lines");

    expect(() =>
      validateFinalDelivery(
        preliminary(["line-a", "line-b"]),
        delivery([
          group("group-a", ["line-a"], 40n),
          group("group-b", ["line-a", "line-b"], 60n),
        ]),
        "USD",
      ),
    ).toThrow("Duplicate delivery group line assignment");
  });
});

function preliminary(
  transformedLineIds: readonly string[],
): Pricing.CalculateCheckoutPreliminaryQuoteResult {
  return {
    deliveryIntent: {
      destinations: [{ transformedLineIds }],
    },
  } as Pricing.CalculateCheckoutPreliminaryQuoteResult;
}

function delivery(
  groups: readonly Pricing.PricingCheckoutDeliverySnapshot["groups"][number][],
): Pricing.PricingCheckoutDeliverySnapshot {
  return { groups } as Pricing.PricingCheckoutDeliverySnapshot;
}

function group(
  groupId: string,
  lineIds: readonly string[],
  cost: bigint,
): Pricing.PricingCheckoutDeliverySnapshot["groups"][number] {
  return {
    groupId,
    lineIds,
    options: [{
      handle: "selected",
      code: "standard",
      carrierCode: null,
      deliveryMethodType: "SHIPPING",
      cost: { amountMinor: cost.toString(), currencyCode: "USD" },
    }],
    selectedOptionHandle: "selected",
  };
}
