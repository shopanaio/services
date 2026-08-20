import { OrderReturnInventoryService } from "./OrderReturnInventoryService.js";
import { describe, expect, jest, test } from "@jest/globals";

const id = "018f3f8d-0e6d-7a74-8f80-123456789abc";

describe("OrderReturnInventoryService", () => {
  test("applies all return changes in one transaction with stable source identities", async () => {
    const applyStockChange = jest.fn().mockResolvedValue({ status: "APPLIED", changeId: id });
    const run = jest.fn(async (work: () => Promise<unknown>) => work());
    const kernel = {
      repository: {
        txManager: { run },
        stock: { applyStockChange },
      },
    };
    const service = new OrderReturnInventoryService(kernel as never);
    const result = await service.restock({
      storeId: id,
      orderId: id,
      returnId: id,
      idempotencyKey: "receive-1",
      correlationId: id,
      lines: [
        {
          orderLineId: id,
          variantId: "variant-1",
          warehouseId: id,
          targetQuantity: 2,
          quantity: 2,
        },
      ],
    });

    expect(run).toHaveBeenCalledTimes(1);
    expect(applyStockChange).toHaveBeenCalledWith(
      expect.objectContaining({
        movementType: "RETURN",
        reason: "CUSTOMER_RETURN",
        deltaOnHand: 2,
        sourceSystem: "orders.return",
      }),
    );
    expect(result.changes).toEqual([{ orderLineId: id, status: "APPLIED", changeId: id }]);
  });

  test("rejects a non-positive restock delta before writing", async () => {
    const applyStockChange = jest.fn();
    const kernel = {
      repository: {
        txManager: { run: (work: () => Promise<unknown>) => work() },
        stock: { applyStockChange },
      },
    };
    const service = new OrderReturnInventoryService(kernel as never);
    await expect(
      service.restock({
        storeId: id,
        orderId: id,
        returnId: id,
        idempotencyKey: "receive-1",
        correlationId: id,
        lines: [
          {
            orderLineId: id,
            variantId: "variant-1",
            warehouseId: id,
            targetQuantity: 2,
            quantity: 0,
          },
        ],
      }),
    ).rejects.toThrow("ORDER_RETURN_INVENTORY_LINE_INVALID");
    expect(applyStockChange).not.toHaveBeenCalled();
  });
});
