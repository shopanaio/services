import { createHash } from "node:crypto";
import type { Inventory } from "@shopana/broker-types";
import { Kernel } from "../kernel/Kernel.js";

export class OrderReturnInventoryService {
  constructor(private readonly kernel: Kernel) {}

  async restock(
    params: Inventory.RestockOrderReturnInventoryParams,
  ): Promise<Inventory.RestockOrderReturnInventoryResult> {
    const lines = aggregateLines(params.lines);
    return this.kernel.repository.txManager.run(async () => {
      const changes: Array<Inventory.RestockOrderReturnInventoryResult["changes"][number]> = [];
      for (const line of lines) {
        const result = await this.kernel.repository.stock.applyStockChange({
          variantId: line.variantId,
          warehouseId: line.warehouseId,
          deltaOnHand: line.quantity,
          movementType: "RETURN",
          reason: "CUSTOMER_RETURN",
          sourceSystem: "orders.return",
          sourceEventId: sourceEventId(params, line),
          correlationId: params.correlationId,
          note: `Return ${params.returnId} for order ${params.orderId}`,
        });
        if (result.status === "REJECTED" || !result.changeId) {
          throw new Error("ORDER_RETURN_INVENTORY_RESTOCK_REJECTED");
        }
        changes.push({
          orderLineId: line.orderLineId,
          status: result.status,
          changeId: result.changeId,
        });
      }
      return { changes };
    });
  }
}

function aggregateLines(
  lines: Inventory.RestockOrderReturnInventoryParams["lines"],
): Inventory.RestockOrderReturnInventoryParams["lines"] {
  const aggregated = new Map<string, (typeof lines)[number]>();
  for (const line of lines) {
    if (
      !line.orderLineId ||
      !line.variantId ||
      !line.warehouseId ||
      !Number.isSafeInteger(line.targetQuantity) ||
      line.targetQuantity <= 0 ||
      !Number.isSafeInteger(line.quantity) ||
      line.quantity <= 0
    ) {
      throw new Error("ORDER_RETURN_INVENTORY_LINE_INVALID");
    }
    const key = `${line.orderLineId}:${line.variantId}:${line.warehouseId}:${line.targetQuantity}`;
    const current = aggregated.get(key);
    aggregated.set(
      key,
      current ? { ...current, quantity: current.quantity + line.quantity } : line,
    );
  }
  return [...aggregated.values()];
}

function sourceEventId(
  params: Inventory.RestockOrderReturnInventoryParams,
  line: Inventory.RestockOrderReturnInventoryParams["lines"][number],
): string {
  const digest = createHash("sha256")
    .update(
      JSON.stringify([
        params.storeId,
        params.orderId,
        params.returnId,
        line.orderLineId,
        line.variantId,
        line.warehouseId,
        line.targetQuantity,
      ]),
    )
    .digest("hex");
  return `orders-return:${digest}`;
}
