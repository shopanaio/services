import type { SQLExecutor } from "@event-driven-io/dumbo";
import { CheckoutMutationRepository } from "../CheckoutMutationRepository.js";

function executor(rows: unknown[] = []) {
  return {
    query: jest.fn(async () => ({ rows })),
    command: jest.fn(async () => ({ rows: [] })),
    batchQuery: jest.fn(),
    batchCommand: jest.fn(),
  } as unknown as SQLExecutor;
}

describe("CheckoutMutationRepository", () => {
  it("loads only the requested checkout/store snapshot without defaults", async () => {
    const execute = executor([{ snapshot: { checkoutId: "checkout-1", version: 7 } }]);
    const repository = new CheckoutMutationRepository(execute);

    await expect(repository.load({
      checkoutId: "checkout-1",
      storeId: "store-1",
    })).resolves.toEqual({ checkoutId: "checkout-1", version: 7 });

    const sql = (execute.query as jest.Mock).mock.calls[0][0] as string;
    expect(sql).toContain('from "checkout"."checkout_current_snapshots"');
    expect(sql).toContain('"checkout_id" = \'checkout-1\'');
    expect(sql).toContain('"store_id" = \'store-1\'');
  });

  it("guards both root and snapshot with the same expected version CAS", async () => {
    const execute = executor([]);
    const repository = new CheckoutMutationRepository(execute);
    const result = completeResult();

    await expect(repository.commit({
      storeId: "store-1",
      checkoutId: "checkout-1",
      expectedVersion: 7,
      nextVersion: 8,
      createdAt: "2026-08-02T10:00:00.000Z",
      draft: {
        checkoutId: "checkout-1",
        storeId: "store-1",
        version: 8,
        currencyCode: "USD",
        localeCode: null,
        channelCode: "web",
        externalSource: null,
        externalId: null,
        buyerIdentity: null,
        billingAddress: null,
        cartIntent: {
          lines: [],
          discountCodes: ["REJECTED"],
          destinations: [],
          selectedDeliveryOptions: [],
          selectedPaymentMethod: null,
          attributes: {},
        },
        customerNote: null,
        tags: [],
        lineTagAssignments: [],
        loyaltyRedemption: null,
      },
      result: result as any,
    })).resolves.toEqual({ status: "VERSION_CONFLICT" });

    const sql = (execute.query as jest.Mock).mock.calls[0][0] as string;
    expect(sql).toContain("WITH updated_checkout AS");
    expect(sql).toContain("checkout.checkout_current_snapshots");
    expect(sql).toContain("version = 7");
    expect(sql).toContain("checkout_version = 7");
    expect(sql).toContain("EXISTS");
  });

  it("claims only the current unexpired create lease before inserting", async () => {
    const execute = executor([]);
    const repository = new CheckoutMutationRepository(execute);
    const leaseToken = "0198c4d4-9c00-7000-8000-000000000001";

    await expect(repository.create({
      reservation: {
        identity: {
          storeId: "store-1",
          connectionId: "connection-1",
          operation: "CHECKOUT_CREATE",
          idempotencyKey: "create-1",
        },
        requestHash: "a".repeat(64),
        checkoutId: "checkout-1",
        initiatingCredentialId: "credential-1",
        reservedIds: { lineIds: [], tagIds: [] },
        leaseToken,
      },
      draft: {
        checkoutId: "checkout-1",
        storeId: "store-1",
        version: 1,
        currencyCode: "USD",
        localeCode: null,
        channelCode: "web",
        externalSource: null,
        externalId: null,
        buyerIdentity: null,
        billingAddress: null,
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
      },
      result: completeResult() as any,
    })).resolves.toEqual({ status: "VERSION_CONFLICT" });

    const sql = (execute.query as jest.Mock).mock.calls[0][0] as string;
    expect(sql).toContain("WITH locked_reservation AS MATERIALIZED");
    expect(sql).toContain("FOR UPDATE");
    expect(sql).toContain("lease_expires_at >");
    expect(sql).toContain(leaseToken);
  });
});

function completeResult() {
  const money = { amountMinor: "0", currencyCode: "USD" };
  return {
    executionId: "execution-1",
    checkoutId: "checkout-1",
    basedOnCheckoutVersion: 7,
    resultRevision: "sha256:revision",
    issues: [],
    preliminaryPricing: { status: "SUCCESS" },
    delivery: { status: "SUCCESS" },
    payment: { status: "SUCCESS" },
    finalPricing: {
      status: "SUCCESS",
      data: {
        totals: {
          merchandiseSubtotal: money,
          merchandiseDiscountTotal: money,
          merchandiseTotal: money,
          taxTotal: money,
          deliverySubtotal: money,
          deliveryDiscountTotal: money,
          deliveryTotal: money,
          payableTotal: money,
        },
      },
    },
    validation: { status: "SUCCESS", data: { valid: false } },
    trace: {},
  };
}
