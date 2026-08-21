import { sql } from "drizzle-orm";
import type { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../../infrastructure/db/database.js";
import type {
  AdminOrderCommandInput,
  AdminOrderCommandName,
} from "../../domain/admin/AdminOrderCommandContracts.js";
import type { MutableAdminOrderCommandResult } from "../../application/admin/AdminOrderCommandPorts.js";
import {
  asRecord,
  moneyMinor,
  optionalPositiveInt,
  optionalString,
  requiredPositiveInt,
  requiredString,
  requiredUuid,
} from "./AdminOrderCommandValues.js";

import { AdminOrderCoreRepository } from "./AdminOrderCoreRepository.js";
import type { AdminOrderOperationRepository } from "./AdminOrderOperationRepository.js";

export class AdminOrderEditRepository extends AdminOrderCoreRepository {
  constructor(
    db: Database,
    txManager: TransactionManager<Database>,
    private readonly operations: AdminOrderOperationRepository,
  ) {
    super(db, txManager);
  }

  public async beginEdit(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableAdminOrderCommandResult> {
    const order = await this.lockOrder(request, ["OPEN"]);
    const editId = await this.generateUuidV7();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1_000).toISOString();
    await this.connection.execute(sql`
      INSERT INTO orders.order_edit_sessions (
        id, store_id, order_id, base_order_version, version, status, currency_code,
        subtotal_amount, discount_amount, shipping_amount, tax_amount, duty_amount,
        adjustment_amount, total_amount, created_by_type, created_by_id, expires_at,
        created_at, updated_at
      ) SELECT ${editId}, store_id, id, version, 1, 'ACTIVE', currency_code,
        subtotal_amount, discount_amount, shipping_amount, tax_amount, duty_amount,
        adjustment_amount, total_amount, ${request.context.actor.type}, ${request.context.actor.id},
        ${expiresAt}, ${now}, ${now}
      FROM orders.orders
      WHERE store_id = ${request.context.storeId} AND id = ${order.id}
    `);
    await this.insertEventOnly(request, order, command, { editId }, now);
    return {
      orderId: order.id,
      orderVersion: order.version,
      resourceId: editId,
      operationId: null,
    };
  }

  public async appendEditChange(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableAdminOrderCommandResult> {
    const edit = await this.lockEdit(request);
    const nextEditVersion = edit.version + 1;
    const now = new Date().toISOString();
    const changeId = await this.generateUuidV7();
    await this.connection.execute(sql`
      INSERT INTO orders.order_edit_changes (
        id, store_id, order_id, edit_session_id, sequence, change_type, payload, created_at
      ) VALUES (
        ${changeId}, ${request.context.storeId}, ${edit.orderId}, ${edit.id},
        ${nextEditVersion - 1}, ${command},
        ${JSON.stringify({ ...request.input, changeId })}::jsonb, ${now}
      )
    `);
    await this.connection.execute(sql`
      UPDATE orders.order_edit_sessions
      SET version = ${nextEditVersion}, updated_at = ${now}
      WHERE store_id = ${request.context.storeId} AND id = ${edit.id}
    `);
    await this.refreshEditPreview(
      request.context.storeId,
      edit.id,
      edit.orderId,
      edit.currencyCode,
    );
    await this.insertEventOnly(
      request,
      {
        id: edit.orderId,
        version: edit.orderVersion,
        status: "OPEN",
        currency_code: edit.currencyCode,
        total_amount: "0",
        payment_status: "PENDING",
        fulfillment_status: "UNFULFILLED",
        delivery_status: "NOT_SHIPPED",
        return_status: "NONE",
        customer_id: null,
        metadata: {},
        placed_at: null,
      },
      command,
      { editId: edit.id, editVersion: nextEditVersion, changeId },
      now,
    );
    return {
      orderId: edit.orderId,
      orderVersion: edit.orderVersion,
      resourceId: edit.id,
      operationId: null,
    };
  }

  public async commitEdit(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
    workflowId: string,
  ): Promise<MutableAdminOrderCommandResult> {
    const edit = await this.lockEdit(request);
    const expectedOrderVersion = requiredPositiveInt(request.input, "expectedOrderVersion");
    if (edit.orderVersion !== expectedOrderVersion) throw new Error("ORDER_VERSION_CONFLICT");
    const changes = await this.connection.execute<{
      change_type: string;
      payload: Record<string, unknown>;
    }>(sql`
      SELECT change_type, payload
      FROM orders.order_edit_changes
      WHERE store_id = ${request.context.storeId} AND edit_session_id = ${edit.id}
      ORDER BY sequence
    `);
    const now = new Date().toISOString();
    for (const change of changes) {
      const payload = asRecord(change.payload);
      if (change.change_type === "orderEditLineAdd") {
        await this.insertLine(
          request.context.storeId,
          edit.orderId,
          asRecord(payload.line),
          edit.currencyCode,
          now,
        );
      } else if (change.change_type === "orderEditLineUpdate") {
        const lineId = requiredUuid(payload, "lineId");
        const quantity = optionalPositiveInt(payload.quantity, "quantity");
        await this.assertLineEditable(request.context.storeId, edit.orderId, lineId, quantity);
        const unitPrice = payload.unitPrice
          ? moneyMinor(asRecord(payload.unitPrice), edit.currencyCode)
          : null;
        const updated = await this.connection.execute<{ id: string }>(sql`
          UPDATE orders.order_lines
          SET quantity = COALESCE(${quantity}, quantity),
              unit_price_amount = COALESCE(${unitPrice}, unit_price_amount),
              subtotal_amount = COALESCE(${unitPrice}, unit_price_amount) * COALESCE(${quantity}, quantity),
              total_amount = COALESCE(${unitPrice}, unit_price_amount) * COALESCE(${quantity}, quantity)
                - discount_amount + tax_amount + duty_amount,
              updated_at = ${now}
          WHERE store_id = ${request.context.storeId} AND order_id = ${edit.orderId} AND id = ${lineId}
          RETURNING id
        `);
        if (!updated[0]) throw new Error("ORDER_LINE_NOT_FOUND");
      } else if (change.change_type === "orderEditLineRemove") {
        const lineId = requiredUuid(payload, "lineId");
        await this.assertLineEditable(request.context.storeId, edit.orderId, lineId, 0);
        const removed = await this.connection.execute<{ id: string }>(sql`
          DELETE FROM orders.order_lines
          WHERE store_id = ${request.context.storeId} AND order_id = ${edit.orderId}
            AND id = ${lineId}
          RETURNING id
        `);
        if (!removed[0]) throw new Error("ORDER_LINE_NOT_FOUND");
      } else if (change.change_type === "orderEditShippingUpdate") {
        const shipping = asRecord(payload.shipping);
        const methodCode = optionalString(shipping.methodCode);
        if (methodCode) {
          await this.connection.execute(sql`
            UPDATE orders.order_delivery_methods
            SET is_selected = false, updated_at = ${now}
            WHERE store_id = ${request.context.storeId} AND order_id = ${edit.orderId}
          `);
          const selected = await this.connection.execute<{ id: string }>(sql`
            UPDATE orders.order_delivery_methods
            SET is_selected = true, updated_at = ${now}
            WHERE store_id = ${request.context.storeId} AND order_id = ${edit.orderId}
              AND code = ${methodCode}
            RETURNING id
          `);
          if (!selected[0]) throw new Error("ORDER_DELIVERY_METHOD_NOT_FOUND");
        }
        await this.connection.execute(sql`
          UPDATE orders.order_delivery_groups
          SET metadata = jsonb_set(metadata, '{editShipping}', ${JSON.stringify(shipping)}::jsonb, true),
            updated_at = ${now}
          WHERE store_id = ${request.context.storeId} AND order_id = ${edit.orderId}
        `);
      } else if (change.change_type === "orderEditDiscountAdd") {
        const amount = moneyMinor(asRecord(payload.amount), edit.currencyCode);
        if (amount <= 0n) throw new Error("ORDER_EDIT_DISCOUNT_INVALID");
        await this.connection.execute(sql`
          INSERT INTO orders.order_adjustments (
            store_id, order_id, type, amount, reason, source, source_reference, metadata
          ) VALUES (
            ${request.context.storeId}, ${edit.orderId}, 'CREDIT', ${-amount},
            ${requiredString(payload, "reasonCode")}, 'ORDER_EDIT',
            ${requiredUuid(payload, "changeId")},
            ${JSON.stringify({ title: requiredString(payload, "title"), editId: edit.id })}::jsonb
          )
        `);
      } else if (change.change_type === "orderEditDiscountRemove") {
        const discountId = requiredUuid(payload, "discountId");
        await this.connection.execute(sql`
          UPDATE orders.order_lines line
          SET discount_amount = GREATEST(0, line.discount_amount - allocation.amount),
            total_amount = line.subtotal_amount
              - GREATEST(0, line.discount_amount - allocation.amount)
              + line.tax_amount + line.duty_amount,
            updated_at = ${now}
          FROM orders.order_line_discount_allocations allocation
          WHERE allocation.store_id = line.store_id AND allocation.order_id = line.order_id
            AND allocation.order_line_id = line.id
            AND allocation.store_id = ${request.context.storeId}
            AND allocation.order_id = ${edit.orderId}
            AND allocation.discount_application_id = ${discountId}
        `);
        await this.connection.execute(sql`
          DELETE FROM orders.order_line_discount_allocations
          WHERE store_id = ${request.context.storeId} AND order_id = ${edit.orderId}
            AND discount_application_id = ${discountId}
        `);
        await this.connection.execute(sql`
          DELETE FROM orders.order_delivery_discount_allocations
          WHERE store_id = ${request.context.storeId} AND order_id = ${edit.orderId}
            AND discount_application_id = ${discountId}
        `);
        const removed = await this.connection.execute<{ id: string }>(sql`
          DELETE FROM orders.order_discount_applications
          WHERE store_id = ${request.context.storeId} AND order_id = ${edit.orderId}
            AND id = ${discountId}
          RETURNING id
        `);
        if (!removed[0]) throw new Error("ORDER_DISCOUNT_NOT_FOUND");
      }
    }
    await this.recalculateOrder(request.context.storeId, edit.orderId, now);
    await this.connection.execute(sql`
      UPDATE orders.order_edit_sessions
      SET status = 'COMMITTED', committed_at = ${now}, updated_at = ${now}
      WHERE store_id = ${request.context.storeId} AND id = ${edit.id}
    `);
    const order = await this.lockOrderById(request.context.storeId, edit.orderId);
    const operationId = await this.operations.insertOperation(
      request,
      command,
      workflowId,
      edit.orderId,
      edit.id,
      "SUCCEEDED",
      now,
    );
    const result = await this.bumpAndAudit(
      request,
      order,
      command,
      { editId: edit.id, changes: changes.length },
      now,
    );
    return { ...result, resourceId: edit.id, operationId };
  }

  public async abandonEdit(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableAdminOrderCommandResult> {
    const edit = await this.lockEdit(request);
    const now = new Date().toISOString();
    await this.connection.execute(sql`
      UPDATE orders.order_edit_sessions
      SET status = 'ABORTED', aborted_at = ${now}, updated_at = ${now}
      WHERE store_id = ${request.context.storeId} AND id = ${edit.id}
    `);
    const order = await this.lockOrderById(request.context.storeId, edit.orderId);
    await this.insertEventOnly(request, order, command, { editId: edit.id }, now);
    return {
      orderId: edit.orderId,
      orderVersion: edit.orderVersion,
      resourceId: edit.id,
      operationId: null,
    };
  }
}
