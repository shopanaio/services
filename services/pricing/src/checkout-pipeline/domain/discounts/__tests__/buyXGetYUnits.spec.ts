import type { Pricing } from "@shopana/broker-types";
import { canonicalRanges, planBuyXGetYUnits } from "../buyXGetYUnits.js";

describe("Buy X Get Y canonical unit planning", () => {
  it("breaks equal-price benefit ties by line preorder, not lexical lineId", () => {
    const qualifier = line("qualifier", 1, 100n);
    const preorderFirst = line("z-line", 1, 10n);
    const preorderSecond = line("a-line", 1, 10n);

    const plan = planBuyXGetYUnits({
      allLinesInPreorder: [qualifier, preorderFirst, preorderSecond],
      qualifierLines: [qualifier],
      benefitLines: [preorderFirst, preorderSecond],
      requirement: { type: "QUANTITY", requiredQuantity: 1 },
      benefitQuantity: 1,
      usesPerOrderLimit: null,
    });

    expect(plan.benefitSelections).toEqual([
      expect.objectContaining({
        lineId: "z-line",
        linePreorderIndex: 1,
        startUnitIndex: 0,
        quantity: 1,
      }),
    ]);
  });

  it("excludes qualifier units from an overlapping benefit selection", () => {
    const overlapping = line("same-line", 3, 10n);

    const plan = planBuyXGetYUnits({
      allLinesInPreorder: [overlapping],
      qualifierLines: [overlapping],
      benefitLines: [overlapping],
      requirement: { type: "QUANTITY", requiredQuantity: 1 },
      benefitQuantity: 1,
      usesPerOrderLimit: 1,
    });

    expect(plan.qualifierReservations).toEqual([
      expect.objectContaining({ startUnitIndex: 0, quantity: 1 }),
    ]);
    expect(plan.benefitSelections).toEqual([
      expect.objectContaining({ startUnitIndex: 1, quantity: 1 }),
    ]);
  });

  it("consumes whole qualifier units separately for every subtotal use", () => {
    const overlapping = line("same-line", 3, 9n);

    const plan = planBuyXGetYUnits({
      allLinesInPreorder: [overlapping],
      qualifierLines: [overlapping],
      benefitLines: [overlapping],
      requirement: { type: "SUBTOTAL", requiredSubtotal: 10n },
      benefitQuantity: 1,
      usesPerOrderLimit: null,
    });

    expect(plan.uses).toBe(1n);
    expect(plan.qualifierReservations).toEqual([
      expect.objectContaining({ startUnitIndex: 0, quantity: 2 }),
    ]);
    expect(plan.benefitSelections).toEqual([
      expect.objectContaining({ startUnitIndex: 2, quantity: 1 }),
    ]);
  });

  it("keeps large quantities as ranges instead of materializing units", () => {
    const quantity = Number.MAX_SAFE_INTEGER;
    const largeLine = line("large-line", quantity, 1n);

    expect(canonicalRanges([largeLine], new Map([[largeLine.lineId, 0]]))).toEqual([
      {
        lineId: "large-line",
        linePreorderIndex: 0,
        startUnitIndex: 0,
        quantity,
        unitPrice: 1n,
      },
    ]);
  });
});

function line(
  lineId: string,
  quantity: number,
  unitPrice: bigint,
): Pricing.PricingCheckoutQuotedLine {
  return {
    lineId,
    quantity,
    unitPrice: { amountMinor: unitPrice.toString(), currencyCode: "USD" },
  } as Pricing.PricingCheckoutQuotedLine;
}
