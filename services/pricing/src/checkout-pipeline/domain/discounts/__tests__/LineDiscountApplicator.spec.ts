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
        targets: { type: "LINES", lineIds: ["line"] },
        value: {
          type: "FIXED_AMOUNT",
          amount: { amountMinor: "10", currencyCode: "USD" },
        },
        allocationMethod: "ACROSS",
        maximumDiscount: null,
      },
      binding: { functionBindingId: "binding" } as never,
      implementationId: "implementation",
      trace: {
        target: "cart.lines.discounts.generate.run",
        executionId: "function-execution",
        planRevision: "plan-revision",
      } as never,
    },
  };
}

function owner(id: string, priority: number): DiscountOwner {
  return {
    id,
    revision: 1,
    priority,
    method: "AUTOMATIC",
    discountClass: "PRODUCT",
    kind: "AMOUNT_OFF_PRODUCTS",
    usageLimit: null,
    appliesOncePerCustomer: false,
    metadata: null,
  } as DiscountOwner;
}

function line(): Pricing.PricingCheckoutQuotedLine {
  const amount = { amountMinor: "100", currencyCode: "USD" };
  return {
    lineId: "line",
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
