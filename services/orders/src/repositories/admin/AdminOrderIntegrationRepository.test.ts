import { describe, expect, test } from "@jest/globals";
import type {
  AdminOrderAuditEventName,
  AdminOrderCommandInput,
} from "../../domain/admin/AdminOrderCommandContracts.js";
import type { MutableAdminOrderCommandResult } from "../../application/admin/AdminOrderCommandPorts.js";
import { AdminOrderIntegrationRepository } from "./AdminOrderIntegrationRepository.js";
import type { OrderRow } from "./AdminOrderCoreRepository.js";

const orderId = "018f3f8d-0e6d-7a74-8f80-123456789abc";
const operationId = "018f3f8d-0e6d-7a74-8f80-123456789abd";
const integrationLinkId = "018f3f8d-0e6d-7a74-8f80-123456789abe";

class TestIntegrationRepository extends AdminOrderIntegrationRepository {
  auditCalls = 0;

  protected override async lockOrderById(): Promise<OrderRow> {
    return {
      id: orderId,
      version: 7,
      status: "OPEN",
      currency_code: "USD",
      total_amount: "1000",
      payment_status: "PAID",
      fulfillment_status: "UNFULFILLED",
      delivery_status: "NOT_SHIPPED",
      return_status: "NONE",
      customer_id: null,
      metadata: {},
      placed_at: null,
    };
  }

  protected override async bumpAndAudit(
    _request: AdminOrderCommandInput,
    order: OrderRow,
    _command: AdminOrderAuditEventName,
  ): Promise<MutableAdminOrderCommandResult> {
    this.auditCalls += 1;
    return {
      orderId: order.id,
      orderVersion: order.version + 1,
      resourceId: order.id,
      operationId: null,
    };
  }
}

describe("AdminOrderIntegrationRepository", () => {
  test("preparing an order-scoped async command bumps and audits its aggregate", async () => {
    const operations = {
      resolveOperationOrderId: async () => orderId,
      resolveIntegrationLinkId: async () => integrationLinkId,
      insertOperation: async () => operationId,
    };
    const repository = new TestIntegrationRepository({} as never, {} as never, operations as never);
    const request: AdminOrderCommandInput = {
      context: {
        organizationId: orderId,
        storeId: operationId,
        actor: { type: "STAFF", id: integrationLinkId },
        correlationId: orderId,
      },
      input: {
        orderId,
        integrationLinkId,

        idempotencyKey: "sync-1",
      },
    };

    await expect(
      repository.prepareOperation(request, "orderIntegrationSyncRequest", "workflow-1"),
    ).resolves.toMatchObject({
      orderId,
      orderVersion: 8,
      resourceId: integrationLinkId,
      operationId,
    });
    expect(repository.auditCalls).toBe(1);
  });
});
