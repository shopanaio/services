import { sql } from "drizzle-orm";
import type { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../../infrastructure/db/database.js";
import type {
  AdminOrderCommandInput,
  AdminOrderCommandName,
} from "../../domain/admin/AdminOrderCommandContracts.js";
import type { MutableAdminOrderCommandResult } from "../../application/admin/AdminOrderCommandPorts.js";
import type { OrderRow } from "./AdminOrderCoreRepository.js";
import {
  asRecord,
  jsonObject,
  lineTotals,
  moneyMinor,
  optionalPositiveInt,
  optionalString,
  optionalUuid,
  requiredArray,
  requiredCurrency,
  requiredString,
  requiredUuid,
} from "./AdminOrderCommandValues.js";

import { AdminOrderCoreRepository } from "./AdminOrderCoreRepository.js";
import type { OrderNumberRepository } from "../order-number/OrderNumberRepository.js";
export class AdminOrderDraftRepository extends AdminOrderCoreRepository {
  constructor(
    db: Database,
    txManager: TransactionManager<Database>,
    private readonly orderNumbers: OrderNumberRepository,
  ) {
    super(db, txManager);
  }

  public async createDraft(
    request: AdminOrderCommandInput,
  ): Promise<MutableAdminOrderCommandResult> {
    const input = request.input;
    const lines = requiredArray(input, "lines").map(asRecord);
    if (lines.length === 0) throw new Error("ORDER_LINES_REQUIRED");
    const firstMoney = asRecord(lines[0]!.unitPrice);
    const currencyCode = requiredCurrency(firstMoney, "currencyCode");
    const orderId = await this.generateUuidV7();
    const orderNumber = await this.orderNumbers.reserve(request.context.storeId);
    const totals = lineTotals(lines, currencyCode);
    const now = new Date().toISOString();
    const customerId = optionalUuid(input.customerId, "customerId");
    await this.connection.execute(sql`
      INSERT INTO orders.orders (
        id, store_id, order_number, version, status, payment_status,
        fulfillment_status, delivery_status, return_status, risk_level,
        origin, customer_id, created_by_type, created_by_id, sales_channel,
        external_source, external_id, locale_code, currency_code,
        subtotal_amount, discount_amount, shipping_amount, tax_amount, duty_amount,
        adjustment_amount, total_amount, checkout_snapshot, metadata, created_at, updated_at
      ) VALUES (
        ${orderId}, ${request.context.storeId}, ${orderNumber}, 1, 'DRAFT',
        ${totals.total === 0n ? "NOT_REQUIRED" : "PENDING"}, 'UNFULFILLED', 'NOT_SHIPPED',
        'NONE', 'NONE', 'ADMIN', ${customerId}, ${request.context.actor.type},
        ${request.context.actor.id}, NULL, ${optionalString(input.sourceCode)},
        ${optionalString(input.externalId)}, ${optionalString(input.localeCode)}, ${currencyCode},
        ${totals.subtotal}, 0, 0, 0, 0, 0, ${totals.total}, '{}'::jsonb,
        ${JSON.stringify({
          customFields: jsonObject(input.customFields),
          paymentMethodCode: optionalString(input.paymentMethodCode),
        })}::jsonb, ${now}, ${now}
      )
    `);
    for (const line of lines)
      await this.insertLine(request.context.storeId, orderId, line, currencyCode, now);
    if (input.contact) {
      await this.upsertContact(
        request,
        orderId,
        { ...asRecord(input.contact), note: input.customerNote ?? asRecord(input.contact).note },
        now,
      );
    }
    if (input.billingAddress) {
      await this.upsertAddress(
        request.context.storeId,
        orderId,
        "BILLING",
        asRecord(input.billingAddress),
        now,
      );
    }
    if (input.shipping) {
      await this.syncDraftDelivery(
        request.context.storeId,
        orderId,
        currencyCode,
        asRecord(input.shipping),
        now,
      );
    }
    if (Array.isArray(input.tags)) await this.replaceTags(request, orderId, input.tags, now);
    if (typeof input.adminNote === "string" && input.adminNote.trim()) {
      await this.writeAdminNote(request, orderId, input.adminNote, now);
    }
    await this.insertAudit(request, orderId, 1, "order.created", input, now);
    return { orderId, orderVersion: 1, resourceId: orderId, operationId: null };
  }

  public async updateDraftDetails(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableAdminOrderCommandResult> {
    const order = await this.lockOrder(request, ["DRAFT"]);
    const input = request.input;
    const now = new Date().toISOString();
    if (input.contact) await this.upsertContact(request, order.id, asRecord(input.contact), now);
    if (input.customerNote !== undefined) {
      await this.connection.execute(sql`
        UPDATE orders.order_contacts SET customer_note = ${optionalString(input.customerNote)},
          updated_at = ${now}
        WHERE store_id = ${request.context.storeId} AND order_id = ${order.id}
      `);
    }
    if (input.billingAddress) {
      await this.upsertAddress(
        request.context.storeId,
        order.id,
        "BILLING",
        asRecord(input.billingAddress),
        now,
      );
    }
    if (input.shipping) {
      await this.syncDraftDelivery(
        request.context.storeId,
        order.id,
        order.currency_code,
        asRecord(input.shipping),
        now,
      );
    }
    await this.connection.execute(sql`
      UPDATE orders.orders
      SET locale_code = COALESCE(${optionalString(input.localeCode)}, locale_code), updated_at = ${now}
      WHERE store_id = ${request.context.storeId} AND id = ${order.id}
    `);
    return this.bumpAndAudit(request, order, command, input, now);
  }

  public async deleteDraft(
    request: AdminOrderCommandInput,
  ): Promise<MutableAdminOrderCommandResult> {
    const order = await this.lockOrder(request, ["DRAFT"]);
    await this.connection.execute(sql`SELECT set_config('orders.allow_draft_delete', 'on', true)`);
    await this.connection.execute(sql`
      SELECT orders.delete_draft_order(${request.context.storeId}::uuid, ${order.id}::uuid)
    `);
    return {
      orderId: order.id,
      orderVersion: order.version,
      resourceId: order.id,
      operationId: null,
      deleted: true,
    };
  }

  public async transition(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
    allowed: OrderRow["status"][],
    status: OrderRow["status"],
    timestamps: { placedAt?: boolean; closedAt?: boolean; clearClosedAt?: boolean },
  ): Promise<MutableAdminOrderCommandResult> {
    const order = await this.lockOrder(request, allowed);
    const now = new Date().toISOString();
    await this.connection.execute(sql`
      UPDATE orders.orders
      SET status = ${status}::orders.order_status,
          placed_at = CASE WHEN ${timestamps.placedAt ?? false} THEN ${now}::timestamptz ELSE placed_at END,
          closed_at = CASE
            WHEN ${timestamps.closedAt ?? false} THEN ${now}::timestamptz
            WHEN ${timestamps.clearClosedAt ?? false} THEN NULL
            ELSE closed_at
          END,
          updated_at = ${now}
      WHERE store_id = ${request.context.storeId} AND id = ${order.id}
    `);
    return this.bumpAndAudit(request, order, command, request.input, now);
  }

  public async completeDraft(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableAdminOrderCommandResult> {
    const order = await this.lockOrder(request, ["DRAFT"]);
    const lines = await this.connection.execute<{ count: number }>(sql`
      SELECT count(*)::integer AS count
      FROM orders.order_lines
      WHERE store_id = ${request.context.storeId} AND order_id = ${order.id}
    `);
    if ((lines[0]?.count ?? 0) === 0) throw new Error("ORDER_LINES_REQUIRED");
    const contacts = await this.connection.execute<{ count: number }>(sql`
      SELECT count(*)::integer AS count FROM orders.order_contacts
      WHERE store_id = ${request.context.storeId} AND order_id = ${order.id}
        AND redacted_at IS NULL
    `);
    if ((contacts[0]?.count ?? 0) === 0) throw new Error("ORDER_CONTACT_REQUIRED");
    const now = new Date().toISOString();
    await this.connection.execute(sql`
      UPDATE orders.orders
      SET status = 'OPEN', placed_at = ${now}, updated_at = ${now}
      WHERE store_id = ${request.context.storeId} AND id = ${order.id}
    `);
    return this.bumpAndAudit(request, order, command, request.input, now);
  }

  public async archive(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
    archived: boolean,
  ): Promise<MutableAdminOrderCommandResult> {
    const order = await this.lockOrder(request);
    const now = new Date().toISOString();
    await this.connection.execute(sql`
      UPDATE orders.orders SET archived_at = ${archived ? now : null}, updated_at = ${now}
      WHERE store_id = ${request.context.storeId} AND id = ${order.id}
    `);
    return this.bumpAndAudit(request, order, command, request.input, now);
  }

  public async setCustomer(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableAdminOrderCommandResult> {
    const order = await this.lockOrder(request);
    const now = new Date().toISOString();
    await this.connection.execute(sql`
      UPDATE orders.orders SET customer_id = ${optionalUuid(request.input.customerId, "customerId")}, updated_at = ${now}
      WHERE store_id = ${request.context.storeId} AND id = ${order.id}
    `);
    if (request.input.contact !== undefined) {
      await this.upsertContact(request, order.id, asRecord(request.input.contact), now);
    }
    return this.bumpAndAudit(request, order, command, request.input, now);
  }

  public async updateTags(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableAdminOrderCommandResult> {
    const order = await this.lockOrder(request);
    const tags = requiredArray(request.input, "tags");
    const now = new Date().toISOString();
    await this.replaceTags(request, order.id, tags, now);
    return this.bumpAndAudit(request, order, command, { tags }, now);
  }

  public async updateAdminNote(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableAdminOrderCommandResult> {
    const order = await this.lockOrder(request);
    const now = new Date().toISOString();
    const note = optionalString(request.input.adminNote);
    if (note) await this.writeAdminNote(request, order.id, note, now);
    else {
      await this.connection.execute(sql`
        DELETE FROM orders.order_admin_notes
        WHERE store_id = ${request.context.storeId} AND order_id = ${order.id}
      `);
    }
    return this.bumpAndAudit(request, order, command, { adminNote: note }, now);
  }

  public async addComment(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableAdminOrderCommandResult> {
    const order = await this.lockOrder(request);
    const activityId = await this.generateUuidV7();
    const now = new Date().toISOString();
    const result = await this.bumpAndAudit(
      request,
      order,
      command,
      {
        comment: requiredString(request.input, "comment"),
        visibility: optionalString(request.input.visibility) ?? "STAFF",
        activityId,
      },
      now,
      activityId,
    );
    return { ...result, resourceId: activityId };
  }

  public async updateCustomFields(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableAdminOrderCommandResult> {
    const order = await this.lockOrder(request);
    const now = new Date().toISOString();
    const customFields = jsonObject(request.input.customFields);
    await this.connection.execute(sql`
      UPDATE orders.orders
      SET metadata = jsonb_set(metadata, '{customFields}', ${JSON.stringify(customFields)}::jsonb, true),
          updated_at = ${now}
      WHERE store_id = ${request.context.storeId} AND id = ${order.id}
    `);
    return this.bumpAndAudit(request, order, command, { customFields }, now);
  }

  public async addDraftLine(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableAdminOrderCommandResult> {
    const order = await this.lockOrder(request, ["DRAFT"]);
    const line = asRecord(request.input.line);
    const now = new Date().toISOString();
    const lineId = await this.insertLine(
      request.context.storeId,
      order.id,
      line,
      order.currency_code,
      now,
    );
    await this.refreshDraftDeliveryGroup(request.context.storeId, order.id, now);
    await this.recalculateOrder(request.context.storeId, order.id, now);
    const result = await this.bumpAndAudit(request, order, command, { lineId, line }, now);
    return { ...result, resourceId: lineId };
  }

  public async updateDraftLine(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableAdminOrderCommandResult> {
    const order = await this.lockOrder(request, ["DRAFT"]);
    const lineId = requiredUuid(request.input, "lineId");
    const quantity = optionalPositiveInt(request.input.quantity, "quantity");
    const unitCost = request.input.unitCost
      ? moneyMinor(asRecord(request.input.unitCost), order.currency_code)
      : null;
    const now = new Date().toISOString();
    const changed = await this.connection.execute<{ id: string }>(sql`
      UPDATE orders.order_lines
      SET quantity = COALESCE(${quantity}, quantity),
          subtotal_amount = unit_price_amount * COALESCE(${quantity}, quantity),
          total_amount = unit_price_amount * COALESCE(${quantity}, quantity)
            - discount_amount + tax_amount + duty_amount,
          metadata = CASE
            WHEN ${request.input.customFields !== undefined} OR ${request.input.weight !== undefined}
              OR ${unitCost}::bigint IS NOT NULL
            THEN metadata || ${JSON.stringify({
              ...(request.input.customFields !== undefined
                ? { customFields: jsonObject(request.input.customFields) }
                : {}),
              ...(request.input.weight !== undefined ? { weight: request.input.weight } : {}),
              ...(unitCost !== null ? { unitCostMinor: unitCost.toString() } : {}),
            })}::jsonb
            ELSE metadata END,
          updated_at = ${now}
      WHERE store_id = ${request.context.storeId} AND order_id = ${order.id} AND id = ${lineId}
      RETURNING id
    `);
    if (!changed[0]) throw new Error("ORDER_LINE_NOT_FOUND");
    await this.refreshDraftDeliveryGroup(request.context.storeId, order.id, now);
    await this.recalculateOrder(request.context.storeId, order.id, now);
    const result = await this.bumpAndAudit(request, order, command, { lineId }, now);
    return { ...result, resourceId: lineId };
  }

  public async deleteDraftLine(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableAdminOrderCommandResult> {
    const order = await this.lockOrder(request, ["DRAFT"]);
    const lineId = requiredUuid(request.input, "lineId");
    await this.connection.execute(sql`
      DELETE FROM orders.order_delivery_group_lines
      WHERE store_id = ${request.context.storeId} AND order_id = ${order.id}
        AND order_line_id = ${lineId}
    `);
    const removed = await this.connection.execute<{ id: string }>(sql`
      DELETE FROM orders.order_lines
      WHERE store_id = ${request.context.storeId} AND order_id = ${order.id} AND id = ${lineId}
      RETURNING id
    `);
    if (!removed[0]) throw new Error("ORDER_LINE_NOT_FOUND");
    const now = new Date().toISOString();
    await this.refreshDraftDeliveryGroup(request.context.storeId, order.id, now);
    await this.recalculateOrder(request.context.storeId, order.id, now);
    const result = await this.bumpAndAudit(request, order, command, { lineId }, now);
    return { ...result, resourceId: lineId, deleted: true };
  }
}
