import type { Pricing } from "@shopana/broker-types";
import type { DiscountEvaluationSnapshot } from "../../../infrastructure/DiscountEvaluationRepository.js";
import {
  allocateNativeLineCandidate,
  allocateProportionally,
  canonicalCounterVersions,
  type DiscountOwner,
} from "../NativeDiscountEngine.js";

describe("native checkout discount evaluation", () => {
  it("applies amount-off-products only to BENEFIT targets", () => {
    const first = line("first", "product-a", 100n);
    const second = line("second", "product-b", 200n);
    const allocations = allocateNativeLineCandidate(
      owner("amount-off-products", "AMOUNT_OFF_PRODUCTS"),
      [first, second],
      new Map([
        [first.lineId, 100n],
        [second.lineId, 200n],
      ]),
      snapshot({
        amountOff: [{
          discountId: "amount-off-products",
          allocationMethod: "ACROSS",
          valueType: "PERCENTAGE",
          percentageBps: 5_000,
          amountMinor: null,
          maximumDiscountMinor: null,
        }],
        selections: [{
          discountId: "amount-off-products",
          role: "BENEFIT",
          targetType: "PRODUCTS",
        }],
        targets: [{
          discountId: "amount-off-products",
          role: "BENEFIT",
          targetType: "PRODUCTS",
          targetId: "product-a",
          referenceStatus: "VALID",
        }],
      }),
    );

    expect(allocations).toEqual([
      { lineId: "first", amount: 50n, quantity: null },
    ]);
  });

  it("fails closed when amount-off-products has no BENEFIT selection", () => {
    const product = line("line", "product-a", 100n);
    const allocations = allocateNativeLineCandidate(
      owner("amount-off-products", "AMOUNT_OFF_PRODUCTS"),
      [product],
      new Map([[product.lineId, 100n]]),
      snapshot({
        amountOff: [{
          discountId: "amount-off-products",
          allocationMethod: "ACROSS",
          valueType: "PERCENTAGE",
          percentageBps: 5_000,
          amountMinor: null,
          maximumDiscountMinor: null,
        }],
      }),
    );

    expect(allocations).toEqual([]);
  });

  it("allocates amount-off-order across all remaining line amounts", () => {
    const first = line("first", "product-a", 100n);
    const second = line("second", "product-b", 200n);
    const allocations = allocateNativeLineCandidate(
      owner("amount-off-order", "AMOUNT_OFF_ORDER"),
      [first, second],
      new Map([
        [first.lineId, 100n],
        [second.lineId, 200n],
      ]),
      snapshot({
        amountOff: [{
          discountId: "amount-off-order",
          allocationMethod: "ACROSS",
          valueType: "FIXED_AMOUNT",
          percentageBps: null,
          amountMinor: 90n,
          maximumDiscountMinor: null,
        }],
      }),
    );

    expect(allocations).toEqual([
      { lineId: "first", amount: 30n, quantity: null },
      { lineId: "second", amount: 60n, quantity: null },
    ]);
  });

  it("allocates Buy X Get Y to the independently selected benefit", () => {
    const qualifier = line("qualifier", "product-x", 100n);
    const benefit = line("benefit", "product-y", 40n);
    const allocations = allocateNativeLineCandidate(
      owner("buy-x-get-y", "BUY_X_GET_Y"),
      [qualifier, benefit],
      new Map([
        [qualifier.lineId, 100n],
        [benefit.lineId, 40n],
      ]),
      snapshot({
        buyXGetY: [{
          discountId: "buy-x-get-y",
          requirementType: "QUANTITY",
          requiredQuantity: 1,
          requiredSubtotalMinor: null,
          benefitQuantity: 1,
          benefitStrategy: "FREE",
          benefitValueType: null,
          benefitPercentageBps: null,
          benefitAmountMinor: null,
          usesPerOrderLimit: 1,
        }],
        selections: [
          {
            discountId: "buy-x-get-y",
            role: "QUALIFIER",
            targetType: "PRODUCTS",
          },
          {
            discountId: "buy-x-get-y",
            role: "BENEFIT",
            targetType: "PRODUCTS",
          },
        ],
        targets: [
          {
            discountId: "buy-x-get-y",
            role: "QUALIFIER",
            targetType: "PRODUCTS",
            targetId: "product-x",
            referenceStatus: "VALID",
          },
          {
            discountId: "buy-x-get-y",
            role: "BENEFIT",
            targetType: "PRODUCTS",
            targetId: "product-y",
            referenceStatus: "VALID",
          },
        ],
      }),
    );

    expect(allocations).toEqual([
      { lineId: "benefit", amount: 40n, quantity: 1 },
    ]);
  });
});

describe("native discount allocation", () => {
  it("never places a large rounding remainder beyond target capacity", () => {
    const values = Array.from({ length: 100 }, (_, index) => ({
      lineId: `line-${index.toString().padStart(3, "0")}`,
      weight: 1n,
    }));

    const allocations = allocateProportionally(99n, values);

    expect(
      allocations.reduce((sum, allocation) => sum + allocation.amount, 0n),
    ).toBe(99n);
    expect(allocations).toHaveLength(99);
    expect(
      allocations.every((allocation) => allocation.amount <= 1n),
    ).toBe(true);
    expect(allocations.map(({ lineId }) => lineId)).toEqual(
      values.slice(1).map(({ lineId }) => lineId),
    );
  });

  it("assigns rounding remainder from the end of canonical target order", () => {
    expect(
      allocateProportionally(2n, [
        { lineId: "first", weight: 2n },
        { lineId: "last", weight: 1n },
      ]),
    ).toEqual([
      { lineId: "first", amount: 1n, quantity: null },
      { lineId: "last", amount: 1n, quantity: null },
    ]);
  });

  it("caps an allocation at total eligible capacity", () => {
    expect(
      allocateProportionally(10n, [
        { lineId: "first", weight: 2n },
        { lineId: "second", weight: 1n },
      ]),
    ).toEqual([
      { lineId: "first", amount: 2n, quantity: null },
      { lineId: "second", amount: 1n, quantity: null },
    ]);
  });
});

describe("native discount counter revisions", () => {
  it("normalizes aggregate and code counters independently of DB row order", () => {
    const ordered = counterSnapshot(
      [
        { discountId: "discount-a", version: 1n },
        { discountId: "discount-b", version: 2n },
      ],
      [
        { discountId: "discount-a", codeId: "code-a", version: 3n },
        { discountId: "discount-b", codeId: "code-b", version: 4n },
      ],
    );
    const reversed = counterSnapshot(
      [...ordered.counters].reverse(),
      [...ordered.codeCounters].reverse(),
    );

    expect(canonicalCounterVersions(reversed)).toEqual(
      canonicalCounterVersions(ordered),
    );
  });
});

function counterSnapshot(
  counters: Array<{ discountId: string; version: bigint }>,
  codeCounters: Array<{
    discountId: string;
    codeId: string;
    version: bigint;
  }>,
): Pick<DiscountEvaluationSnapshot, "counters" | "codeCounters"> {
  return {
    counters:
      counters as unknown as DiscountEvaluationSnapshot["counters"],
    codeCounters:
      codeCounters as unknown as DiscountEvaluationSnapshot["codeCounters"],
  };
}

function owner(
  id: string,
  kind: "AMOUNT_OFF_PRODUCTS" | "AMOUNT_OFF_ORDER" | "BUY_X_GET_Y",
): DiscountOwner {
  return {
    id,
    kind,
  } as DiscountOwner;
}

function line(
  lineId: string,
  productId: string,
  unitPrice: bigint,
): Pricing.PricingCheckoutQuotedLine {
  const amount = { amountMinor: unitPrice.toString(), currencyCode: "USD" };
  return {
    lineId,
    contributesToTotals: true,
    quantity: 1,
    unitPrice: amount,
    subtotal: amount,
    merchandise: {
      variantId: `${productId}-variant`,
      targeting: {
        productId,
        categoryIds: [],
      },
    },
  } as Pricing.PricingCheckoutQuotedLine;
}

function snapshot(
  overrides: Record<string, unknown>,
): DiscountEvaluationSnapshot {
  return {
    amountOff: [],
    buyXGetY: [],
    selections: [],
    targets: [],
    ...overrides,
  } as unknown as DiscountEvaluationSnapshot;
}
