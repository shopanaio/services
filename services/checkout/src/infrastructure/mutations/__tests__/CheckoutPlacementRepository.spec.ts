import type { SQLExecutor } from "@event-driven-io/dumbo";
import {
  CheckoutPlacementRepository,
  hasReachedPlacementState,
} from "../CheckoutPlacementRepository.js";

function executor(rows: unknown[] = []) {
  return {
    query: jest.fn(async () => ({ rows })),
    command: jest.fn(async () => ({ rows: [] })),
    batchQuery: jest.fn(),
    batchCommand: jest.fn(),
  } as unknown as SQLExecutor;
}

describe("CheckoutPlacementRepository", () => {
  it("scopes storefront placement reads to credential and signed visitor ownership", async () => {
    const execute = executor();
    const repository = new CheckoutPlacementRepository(execute);

    await expect(
      repository.findByIdForStorefrontCredential({
        placementId: "0198c4d4-9c00-7000-8000-000000000001",
        storeId: "0198c4d4-9c00-7000-8000-000000000002",
        credentialId: "credential-1",
        visitorId: "visitor-1234567890",
      }),
    ).resolves.toBeNull();

    const sql = (execute.query as jest.Mock).mock.calls[0][0] as string;
    expect(sql).toContain("checkout.checkouts");
    expect(sql).toContain("owner_visitor_id");
    expect(sql).toContain("visitor-1234567890");
    expect(sql).toContain("credential-1");
  });

  it("persists the first generated order ID as the recovery fence", async () => {
    const orderId = "0198c4d4-9c00-7000-8000-000000000003";
    const execute = executor([{ requested_order_id: orderId }]);
    const repository = new CheckoutPlacementRepository(execute);

    await expect(
      repository.prepareOrderId("0198c4d4-9c00-7000-8000-000000000001", orderId),
    ).resolves.toBe(orderId);
  });

  it("persists discount reservation IDs before the aggregate stage transition", async () => {
    const execute = executor([{ id: "placement-1" }]);
    const repository = new CheckoutPlacementRepository(execute);

    await expect(
      repository.recordDiscountReservations("placement-1", ["reservation-1"]),
    ).resolves.toBeUndefined();

    const sql = (execute.query as jest.Mock).mock.calls[0][0] as string;
    expect(sql).toContain("discount_reservation_ids");
    expect(sql).toContain("reservation-1");
    expect(sql).toContain("CLAIMED");
  });

  it.each([
    ["RESOURCES_RESERVED", "RESOURCES_RESERVED"],
    ["ORDER_CREATED", "RESOURCES_RESERVED"],
    ["PAYMENT_CREATED", "RESOURCES_RESERVED"],
    ["PLACED", "ORDER_CREATED"],
  ] as const)("accepts recovery at %s after reaching %s", (current, target) => {
    expect(hasReachedPlacementState(current, target)).toBe(true);
  });

  it("does not treat a failed placement as completed progress", () => {
    expect(hasReachedPlacementState("FAILED", "RESOURCES_RESERVED")).toBe(false);
  });
});
