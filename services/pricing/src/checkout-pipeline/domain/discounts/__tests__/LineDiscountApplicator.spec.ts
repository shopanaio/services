import type { Pricing } from "@shopana/broker-types";
import type { DiscountEvaluationSnapshot } from "../../../infrastructure/DiscountEvaluationRepository.js";
import {
  applyLineDiscountCandidates,
  type LineDiscountCandidate,
} from "../LineDiscountApplicator.js";
import type { DiscountOwner } from "../NativeDiscountEngine.js";

describe("ordered line discount application", () => {
  it("orders native and function candidates before applying either source", () => {
    const result = applyLineDiscountCandidates({
      context: context(),
      roots: [line()],
      snapshot: snapshot(),
      candidates: [
        nativeCandidate(owner("native", 10)),
        functionCandidate(owner("function", 20), "function-candidate"),
      ],
      codeResolutions: [],
    });

    expect(result.applications).toHaveLength(1);
    expect(result.applications[0]).toEqual(
      expect.objectContaining({
        discountId: "function",
        source: expect.objectContaining({ kind: "FUNCTION" }),
      }),
    );
  });

  it("accepts at most one candidate from a FUNCTION owner", () => {
    const sharedOwner = owner("function", 20);
    const result = applyLineDiscountCandidates({
      context: context(),
      roots: [line()],
      snapshot: snapshot(),
      candidates: [
        functionCandidate(sharedOwner, "candidate-b"),
        functionCandidate(sharedOwner, "candidate-a"),
      ],
      codeResolutions: [],
    });

    expect(result.applications).toHaveLength(1);
    expect(result.applications[0]?.metadata).toEqual({
      candidateId: "candidate-a",
    });
  });

  it("applies PRODUCT amounts before ORDER amounts and emits canonical priority order", () => {
    const product = owner("product", 10, "PRODUCT", "AMOUNT_OFF_PRODUCTS");
    const order = owner("order", 20, "ORDER", "AMOUNT_OFF_ORDER");
    const result = applyLineDiscountCandidates({
      context: context(),
      roots: [line()],
      snapshot: {
        ...snapshot(),
        amountOff: [
          {
            discountId: "product",
            allocationMethod: "ACROSS",
            valueType: "PERCENTAGE",
            percentageBps: 5_000,
            amountMinor: null,
            maximumDiscountMinor: null,
          },
          {
            discountId: "order",
            allocationMethod: "ACROSS",
            valueType: "FIXED_AMOUNT",
            percentageBps: null,
            amountMinor: 30n,
            maximumDiscountMinor: null,
          },
        ],
        combinations: [
          { discountId: "product", combinesWithClass: "ORDER" },
          { discountId: "order", combinesWithClass: "PRODUCT" },
        ],
      } as unknown as DiscountEvaluationSnapshot,
      candidates: [nativeCandidate(order), nativeCandidate(product)],
      codeResolutions: [],
    });

    expect(
      result.applications.map((application) => ({
        discountId: application.discountId,
        amount: application.amount.amountMinor,
      })),
    ).toEqual([
      { discountId: "order", amount: "30" },
      { discountId: "product", amount: "50" },
    ]);
    expect(result.lines[0]?.total.amountMinor).toBe("20");
  });

  it("applies a fixed EACH function adjustment independently per line", () => {
    const discountOwner = owner("function", 20);
    const candidate = functionCandidate(
      discountOwner,
      "fixed-each",
      ["first", "second"],
      "EACH",
      "100",
    );
    const result = applyLineDiscountCandidates({
      context: context(),
      roots: [line("first", 100n), line("second", 1_000n)],
      snapshot: snapshot(),
      candidates: [candidate],
      codeResolutions: [],
    });

    expect(result.applications[0]?.allocations).toEqual([
      {
        targetType: "LINE",
        lineId: "first",
        quantity: null,
        amount: { amountMinor: "100", currencyCode: "USD" },
      },
      {
        targetType: "LINE",
        lineId: "second",
        quantity: null,
        amount: { amountMinor: "100", currencyCode: "USD" },
      },
    ]);
  });

  it("applies a maximum cap to the sum of EACH function adjustments", () => {
    const discountOwner = owner("function", 20);
    const candidate = functionCandidate(
      discountOwner,
      "capped-fixed-each",
      ["first", "second"],
      "EACH",
      "100",
    );
    if (candidate.source.kind !== "FUNCTION") {
      throw new Error("Expected a function discount candidate");
    }
    candidate.source.candidate.maximumDiscount = {
      amountMinor: "150",
      currencyCode: "USD",
    };
    const result = applyLineDiscountCandidates({
      context: context(),
      roots: [line("first", 100n), line("second", 1_000n)],
      snapshot: snapshot(),
      candidates: [candidate],
      codeResolutions: [],
    });

    expect(result.applications[0]?.allocations).toEqual([
      {
        targetType: "LINE",
        lineId: "first",
        quantity: null,
        amount: { amountMinor: "75", currencyCode: "USD" },
      },
      {
        targetType: "LINE",
        lineId: "second",
        quantity: null,
        amount: { amountMinor: "75", currencyCode: "USD" },
      },
    ]);
  });
});

function nativeCandidate(discountOwner: DiscountOwner): LineDiscountCandidate {
  return {
    candidateId: "native",
    owner: discountOwner,
    code: null,
    inputIndex: null,
    inputCode: null,
    title: "Native",
    source: { kind: "NATIVE" },
  };
}

function functionCandidate(
  discountOwner: DiscountOwner,
  candidateId: string,
  lineIds: string[] = ["line"],
  allocationMethod: "EACH" | "ACROSS" = "ACROSS",
  fixedAmountMinor = "10",
): LineDiscountCandidate {
  return {
    candidateId,
    owner: discountOwner,
    code: null,
    inputIndex: null,
    inputCode: null,
    title: candidateId,
    source: {
      kind: "FUNCTION",
      candidate: {
        candidateId,
        discountClass: "PRODUCT",
        title: candidateId,
        targets: { type: "LINES", lineIds },
        value: {
          type: "FIXED_AMOUNT",
          amount: { amountMinor: fixedAmountMinor, currencyCode: "USD" },
        },
        allocationMethod,
        maximumDiscount: null,
      },
      binding: { functionBindingId: "binding" } as never,
      implementationId: "implementation",
      trace: {
        target: "cart.lines.discounts.generate.run",
        executionId: "function-execution",
      } as never,
    },
  };
}

function owner(
  id: string,
  priority: number,
  discountClass: "PRODUCT" | "ORDER" = "PRODUCT",
  kind: "AMOUNT_OFF_PRODUCTS" | "AMOUNT_OFF_ORDER" = "AMOUNT_OFF_PRODUCTS",
): DiscountOwner {
  return {
    id,
    priority,
    method: "AUTOMATIC",
    discountClass,
    kind,
    usageLimit: null,
    appliesOncePerCustomer: false,
    metadata: null,
  } as DiscountOwner;
}

function line(lineId = "line", amountMinor: bigint = 100n): Pricing.PricingCheckoutQuotedLine {
  const amount = { amountMinor: amountMinor.toString(), currencyCode: "USD" };
  return {
    lineId,
    contributesToTotals: true,
    quantity: 1,
    subtotal: amount,
    total: amount,
    children: [],
    discountAllocations: [],
  } as Pricing.PricingCheckoutQuotedLine;
}

function context(): Pricing.PricingCheckoutEvaluationContext {
  return {
    currencyCode: "USD",
    buyerEligibility: null,
  } as Pricing.PricingCheckoutEvaluationContext;
}

function snapshot(): DiscountEvaluationSnapshot {
  return {
    combinations: [],
    counters: [],
    codeCounters: [],
    amountOff: [],
    selections: [],
    targets: [],
  } as unknown as DiscountEvaluationSnapshot;
}
