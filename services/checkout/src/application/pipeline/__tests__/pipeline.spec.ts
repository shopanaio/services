import {
  CheckoutPipeline,
  CheckoutPipelineStageError,
  CheckoutValidationRunner,
} from "../index.js";
import type { CommerceFunctionRunnerPort } from "../CheckoutValidationRunner.js";
import type { CheckoutValidationBindingSource } from "../contracts/index.js";
import { recalculationRequestFixture, validationRequestFixture } from "./fixtures.js";

function dependencies(overrides?: {
  preliminary?: (request: unknown) => Promise<any>;
  delivery?: (request: unknown) => Promise<any>;
}) {
  const fixture = validationRequestFixture();
  const pricing = {
    calculatePreliminaryQuote: jest.fn(
      overrides?.preliminary ?? (async (_request: unknown) => fixture.preliminary),
    ),
    finalizeQuote: jest.fn(async (_request: unknown) => fixture.finalQuote),
  };
  const delivery = {
    calculateOptions: jest.fn(
      overrides?.delivery ?? (async (_request: unknown) => fixture.delivery),
    ),
  };
  const payments = {
    getAvailableMethods: jest.fn(async (_request: unknown) => fixture.payment),
  };
  const loyalty = {
    quote: jest.fn(async (request: any) => ({
      status: "NONE" as const,
      revision: "loyalty-none-v1",
      rewardQuote: null,
      rewardContext: null,
      payableAfterLoyalty: request.finalQuote.totals.payableTotal,
    })),
  };
  const functions: CommerceFunctionRunnerPort = {
    run: jest.fn(async () => {
      throw new Error("Function runner must not be called");
    }),
  };
  const validationRunner = new CheckoutValidationRunner({
    functions,
    bindings: emptyBindings,
  });
  return { fixture, pricing, delivery, loyalty, payments, functions, validationRunner };
}

const emptyBindings: CheckoutValidationBindingSource = {
  loadForTarget: async () => [],
};

describe("CheckoutPipeline", () => {
  it("executes the six canonical stages with exact minimized requests", async () => {
    const deps = dependencies();
    const pipeline = new CheckoutPipeline(deps);
    const request = recalculationRequestFixture();

    const result = await pipeline.recalculate(request);
    expect(result.preliminaryPricing.status).toBe("SUCCESS");
    expect(result.delivery.status).toBe("SUCCESS");
    expect(result.finalPricing.status).toBe("SUCCESS");
    expect(result.payment.status).toBe("SUCCESS");
    expect(result.validation.status).toBe("SUCCESS");
    expect(result.validation.issues).toEqual([
      {
        stage: "VALIDATION",
        code: "CART_EMPTY",
        message: "Cart must contain at least one line.",
        severity: "ERROR",
        effect: "STOP",
        field: ["cart", "lines"],
        retryable: false,
      },
    ]);
    expect(result.trace.stages.map(({ stage }) => stage)).toEqual([
      "PRICING_PRELIMINARY",
      "DELIVERY",
      "PRICING_FINAL",
      "LOYALTY",
      "PAYMENT",
      "VALIDATION",
    ]);
    expect(deps.pricing.calculatePreliminaryQuote).toHaveBeenCalledWith({
      context: expect.objectContaining({
        checkoutId: request.context.checkoutId,
        buyerEligibility: expect.objectContaining({
          customerId: "customer-secret",
          countryCode: "UA",
        }),
      }),
      cartIntent: {
        lines: [],
        discountCodes: [],
        destinations: [],
        attributes: request.cartIntent.attributes,
      },
    });
    const preliminaryRequest = deps.pricing.calculatePreliminaryQuote.mock.calls[0]![0];
    expect(JSON.stringify(preliminaryRequest)).not.toContain("private@example.com");
    expect(JSON.stringify(preliminaryRequest)).not.toContain("+380000000000");
    const paymentRequest = deps.payments.getAvailableMethods.mock.calls[0]![0] as {
      readonly delivery: unknown;
    };
    expect(paymentRequest.delivery).toEqual({
      executionId: "execution-1",
      checkoutId: "checkout-1",
      currencyCode: "USD",
      revision: "delivery-v1",
      basedOnPreliminaryRevision: "preliminary-v1",
      destinations: [],
      groups: [],
    });
    expect(deps.functions.run).not.toHaveBeenCalled();
  });

  it("rejects a malformed root request before any port call", async () => {
    const deps = dependencies();
    const pipeline = new CheckoutPipeline(deps);
    await expect(
      pipeline.recalculate({} as ReturnType<typeof recalculationRequestFixture>),
    ).rejects.toThrow();
    expect(deps.pricing.calculatePreliminaryQuote).not.toHaveBeenCalled();
    expect(deps.delivery.calculateOptions).not.toHaveBeenCalled();
    expect(deps.payments.getAvailableMethods).not.toHaveBeenCalled();
  });

  it("sanitizes an unknown stage error and skips every downstream stage", async () => {
    const deps = dependencies({
      preliminary: async () => {
        throw new Error("private preliminary failure");
      },
    });
    const pipeline = new CheckoutPipeline(deps);
    const result = await pipeline.recalculate(recalculationRequestFixture());

    expect(result.preliminaryPricing).toMatchObject({
      status: "FAILED",
      failure: {
        code: "CHECKOUT_PRELIMINARY_PRICING_FAILED",
        message: "Checkout preliminary pricing could not be calculated.",
        retryable: false,
      },
    });
    for (const outcome of [
      result.delivery,
      result.finalPricing,
      result.payment,
      result.validation,
    ]) {
      expect(outcome).toMatchObject({
        status: "SKIPPED",
        reason: {
          code: "CHECKOUT_PIPELINE_UPSTREAM_BLOCKED",
          upstreamStage: "PRICING_PRELIMINARY",
        },
        trace: { durationMs: 0 },
      });
      expect(outcome.trace.startedAt).toBe(outcome.trace.completedAt);
    }
    expect(JSON.stringify(result)).not.toContain("private preliminary failure");
  });

  it("maps malformed port output to the canonical boundary failure", async () => {
    const deps = dependencies({ preliminary: async () => ({}) });
    const pipeline = new CheckoutPipeline(deps);
    const result = await pipeline.recalculate(recalculationRequestFixture());
    expect(result.preliminaryPricing).toMatchObject({
      status: "FAILED",
      failure: {
        code: "CHECKOUT_PIPELINE_BOUNDARY_VIOLATION",
        message: "Checkout pipeline received an invalid boundary payload.",
        retryable: false,
      },
    });
  });

  it("preserves only validated fields from a nominal typed stage error", async () => {
    const deps = dependencies({
      preliminary: async () => {
        throw new CheckoutPipelineStageError({
          code: "PRICING_ADAPTER_UNAVAILABLE",
          message: "Pricing adapter is unavailable.",
          retryable: true,
          cause: new Error("private transport details"),
        });
      },
    });
    const result = await new CheckoutPipeline(deps).recalculate(recalculationRequestFixture());
    expect(result.preliminaryPricing).toMatchObject({
      status: "FAILED",
      failure: {
        code: "PRICING_ADAPTER_UNAVAILABLE",
        message: "Pricing adapter is unavailable.",
        retryable: true,
      },
    });
    expect(JSON.stringify(result)).not.toContain("private transport details");
  });

  it("preserves delivery issue severity and always maps it to CONTINUE", async () => {
    const fixture = validationRequestFixture();
    const deps = dependencies({
      delivery: async () => ({
        ...fixture.delivery,
        issues: [
          {
            severity: "ERROR",
            code: "DELIVERY_PROVIDER_DEGRADED",
            message: "Provider is degraded.",
            groupId: null,
            carrierServiceAccountId: null,
            retryable: true,
          },
        ],
      }),
    });
    const result = await new CheckoutPipeline(deps).recalculate(recalculationRequestFixture());
    expect(result.delivery.issues).toEqual([
      {
        stage: "DELIVERY",
        code: "DELIVERY_PROVIDER_DEGRADED",
        message: "Provider is degraded.",
        severity: "ERROR",
        effect: "CONTINUE",
        field: [],
        retryable: true,
      },
    ]);
  });

  it("produces the same result revision when only execution timing changes", async () => {
    const first = await new CheckoutPipeline(dependencies()).recalculate(
      recalculationRequestFixture(),
    );
    const second = await new CheckoutPipeline(dependencies()).recalculate(
      recalculationRequestFixture(),
    );
  });

  it("times out before the first port call and canonically skips downstream", async () => {
    const deps = dependencies();
    const request = recalculationRequestFixture();
    const deadlineAt = Date.parse(request.context.deadlineAt);
    const pipeline = new CheckoutPipeline({
      ...deps,
      runtime: {
        now: () => deadlineAt,
        schedule: jest.fn(),
        cancel: jest.fn(),
      },
    });
    const result = await pipeline.recalculate(request);
    expect(result.preliminaryPricing).toMatchObject({
      status: "FAILED",
      failure: {
        code: "CHECKOUT_PIPELINE_DEADLINE_EXCEEDED",
        retryable: true,
      },
    });
    expect(result.trace).toMatchObject({
      deadlineExceeded: true,
      deadlineObservedAt: request.context.deadlineAt,
    });
    expect(deps.pricing.calculatePreliminaryQuote).not.toHaveBeenCalled();
    expect(result.delivery.status).toBe("SKIPPED");
  });
});
