import type { DiscountEvaluationSnapshot } from "../../../infrastructure/DiscountEvaluationRepository.js";
import {
  allocateProportionally,
  canonicalCounterVersions,
} from "../NativeDiscountEngine.js";

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
