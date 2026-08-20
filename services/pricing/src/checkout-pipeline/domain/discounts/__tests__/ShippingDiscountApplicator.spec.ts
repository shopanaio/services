import type { Pricing } from "@shopana/broker-types";
import type { DiscountEvaluationSnapshot } from "../../../infrastructure/DiscountEvaluationRepository.js";
import {
  applyShippingDiscountCandidates,
  type ShippingDiscountCandidate,
} from "../ShippingDiscountApplicator.js";
import type { DiscountOwner } from "../NativeDiscountEngine.js";

describe("ordered shipping discount application", () => {
  it("orders native and function candidates before combination checks", () => {
    const native = candidate(owner("native", 10), "native", "NATIVE");
    const functionCandidate = candidate(owner("function", 20), "function-candidate", "FUNCTION");

    const result = applyShippingDiscountCandidates({
      context: context(),
      preliminary: preliminary(),
      delivery: delivery(),
      snapshot: snapshot(),
      candidates: [native, functionCandidate],
      codeResolutions: [],
    });

    expect(result.applications).toHaveLength(1);
    expect(result.applications[0]).toEqual(
      expect.objectContaining({
        discountId: "function",
        source: expect.objectContaining({ kind: "FUNCTION" }),
        amount: { amountMinor: "100", currencyCode: "USD" },
      }),
    );
  });

  it("uses delivery group order for deterministic remainder allocation", () => {
    const fixed = candidate(owner("fixed", 10), "fixed", "NATIVE");
    fixed.value = {
      type: "FIXED_AMOUNT",
      amount: { amountMinor: "1", currencyCode: "USD" },
    };

    const result = applyShippingDiscountCandidates({
      context: context(),
      preliminary: preliminary(),
      delivery: delivery(1n, 1n),
      snapshot: snapshot(),
      candidates: [fixed],
      codeResolutions: [],
    });

    expect(result.applications[0]?.allocations).toEqual([
      {
        targetType: "DELIVERY_GROUP",
        groupId: "group-b",
        amount: { amountMinor: "1", currencyCode: "USD" },
      },
    ]);
  });

  it("applies free shipping only to groups within the configured price limit", () => {
    const freeShipping = candidate(owner("free-shipping", 10), "free-shipping", "NATIVE");
    freeShipping.maximumShippingPrice = {
      amountMinor: "50",
      currencyCode: "USD",
    };

    const result = applyShippingDiscountCandidates({
      context: context(),
      preliminary: preliminary(),
      delivery: delivery(50n, 51n),
      snapshot: snapshot(),
      candidates: [freeShipping],
      codeResolutions: [],
    });

    expect(result.applications[0]?.allocations).toEqual([
      {
        targetType: "DELIVERY_GROUP",
        groupId: "group-a",
        amount: { amountMinor: "50", currencyCode: "USD" },
      },
    ]);
  });
});

function candidate(
  discountOwner: DiscountOwner,
  candidateId: string,
  source: "NATIVE" | "FUNCTION",
): ShippingDiscountCandidate {
  return {
    candidateId,
    owner: discountOwner,
    code: null,
    inputIndex: null,
    inputCode: null,
    title: candidateId,
    groupIds: ["group-a", "group-b"],
    value: { type: "FREE" },
    maximumShippingPrice: null,
    source:
      source === "NATIVE"
        ? { kind: "NATIVE" }
        : {
            kind: "FUNCTION",
            binding: { functionBindingId: "binding" } as never,
            implementationId: "implementation",
            trace: {
              target: "cart.delivery-options.discounts.generate.run",
              executionId: "function-execution",
              planRevision: "plan-revision",
            } as never,
          },
  };
}

function owner(id: string, priority: number): DiscountOwner {
  return {
    id,
    revision: 1n,
    priority,
    method: "AUTOMATIC",
    discountClass: "SHIPPING",
    usageLimit: null,
    appliesOncePerCustomer: false,
    metadata: null,
  } as DiscountOwner;
}

function context(): Pricing.PricingCheckoutEvaluationContext {
  return {
    currencyCode: "USD",
    buyerEligibility: null,
  } as Pricing.PricingCheckoutEvaluationContext;
}

function preliminary(): Pricing.CalculateCheckoutPreliminaryQuoteResult {
  return {
    appliedDiscounts: [],
  } as Pricing.CalculateCheckoutPreliminaryQuoteResult;
}

function delivery(
  firstCost: bigint = 50n,
  secondCost: bigint = 50n,
): Pricing.PricingCheckoutDeliverySnapshot {
  return {
    groups: [selectedGroup("group-a", firstCost), selectedGroup("group-b", secondCost)],
  } as Pricing.PricingCheckoutDeliverySnapshot;
}

function selectedGroup(groupId: string, cost: bigint) {
  return {
    groupId,
    lineIds: [`${groupId}-line`],
    options: [
      {
        handle: "selected",
        code: "standard",
        carrierCode: null,
        deliveryMethodType: "SHIPPING" as const,
        cost: { amountMinor: cost.toString(), currencyCode: "USD" },
      },
    ],
    selectedOptionHandle: "selected",
  };
}

function snapshot(): DiscountEvaluationSnapshot {
  return {
    combinations: [],
    counters: [],
    codeCounters: [],
  } as unknown as DiscountEvaluationSnapshot;
}
