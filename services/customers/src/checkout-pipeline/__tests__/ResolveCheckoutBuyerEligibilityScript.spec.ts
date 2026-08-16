import { runWithContext, ServiceContext } from "../../context/index.js";
import type { Kernel } from "../../kernel/Kernel.js";
import type { CustomersKernelServices } from "../../kernel/types.js";
import type { Loader } from "../../loaders/Loader.js";
import { ResolveCheckoutBuyerEligibilityScript } from "../ResolveCheckoutBuyerEligibilityScript.js";

const params = {
  storeId: "store-1",
  customerId: "customer-1",
  effectiveAt: "2026-08-02T10:00:00.000Z",
};

describe("ResolveCheckoutBuyerEligibilityScript", () => {
  it("hides a missing customer", async () => {
    await expect(runScript(null)).resolves.toEqual({
      ok: false,
      code: "CUSTOMER_NOT_FOUND",
      message: "Customer was not found.",
      retryable: false,
    });
  });

  it.each(["DISABLED", "BLOCKED", "MERGED", "REDACTED"] as const)(
    "maps %s lifecycle to a non-retryable business failure",
    async (lifecycleStatus) => {
      const result = await runScript({
        customer: { id: params.customerId, lifecycleStatus },
        memberships: [],
      });
      expect(result).toEqual({
        ok: false,
        code: "CUSTOMER_NOT_ELIGIBLE",
        reason: lifecycleStatus,
        message: "Customer is not eligible for checkout.",
        retryable: false,
      });
    }
  );

  it("returns a deterministic sorted snapshot for an active customer", async () => {
    const result = await runScript({
      customer: { id: params.customerId, lifecycleStatus: "ACTIVE" },
      memberships: [membership("segment-2", "membership-2"), membership("segment-1", "membership-1")],
    });
    expect(result).toMatchObject({
      ok: true,
      storeId: params.storeId,
      customerId: params.customerId,
      effectiveAt: params.effectiveAt,
      segmentIds: ["segment-1", "segment-2"],
    });
    expect(result.ok && result.segmentMembershipRevision).toMatch(
      /^sha256:[0-9a-f]{64}$/
    );
  });

  it("sanitizes repository failures", async () => {
    const result = await runScript(undefined, new Error("database detail"));
    expect(result).toEqual({
      ok: false,
      code: "BUYER_ELIGIBILITY_RESOLUTION_FAILED",
      message: "Buyer eligibility could not be resolved.",
      retryable: true,
    });
  });

  it("returns an explicit failure instead of truncating segments", async () => {
    const memberships = Array.from({ length: 501 }, (_, index) =>
      membership(
        `segment-${String(index).padStart(3, "0")}`,
        `membership-${index}`
      )
    );
    await expect(
      runScript({
        customer: { id: params.customerId, lifecycleStatus: "ACTIVE" },
        memberships,
      })
    ).resolves.toMatchObject({
      ok: false,
      code: "BUYER_ELIGIBILITY_LIMIT_EXCEEDED",
      retryable: false,
    });
  });
});

function membership(segmentId: string, membershipId: string) {
  return {
    membershipId,
    segmentId,
    source: "MANUAL" as const,
    evaluatedAt: "2026-08-01T10:00:00.000Z",
    expiresAt: null,
    definitionRevision: null,
  };
}

async function runScript(read: unknown, failure?: Error) {
  const resolveBuyerEligibility = jest.fn(async () => {
    if (failure) throw failure;
    return read;
  });
  const services = {
    repository: { checkoutEligibility: { resolveBuyerEligibility } },
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  } as unknown as CustomersKernelServices;
  const context = new ServiceContext({
    requestId: "request-1",
    kernel: {} as Kernel,
    loaders: {} as Loader,
    store: {
      id: params.storeId,
      name: "store",
      displayName: "Store",
      organizationId: "organization-1",
      timezone: "UTC",
      email: null,
      defaultLocale: "en",
      currencyCode: "USD",
      currencyExponent: 2,
      segmentConfigurationRevision: 0,
      locales: ["en"],
    },
  });
  return runWithContext(context, () =>
    new ResolveCheckoutBuyerEligibilityScript(services).run(params)
  );
}
