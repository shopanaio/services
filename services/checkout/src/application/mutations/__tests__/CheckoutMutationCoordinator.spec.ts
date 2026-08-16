import { CheckoutPipeline } from "../../pipeline/CheckoutPipeline.js";
import { CheckoutPipelineStageError } from "../../pipeline/CheckoutPipelineStageError.js";
import { CheckoutValidationRunner } from "../../pipeline/CheckoutValidationRunner.js";
import { validationRequestFixture } from "../../pipeline/__tests__/fixtures.js";
import { CheckoutMutationCoordinator } from "../CheckoutMutationCoordinator.js";
import { CheckoutRecalculationRequestFactory } from "../CheckoutRecalculationRequestFactory.js";
import {
  CheckoutMutationError,
  type CheckoutCommittedSnapshot,
  type CheckoutMutationDraft,
} from "../contracts.js";

const now = new Date(Date.now() + 60_000);

function draft(version = 3): CheckoutMutationDraft {
  return {
    checkoutId: "checkout-1",
    storeId: "store-1",
    version,
    currencyCode: "USD",
    localeCode: "en",
    channelCode: "web",
    externalSource: null,
    externalId: null,
    buyerIdentity: null,
    cartIntent: {
      lines: [],
      discountCodes: [],
      destinations: [],
      selectedDeliveryOptions: [],
      selectedPaymentMethod: null,
      attributes: {},
    },
    customerNote: null,
    tags: [],
    lineTagAssignments: [],
    loyaltyRedemption: null,
  };
}

function pipeline(input?: { preliminaryFailure?: boolean }) {
  const validation = validationRequestFixture();
  const pricing = {
    calculatePreliminaryQuote: jest.fn(async (request: any) => {
      if (input?.preliminaryFailure) {
        throw new CheckoutPipelineStageError({
          code: "PRICING_TEMPORARILY_UNAVAILABLE",
          message: "Pricing is temporarily unavailable.",
          retryable: true,
        });
      }
      return provenance(validation.preliminary, request.context);
    }),
    finalizeQuote: jest.fn(async (request: any) => ({
      ...provenance(validation.finalQuote, request.context),
      basedOnPreliminaryRevision: request.preliminary.revision,
      basedOnPreliminaryDiscountEvaluationRevision:
        request.preliminary.discountEvaluationRevision,
      basedOnDeliveryRevision: request.delivery.revision,
    })),
  };
  const delivery = {
    calculateOptions: jest.fn(async (request: any) => ({
      ...provenance(validation.delivery, request.context),
      basedOnPreliminaryRevision: request.preliminary.revision,
    })),
  };
  const payments = {
    getAvailableMethods: jest.fn(async (request: any) => ({
      ...provenance(validation.payment, request.context),
      discoveryRevision: "payment-discovery-v1",
      customizationRevision: "payment-customization-v1",
      basedOnFinalQuoteRevision: request.finalQuote.revision,
      basedOnLoyaltyQuoteRevision: request.loyaltyRedemption?.quoteRevision ?? null,
      basedOnDeliveryRevision: request.delivery.revision,
      issues: [],
    })),
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
  const validationRunner = new CheckoutValidationRunner({
    functions: {
      run: jest.fn(async () => {
        throw new Error("No function should execute for an empty binding set");
      }),
    },
    bindings: { loadForTarget: jest.fn(async () => []) },
  });
  return new CheckoutPipeline({ pricing, delivery, loyalty, payments, validationRunner });
}

function provenance<T extends object>(value: T, context: any): T {
  return {
    ...value,
    executionId: context.executionId,
    checkoutId: context.checkoutId,
    basedOnCheckoutVersion: context.expectedCheckoutVersion,
    currencyCode: context.currencyCode,
  };
}

function factory() {
  return new CheckoutRecalculationRequestFactory(
    { resolve: jest.fn() },
    {
      now: () => now,
      deadlineMs: 15_000,
      createId: () => "execution-coordinator",
    },
  );
}

async function committedCurrent(
  checkoutPipeline: CheckoutPipeline,
  currentDraft = draft(),
): Promise<CheckoutCommittedSnapshot> {
  const request = await factory().create({
    draft: currentDraft,
    change: "CREATE",
    context: {
      storeId: currentDraft.storeId,
      storefrontAccess: {
        connectionId: "connection-1",
        installationId: "installation-1",
        credentialId: "credential-1",
        accessMode: "PUBLIC",
      },
    },
  });
  const result = await checkoutPipeline.recalculate(request);
  return {
    checkoutId: currentDraft.checkoutId,
    storeId: currentDraft.storeId,
    version: currentDraft.version,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    draft: currentDraft,
    result,
  };
}

const executionContext = {
  storeId: "store-1",
  storefrontAccess: {
    connectionId: "connection-1",
    installationId: "installation-1",
    credentialId: "credential-1",
    accessMode: "PUBLIC" as const,
  },
};

describe("CheckoutMutationCoordinator", () => {
  it("runs one complete pipeline before one CAS commit and persists validation invalidity", async () => {
    const checkoutPipeline = pipeline();
    const current = await committedCurrent(checkoutPipeline);
    const order: string[] = [];
    const recalculate = jest.spyOn(checkoutPipeline, "recalculate").mockImplementation(
      async (request) => {
        order.push("pipeline");
        return CheckoutPipeline.prototype.recalculate.call(checkoutPipeline, request);
      },
    );
    const commits = {
      create: jest.fn(),
      commit: jest.fn(async (input: any) => {
        order.push("commit");
        return {
          status: "COMMITTED" as const,
          checkout: {
            ...current,
            version: input.nextVersion,
            draft: input.draft,
            result: input.result,
          },
        };
      }),
      commitWithoutRecalculation: jest.fn(),
    };
    const coordinator = new CheckoutMutationCoordinator({
      snapshots: { load: jest.fn(async () => current) },
      commits,
      requests: factory(),
      pipeline: checkoutPipeline,
      idempotency: { reserve: jest.fn(), markFailed: jest.fn() },
    });

    const result = await coordinator.execute({
      checkoutId: current.checkoutId,
      storeId: current.storeId,
      change: "LOCALE_UPDATE",
      context: executionContext,
      apply: (prospective) => {
        prospective.localeCode = "uk";
      },
    });

    expect(order).toEqual(["pipeline", "commit"]);
    expect(recalculate).toHaveBeenCalledTimes(1);
    expect(commits.commit).toHaveBeenCalledTimes(1);
    expect(result.checkout.version).toBe(4);
    expect(result.checkout.result.validation.status).toBe("SUCCESS");
    if (result.checkout.result.validation.status === "SUCCESS") {
      expect(result.checkout.result.validation.data.valid).toBe(false);
    }
  });

  it("does not run pipeline or increment version for a no-op", async () => {
    const checkoutPipeline = pipeline();
    const current = await committedCurrent(checkoutPipeline);
    const recalculate = jest.spyOn(checkoutPipeline, "recalculate");
    const commit = jest.fn();
    const coordinator = new CheckoutMutationCoordinator({
      snapshots: { load: jest.fn(async () => current) },
      commits: { create: jest.fn(), commit, commitWithoutRecalculation: jest.fn() },
      requests: factory(),
      pipeline: checkoutPipeline,
      idempotency: { reserve: jest.fn(), markFailed: jest.fn() },
    });

    const result = await coordinator.execute({
      checkoutId: current.checkoutId,
      storeId: current.storeId,
      change: "LOCALE_UPDATE",
      context: executionContext,
      apply: () => undefined,
    });

    expect(recalculate).not.toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
    expect(result.checkout).toBe(current);
  });

  it("rejects a failed stage without committing", async () => {
    const healthy = pipeline();
    const current = await committedCurrent(healthy);
    const failing = pipeline({ preliminaryFailure: true });
    const commit = jest.fn();
    const coordinator = new CheckoutMutationCoordinator({
      snapshots: { load: jest.fn(async () => current) },
      commits: { create: jest.fn(), commit, commitWithoutRecalculation: jest.fn() },
      requests: factory(),
      pipeline: failing,
      idempotency: { reserve: jest.fn(), markFailed: jest.fn() },
    });

    await expect(coordinator.execute({
      checkoutId: current.checkoutId,
      storeId: current.storeId,
      change: "CURRENCY_UPDATE",
      context: executionContext,
      apply: (prospective) => {
        prospective.currencyCode = "EUR";
      },
    })).rejects.toMatchObject({
      code: "PRICING_TEMPORARILY_UNAVAILABLE",
      retryable: true,
    });
    expect(commit).not.toHaveBeenCalled();
  });

  it("returns a retryable conflict and never retries the pipeline", async () => {
    const checkoutPipeline = pipeline();
    const current = await committedCurrent(checkoutPipeline);
    const recalculate = jest.spyOn(checkoutPipeline, "recalculate");
    const coordinator = new CheckoutMutationCoordinator({
      snapshots: { load: jest.fn(async () => current) },
      commits: {
        create: jest.fn(),
        commit: jest.fn(async () => ({ status: "VERSION_CONFLICT" as const })),
        commitWithoutRecalculation: jest.fn(),
      },
      requests: factory(),
      pipeline: checkoutPipeline,
      idempotency: { reserve: jest.fn(), markFailed: jest.fn() },
    });

    await expect(coordinator.execute({
      checkoutId: current.checkoutId,
      storeId: current.storeId,
      change: "BUYER_UPDATE",
      context: executionContext,
      apply: (prospective) => {
        prospective.buyerIdentity = {
          customerId: null,
          email: "buyer@example.com",
          phone: null,
          countryCode: null,
          firstName: null,
          middleName: null,
          lastName: null,
          marketId: null,
          companyId: null,
          data: null,
        };
      },
    })).rejects.toEqual(expect.objectContaining<Partial<CheckoutMutationError>>({
      code: "CHECKOUT_VERSION_CONFLICT",
      retryable: true,
    }));
    expect(recalculate).toHaveBeenCalledTimes(1);
  });

  it("uses CAS-only commit for non-recalculating mutations", async () => {
    const checkoutPipeline = pipeline();
    const current = await committedCurrent(checkoutPipeline);
    const recalculate = jest.spyOn(checkoutPipeline, "recalculate");
    const commitWithoutRecalculation = jest.fn(async (input: any) => ({
      status: "COMMITTED" as const,
      checkout: { ...current, version: input.nextVersion, draft: input.draft },
    }));
    const coordinator = new CheckoutMutationCoordinator({
      snapshots: { load: jest.fn(async () => current) },
      commits: { create: jest.fn(), commit: jest.fn(), commitWithoutRecalculation },
      requests: factory(),
      pipeline: checkoutPipeline,
      idempotency: { reserve: jest.fn(), markFailed: jest.fn() },
    });

    await coordinator.executeWithoutRecalculation({
      checkoutId: current.checkoutId,
      storeId: current.storeId,
      context: executionContext,
      apply: (prospective) => {
        prospective.customerNote = "note";
      },
    });

    expect(recalculate).not.toHaveBeenCalled();
    expect(commitWithoutRecalculation).toHaveBeenCalledTimes(1);
  });

  it("replays a committed create without running the pipeline", async () => {
    const checkoutPipeline = pipeline();
    const committed = await committedCurrent(checkoutPipeline, draft(1));
    const recalculate = jest.spyOn(checkoutPipeline, "recalculate");
    const coordinator = new CheckoutMutationCoordinator({
      snapshots: { load: jest.fn() },
      commits: { create: jest.fn(), commit: jest.fn(), commitWithoutRecalculation: jest.fn() },
      requests: factory(),
      pipeline: checkoutPipeline,
      idempotency: {
        reserve: jest.fn(async () => ({ status: "COMMITTED" as const, checkout: committed })),
        markFailed: jest.fn(),
      },
    });

    const result = await coordinator.create({
      reservation: reservation(),
      context: executionContext,
      value: undefined,
      createDraft: () => {
        throw new Error("Replay must not rebuild the draft");
      },
    });

    expect(result.checkout).toBe(committed);
    expect(recalculate).not.toHaveBeenCalled();
  });

  it("rejects create key reuse before draft construction or pipeline", async () => {
    const checkoutPipeline = pipeline();
    const recalculate = jest.spyOn(checkoutPipeline, "recalculate");
    const createDraft = jest.fn(() => draft(0));
    const coordinator = new CheckoutMutationCoordinator({
      snapshots: { load: jest.fn() },
      commits: { create: jest.fn(), commit: jest.fn(), commitWithoutRecalculation: jest.fn() },
      requests: factory(),
      pipeline: checkoutPipeline,
      idempotency: {
        reserve: jest.fn(async () => ({ status: "KEY_REUSED" as const })),
        markFailed: jest.fn(),
      },
    });

    await expect(coordinator.create({
      reservation: reservation(),
      context: executionContext,
      value: undefined,
      createDraft,
    })).rejects.toMatchObject({
      code: "CHECKOUT_IDEMPOTENCY_KEY_REUSED",
      retryable: false,
    });
    expect(createDraft).not.toHaveBeenCalled();
    expect(recalculate).not.toHaveBeenCalled();
  });
});

function reservation() {
  return {
    identity: {
      storeId: "store-1",
      connectionId: "connection-1",
      operation: "CHECKOUT_CREATE" as const,
      idempotencyKey: "create-1",
    },
    requestHash: "request-hash",
    checkoutId: "checkout-1",
    initiatingCredentialId: "credential-1",
    reservedIds: { lineIds: [], tagIds: [] },
  };
}
