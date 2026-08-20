import { sql } from "drizzle-orm";
import type { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../../infrastructure/db/database.js";
import type {
  AdminOrderCommandInput,
  AdminOrderCommandName,
} from "../../domain/admin/AdminOrderCommandContracts.js";
import type { MutableAdminOrderCommandResult } from "../../application/admin/AdminOrderCommandPorts.js";
import {
  operationResourceId,
  requiredPositiveInt,
  requiredString,
  requiredUuid,
} from "./AdminOrderCommandValues.js";

import { AdminOrderCoreRepository } from "./AdminOrderCoreRepository.js";
import type { OrderRow } from "./AdminOrderCoreRepository.js";
import type { AdminOrderOperationRepository } from "./AdminOrderOperationRepository.js";

export class AdminOrderIntegrationRepository extends AdminOrderCoreRepository {
  constructor(
    db: Database,
    txManager: TransactionManager<Database>,
    private readonly operations: AdminOrderOperationRepository,
  ) {
    super(db, txManager);
  }

  private async validateCancellation(
    request: AdminOrderCommandInput,
    order: OrderRow,
  ): Promise<void> {
    if (!["OPEN", "CLOSED"].includes(order.status)) throw new Error("ORDER_CANCEL_NOT_ALLOWED");
    const returns = await this.connection.execute<{ found: boolean }>(sql`
      SELECT true AS found
      FROM orders.order_return_requests
      WHERE store_id = ${request.context.storeId} AND order_id = ${order.id}
        AND status IN ('APPROVED', 'IN_TRANSIT')
      LIMIT 1 FOR UPDATE
    `);
    if (returns[0]) throw new Error("ORDER_CANCEL_RETURN_IN_PROGRESS");
    const delivered = await this.connection.execute<{ found: boolean }>(sql`
      SELECT true AS found
      FROM orders.order_shipments
      WHERE store_id = ${request.context.storeId} AND order_id = ${order.id}
        AND status = 'DELIVERED'
      LIMIT 1 FOR UPDATE
    `);
    if (delivered[0]) throw new Error("ORDER_CANCEL_DELIVERED_SHIPMENT");
  }

  public async detachIntegration(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableAdminOrderCommandResult> {
    const order = await this.lockOrder(request);
    const linkId = requiredUuid(request.input, "integrationLinkId");
    const now = new Date().toISOString();
    const detached = await this.connection.execute<{ id: string }>(sql`
      UPDATE orders.order_integration_links
      SET status = 'DISABLED', last_error_code = 'DETACHED',
          last_error_message = ${requiredString(request.input, "reason")}, updated_at = ${now}
      WHERE store_id = ${request.context.storeId} AND order_id = ${order.id} AND id = ${linkId}
      RETURNING id
    `);
    if (!detached[0]) throw new Error("ORDER_INTEGRATION_LINK_NOT_FOUND");
    const result = await this.bumpAndAudit(request, order, command, { linkId }, now);
    return { ...result, resourceId: linkId };
  }

  public async prepareOperation(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
    workflowId: string,
  ): Promise<MutableAdminOrderCommandResult> {
    const orderId = await this.operations.resolveOperationOrderId(request, command);
    const order = orderId ? await this.lockOrderById(request.context.storeId, orderId) : null;
    if (order && request.input.expectedVersion !== undefined) {
      const expectedVersion = requiredPositiveInt(request.input, "expectedVersion");
      if (order.version !== expectedVersion) throw new Error("ORDER_VERSION_CONFLICT");
    }
    if (command === "orderCancel" && order) await this.validateCancellation(request, order);
    const now = new Date().toISOString();
    const resourceId =
      command === "orderIntegrationSyncRequest" || command === "orderIntegrationSyncRetry"
        ? await this.operations.resolveIntegrationLinkId(request)
        : operationResourceId(request.input);
    const operationId = await this.operations.insertOperation(
      request,
      command,
      workflowId,
      orderId,
      resourceId,
      "RUNNING",
      now,
    );
    if (order) {
      const result = await this.bumpAndAudit(
        request,
        order,
        command,
        { operationId, input: request.input },
        now,
      );
      return { ...result, resourceId, operationId };
    }
    return { orderId: null, orderVersion: null, resourceId: null, operationId };
  }
}
