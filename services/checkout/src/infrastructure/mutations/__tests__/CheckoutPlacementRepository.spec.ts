import type { SQLExecutor } from "@event-driven-io/dumbo";
import { CheckoutPlacementRepository } from "../CheckoutPlacementRepository.js";

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

    await expect(repository.findByIdForStorefrontCredential({
      placementId: "0198c4d4-9c00-7000-8000-000000000001",
      storeId: "0198c4d4-9c00-7000-8000-000000000002",
      credentialId: "credential-1",
      visitorId: "visitor-1234567890",
    })).resolves.toBeNull();

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

    await expect(repository.prepareOrderId(
      "0198c4d4-9c00-7000-8000-000000000001",
      orderId,
    )).resolves.toBe(orderId);
  });
});
