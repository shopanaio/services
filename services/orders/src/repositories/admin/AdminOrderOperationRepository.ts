import { sql } from "drizzle-orm";
import type {
  AdminOrderCommandInput,
  AdminOrderCommandName,
  AdminOrderCommandResult,
} from "../../domain/admin/AdminOrderCommandContracts.js";
import {
  asRecord,
  commandResourceType,
  errorCode,
  errorMessage,
  escapeSql,
  operationResourceId,
  optionalString,
  requiredArray,
  requiredPositiveInt,
  requiredString,
  requiredUuid,
} from "./AdminOrderCommandValues.js";

import { AdminOrderCoreRepository } from "./AdminOrderCoreRepository.js";
import { operationKinds } from "./AdminOrderOperationKinds.js";

export class AdminOrderOperationRepository extends AdminOrderCoreRepository {
  async insertOperation(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
    workflowId: string,
    orderId: string | null,
    resourceId: string | null,
    status: "RUNNING" | "SUCCEEDED",
    now: string,
  ): Promise<string> {
    const operationId = await this.generateUuidV7();
    await this.connection.execute(sql`
      INSERT INTO orders.order_operations (
        id, store_id, order_id, kind, status, resource_type, resource_id,
        workflow_id, idempotency_key, progress_current, progress_total,
        started_at, completed_at, created_at, updated_at
      ) VALUES (
        ${operationId}, ${request.context.storeId}, ${orderId},
        ${operationKinds[command] ?? "BULK_ACTION"}::orders.order_operation_kind, ${status},
        ${resourceId ? commandResourceType(command) : null}, ${resourceId}, ${workflowId},
        ${requiredString(request.input, "idempotencyKey")}, ${status === "SUCCEEDED" ? 1 : 0}, 1,
        ${now}, ${status === "SUCCEEDED" ? now : null}, ${now}, ${now}
      )
    `);
    return operationId;
  }

  async updateOperationProgress(
    storeId: string,
    operationId: string,
    current: number,
    total: number,
  ): Promise<void> {
    await this.connection.execute(sql`
      UPDATE orders.order_operations
      SET progress_current = ${current}, progress_total = ${total}
      WHERE store_id = ${storeId} AND id = ${operationId} AND status = 'RUNNING'
    `);
  }

  async completeOperation(
    command: AdminOrderCommandName,
    request: AdminOrderCommandInput,
    result: AdminOrderCommandResult,
    succeeded: boolean,
    error?: unknown,
  ): Promise<number | null> {
    const operationId = result.operationId;
    if (!operationId) throw new Error("ORDER_OPERATION_ID_REQUIRED");
    const now = new Date().toISOString();
    const finalOrderVersion =
      succeeded && result.orderId
        ? await this.finalizeDomainOperation(command, request, result.orderId, now)
        : result.orderVersion;
    if (
      !succeeded &&
      (command === "orderIntegrationSyncRequest" || command === "orderIntegrationSyncRetry")
    ) {
      const linkId = await this.resolveIntegrationLinkId(request);
      await this.connection.execute(sql`
        UPDATE orders.order_integration_links
        SET status = 'FAILED', last_error_code = ${errorCode(error)},
          last_error_message = ${errorMessage(error)}, updated_at = ${now}
        WHERE store_id = ${request.context.storeId} AND id = ${linkId}
      `);
    }
    await this.connection.execute(sql`
      UPDATE orders.order_operations
      SET status = ${succeeded ? "SUCCEEDED" : "FAILED"}::orders.order_operation_status,
          progress_current = CASE WHEN ${succeeded} THEN COALESCE(progress_total, 1) ELSE progress_current END,
          failure_code = ${succeeded ? null : errorCode(error)},
          failure_message = ${succeeded ? null : errorMessage(error)}, completed_at = ${now}
      WHERE store_id = ${request.context.storeId} AND id = ${operationId}
        AND status IN ('PENDING', 'RUNNING')
    `);
    if (succeeded && finalOrderVersion !== null) {
      await this.connection.execute(sql`
        UPDATE orders.idempotency_records
        SET response = jsonb_set(response, '{orderVersion}', to_jsonb(${finalOrderVersion}::integer))
        WHERE store_id = ${request.context.storeId} AND operation = ${`admin.${command}`}
          AND idempotency_key = ${requiredString(request.input, "idempotencyKey")}
          AND status = 'COMPLETED'
      `);
    }
    return finalOrderVersion;
  }

  protected async finalizeDomainOperation(
    command: AdminOrderCommandName,
    request: AdminOrderCommandInput,
    orderId: string,
    now: string,
  ): Promise<number> {
    const order = await this.lockOrderById(request.context.storeId, orderId);
    let changed = false;
    if (command === "orderCancel") {
      if (order.status === "CANCELLED") return order.version;
      if (order.status === "DRAFT") throw new Error("DRAFT_ORDER_CANCEL_NOT_ALLOWED");
      await this.connection.execute(sql`
        INSERT INTO orders.order_cancellations (
          store_id, order_id, reason, note, cancelled_by_type, cancelled_by_id,
          idempotency_key, metadata, cancelled_at
        ) VALUES (
          ${request.context.storeId}, ${order.id},
          ${requiredString(request.input, "reasonCode")}::orders.order_cancellation_reason,
          ${optionalString(request.input.staffNote)}, ${request.context.actor.type},
          ${request.context.actor.id}, ${requiredString(request.input, "idempotencyKey")},
          ${JSON.stringify({
            notifyCustomer: request.input.notifyCustomer === true,
            restock: request.input.restock !== false,
            refundMode: optionalString(request.input.refundMode),
          })}::jsonb, ${now}
        )
      `);
      await this.connection.execute(sql`
        UPDATE orders.orders
        SET status = 'CANCELLED', fulfillment_status = 'CANCELLED',
          delivery_status = CASE WHEN delivery_status = 'DELIVERED' THEN delivery_status ELSE 'CANCELLED' END,
          cancelled_at = ${now}, closed_at = COALESCE(closed_at, ${now}), updated_at = ${now}
        WHERE store_id = ${request.context.storeId} AND id = ${order.id}
      `);
      await this.connection.execute(sql`
        UPDATE orders.order_fulfillments
        SET status = 'CANCELLED', cancelled_at = COALESCE(cancelled_at, ${now}), updated_at = ${now}
        WHERE store_id = ${request.context.storeId} AND order_id = ${order.id}
          AND external_source IS NULL AND status IN ('PENDING', 'SUCCESS')
      `);
      await this.connection.execute(sql`
        UPDATE orders.order_fulfillment_orders
        SET status = 'CANCELLED', closed_at = COALESCE(closed_at, ${now}),
          version = version + 1, updated_at = ${now}
        WHERE store_id = ${request.context.storeId} AND order_id = ${order.id}
          AND external_source IS NULL AND status <> 'CANCELLED'
      `);
      changed = true;
    } else if (
      command === "fulfillmentOrderSubmit" ||
      command === "fulfillmentOrderCancelRequest"
    ) {
      const fulfillmentOrderId = requiredUuid(request.input, "fulfillmentOrderId");
      const updated = await this.connection.execute<{ id: string }>(sql`
        UPDATE orders.order_fulfillment_orders
        SET request_status = ${
          command === "fulfillmentOrderSubmit" ? "SUBMITTED" : "CANCELLATION_REQUESTED"
        }::orders.order_fulfillment_request_status,
          version = version + 1, updated_at = ${now}
        WHERE store_id = ${request.context.storeId} AND order_id = ${order.id}
          AND id = ${fulfillmentOrderId}
        RETURNING id
      `);
      if (!updated[0]) throw new Error("FULFILLMENT_ORDER_NOT_FOUND");
      changed = true;
    } else if (command === "fulfillmentCancel") {
      const fulfillmentId = requiredUuid(request.input, "fulfillmentId");
      const updated = await this.connection.execute<{ id: string }>(sql`
        UPDATE orders.order_fulfillments
        SET status = 'CANCELLED', cancelled_at = ${now}, updated_at = ${now}
        WHERE store_id = ${request.context.storeId} AND order_id = ${order.id}
          AND id = ${fulfillmentId} AND status <> 'CANCELLED'
        RETURNING id
      `);
      if (!updated[0]) throw new Error("FULFILLMENT_CANCEL_NOT_ALLOWED");
      changed = true;
    } else if (command === "orderReturnReceive") {
      const returnId = requiredUuid(request.input, "returnId");
      for (const rawLine of requiredArray(request.input, "lines")) {
        const line = asRecord(rawLine);
        const received = requiredPositiveInt(line, "receivedQuantity");
        const restockable = Number(line.restockableQuantity ?? 0);
        const damaged = Number(line.damagedQuantity ?? 0);
        if (restockable < 0 || damaged < 0 || restockable + damaged !== received) {
          throw new Error("RETURN_RECEIVE_QUANTITY_INVALID");
        }
        const current = await this.connection.execute<{
          received: number;
          approved: number;
        }>(sql`
          SELECT received_quantity AS received, approved_quantity AS approved
          FROM orders.order_return_request_lines
          WHERE store_id = ${request.context.storeId} AND order_id = ${order.id}
            AND return_request_id = ${returnId}
            AND order_line_id = ${requiredUuid(line, "orderLineId")}
          FOR UPDATE
        `);
        if (!current[0] || received < current[0].received || received > current[0].approved) {
          throw new Error("RETURN_RECEIVE_QUANTITY_INVALID");
        }
        const updated = await this.connection.execute<{ id: string }>(sql`
          UPDATE orders.order_return_request_lines
          SET received_quantity = ${received}, restockable_quantity = ${restockable},
            damaged_quantity = ${damaged}, disposition = CASE
              WHEN ${damaged} > 0 AND ${restockable} > 0 THEN 'PENDING'
              WHEN ${damaged} > 0 THEN 'DISPOSE'
              ELSE 'RESTOCK'
            END::orders.order_return_disposition
          WHERE store_id = ${request.context.storeId} AND order_id = ${order.id}
            AND return_request_id = ${returnId}
            AND order_line_id = ${requiredUuid(line, "orderLineId")}
            AND approved_quantity >= ${received} AND received_quantity <= ${received}
          RETURNING id
        `);
        if (!updated[0]) throw new Error("RETURN_RECEIVE_LINE_INVALID");
      }
      const completion = await this.connection.execute<{ complete: boolean }>(sql`
        SELECT bool_and(received_quantity = approved_quantity) AS complete
        FROM orders.order_return_request_lines
        WHERE store_id = ${request.context.storeId} AND order_id = ${order.id}
          AND return_request_id = ${returnId}
      `);
      const requestComplete = completion[0]?.complete === true;
      await this.connection.execute(sql`
        UPDATE orders.order_return_requests
        SET status = ${requestComplete ? "RECEIVED" : "IN_TRANSIT"}::orders.order_return_request_status,
          version = version + 1, resolved_at = CASE WHEN ${requestComplete} THEN ${now}::timestamptz ELSE NULL END,
          resolved_by_type = ${request.context.actor.type}, resolved_by_id = ${request.context.actor.id},
          updated_at = ${now}
        WHERE store_id = ${request.context.storeId} AND order_id = ${order.id} AND id = ${returnId}
      `);
      const aggregate = await this.connection.execute<{ complete: boolean }>(sql`
        SELECT bool_and(line.received_quantity = line.approved_quantity) AS complete
        FROM orders.order_return_request_lines line
        JOIN orders.order_return_requests request
          ON request.store_id = line.store_id AND request.id = line.return_request_id
        WHERE line.store_id = ${request.context.storeId} AND line.order_id = ${order.id}
          AND request.status NOT IN ('REJECTED', 'CANCELLED')
      `);
      await this.connection.execute(sql`
        UPDATE orders.orders
        SET return_status = ${aggregate[0]?.complete === true ? "RETURNED" : "PARTIALLY_RETURNED"}::orders.order_return_status,
          updated_at = ${now}
        WHERE store_id = ${request.context.storeId} AND id = ${order.id}
      `);
      changed = true;
    }
    if (changed) {
      const fresh = await this.lockOrderById(request.context.storeId, order.id);
      const completionRequest: AdminOrderCommandInput = {
        ...request,
        input: {
          ...request.input,
          idempotencyKey: `${requiredString(request.input, "idempotencyKey")}:completed`,
        },
      };
      const completed = await this.bumpAndAudit(
        completionRequest,
        fresh,
        `${command}.completed` as AdminOrderCommandName,
        { operationCompleted: true },
        now,
      );
      return completed.orderVersion!;
    }
    return order.version;
  }

  async resolveOperationOrderId(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<string | null> {
    if (request.input.orderId) return requiredUuid(request.input, "orderId");
    if (request.input.id && command === "orderCancel") return requiredUuid(request.input, "id");
    const resource = operationResourceId(request.input);
    if (!resource) return null;
    const table = command.startsWith("shipment")
      ? "order_shipments"
      : command.startsWith("fulfillmentOrder")
        ? "order_fulfillment_orders"
        : command === "fulfillmentCancel"
          ? "order_fulfillments"
          : command === "orderReturnReceive"
            ? "order_return_requests"
            : null;
    if (!table) return null;
    const rows = await this.connection.execute<{ orderId: string }>(
      sql.raw(
        `SELECT order_id AS "orderId" FROM orders.${table} WHERE store_id = '${escapeSql(request.context.storeId)}'::uuid AND id = '${escapeSql(resource)}'::uuid LIMIT 1 FOR UPDATE`,
      ),
    );
    if (!rows[0]) throw new Error("ORDER_OPERATION_RESOURCE_NOT_FOUND");
    return rows[0].orderId;
  }

  async resolveIntegrationLinkId(request: AdminOrderCommandInput): Promise<string> {
    if (request.input.integrationLinkId) return requiredUuid(request.input, "integrationLinkId");
    const operationId = requiredUuid(request.input, "operationId");
    const rows = await this.connection.execute<{ id: string | null }>(sql`
      SELECT resource_id AS id
      FROM orders.order_operations
      WHERE store_id = ${request.context.storeId} AND id = ${operationId}
        AND kind = 'INTEGRATION_SYNC'
      LIMIT 1 FOR UPDATE
    `);
    if (!rows[0]?.id) throw new Error("ORDER_INTEGRATION_OPERATION_NOT_FOUND");
    return rows[0].id;
  }

  public async findReplay(
    storeId: string,
    command: AdminOrderCommandName,
    idempotencyKey: string,
  ): Promise<{ requestHash: string; response: AdminOrderCommandResult } | null> {
    const rows = await this.connection.execute<{
      requestHash: string;
      response: AdminOrderCommandResult;
    }>(sql`
      SELECT request_hash AS "requestHash", response
      FROM orders.idempotency_records
      WHERE store_id = ${storeId} AND operation = ${`admin.${command}`}
        AND idempotency_key = ${idempotencyKey} AND status = 'COMPLETED'
      FOR UPDATE
    `);
    return rows[0] ?? null;
  }

  public async saveReplay(
    storeId: string,
    command: AdminOrderCommandName,
    idempotencyKey: string,
    requestHash: string,
    response: AdminOrderCommandResult,
    orderId: string | null,
  ): Promise<void> {
    await this.connection.execute(sql`
      INSERT INTO orders.idempotency_records (
        store_id, operation, idempotency_key, request_hash, status, resource_type,
        resource_id, response_status, response, expires_at
      ) VALUES (
        ${storeId}, ${`admin.${command}`}, ${idempotencyKey}, ${requestHash}, 'COMPLETED',
        ${orderId ? "Order" : null}, ${orderId}, 200, ${JSON.stringify(response)}::jsonb,
        now() + interval '24 hours'
      )
    `);
  }
}
