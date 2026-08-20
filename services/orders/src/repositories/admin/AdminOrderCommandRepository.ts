import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type {
  AdminOrderCommandInput,
  AdminOrderCommandName,
  AdminOrderCommandResult,
} from "../../domain/admin/AdminOrderCommandContracts.js";
import type {
  FulfillmentServiceCallbackWorkflowInput,
  IntegrationEventWorkflowInput,
} from "../../domain/integration/OrderProviderContracts.js";
import type {
  ApplyOrderIntegrationEventV1Result,
  CompleteOrderFulfillmentServiceOperationV1Result,
} from "@shopana/broker-types";
import { asynchronousAdminOrderCommands } from "../../domain/admin/AdminOrderCommandContracts.js";
import { parseDecimalInput } from "../../utils/decimal.js";
import { Money } from "@shopana/shared-money";
import type { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../../infrastructure/db/database.js";
import { BaseRepository } from "../BaseRepository.js";
import type { OrderNumberRepository } from "../order-number/OrderNumberRepository.js";

type OrderRow = Readonly<{
  id: string;
  version: number;
  status: "DRAFT" | "OPEN" | "CLOSED" | "CANCELLED";
  currency_code: string;
  total_amount: string;
  payment_status: string;
  fulfillment_status: string;
  delivery_status: string;
  return_status: string;
}>;

type MutableResult = {
  orderId: string | null;
  orderVersion: number | null;
  resourceId: string | null;
  operationId: string | null;
  deleted?: boolean;
};

export type AdminOrderExternalEffect = Readonly<{
  route: string;
  params: Readonly<Record<string, unknown>>;
}>;

export type AdminOrderBulkTarget = Readonly<{
  id: string;
  version: number;
  tags: readonly string[];
}>;

const operationKinds: Partial<Record<AdminOrderCommandName, string>> = {
  orderCancel: "ORDER_CANCEL",
  orderEditCommit: "ORDER_EDIT_COMMIT",
  orderPaymentCapture: "PAYMENT_CAPTURE",
  orderPaymentVoid: "PAYMENT_VOID",
  orderPaymentRetry: "PAYMENT_RETRY",
  orderRefundCreate: "PAYMENT_REFUND",
  fulfillmentOrderSubmit: "FULFILLMENT_SUBMIT",
  fulfillmentOrderCancelRequest: "FULFILLMENT_CANCEL",
  fulfillmentCancel: "FULFILLMENT_CANCEL",
  shipmentCreate: "SHIPMENT_CREATE",
  shipmentCancel: "SHIPMENT_CANCEL",
  shipmentReconcile: "SHIPMENT_RECONCILE",
  orderReturnReceive: "RETURN_RECEIVE",
  orderIntegrationSyncRequest: "INTEGRATION_SYNC",
  orderIntegrationSyncRetry: "INTEGRATION_SYNC",
  ordersBulkAction: "BULK_ACTION",
};

export class AdminOrderCommandRepository extends BaseRepository {
  constructor(
    db: Database,
    txManager: TransactionManager<Database>,
    orderNumbers: OrderNumberRepository,
  ) {
    super(db, txManager);
    this.orderNumbers = orderNumbers;
  }

  private readonly orderNumbers: OrderNumberRepository;

  async execute(
    command: AdminOrderCommandName,
    request: AdminOrderCommandInput,
    workflowId: string,
  ): Promise<AdminOrderCommandResult> {
    const input = request.input;
    const idempotencyKey = requiredString(input, "idempotencyKey");
    const requestHash = digest({ command, input });
    const replay = await this.findReplay(request.context.storeId, command, idempotencyKey);
    if (replay) {
      if (replay.requestHash !== requestHash) {
        throw new Error("IDEMPOTENCY_KEY_PARAMETER_MISMATCH");
      }
      return { ...replay.response, duplicate: true };
    }

    const mutation = await this.apply(command, request, workflowId);
    const result: AdminOrderCommandResult = {
      command,
      orderId: mutation.orderId,
      orderVersion: mutation.orderVersion,
      resourceId: mutation.resourceId,
      operationId: mutation.operationId,
      duplicate: false,
      deleted: mutation.deleted ?? false,
    };
    await this.saveReplay(
      request.context.storeId,
      command,
      idempotencyKey,
      requestHash,
      result,
      mutation.orderId,
    );
    return result;
  }

  private async apply(
    command: AdminOrderCommandName,
    request: AdminOrderCommandInput,
    workflowId: string,
  ): Promise<MutableResult> {
    switch (command) {
      case "orderCreate":
        return this.createDraft(request);
      case "orderUpdate":
        return this.updateDraftDetails(request, command);
      case "orderDelete":
        return this.deleteDraft(request);
      case "orderCompleteDraft":
        return this.completeDraft(request, command);
      case "orderClose":
        return this.transition(request, command, ["OPEN"], "CLOSED", { closedAt: true });
      case "orderReopen":
        return this.transition(request, command, ["CLOSED"], "OPEN", { clearClosedAt: true });
      case "orderArchive":
        return this.archive(request, command, true);
      case "orderUnarchive":
        return this.archive(request, command, false);
      case "orderCustomerSet":
        return this.setCustomer(request, command);
      case "orderTagsUpdate":
        return this.updateTags(request, command);
      case "orderAdminNoteUpdate":
        return this.updateAdminNote(request, command);
      case "orderCommentAdd":
        return this.addComment(request, command);
      case "orderCustomFieldsUpdate":
        return this.updateCustomFields(request, command);
      case "orderLineAdd":
        return this.addDraftLine(request, command);
      case "orderLineUpdate":
        return this.updateDraftLine(request, command);
      case "orderLineDelete":
        return this.deleteDraftLine(request, command);
      case "orderEditBegin":
        return this.beginEdit(request, command);
      case "orderEditLineAdd":
      case "orderEditLineUpdate":
      case "orderEditLineRemove":
      case "orderEditShippingUpdate":
      case "orderEditDiscountAdd":
      case "orderEditDiscountRemove":
        return this.appendEditChange(request, command);
      case "orderEditCommit":
        return this.commitEdit(request, command, workflowId);
      case "orderEditAbandon":
        return this.abandonEdit(request, command);
      case "orderManualPaymentRecord":
        return this.recordManualPayment(request, command);
      case "orderPaymentStatusOverride":
        return this.overridePaymentStatus(request, command);
      case "fulfillmentOrderSplit":
        return this.splitFulfillmentOrder(request, command);
      case "fulfillmentOrderMove":
        return this.moveFulfillmentOrder(request, command);
      case "fulfillmentOrderHold":
        return this.holdFulfillmentOrder(request, command);
      case "fulfillmentOrderReleaseHold":
        return this.releaseFulfillmentHold(request, command);
      case "fulfillmentCreate":
        return this.createFulfillment(request, command);
      case "shipmentTrackingUpdate":
        return this.updateShipmentTracking(request, command);
      case "shipmentMarkShipped":
        return this.markShipment(request, command, "IN_TRANSIT");
      case "shipmentMarkDelivered":
        return this.markShipment(request, command, "DELIVERED");
      case "orderReturnCreate":
        return this.createReturn(request, command);
      case "orderReturnApprove":
        return this.transitionReturn(request, command, "APPROVED");
      case "orderReturnReject":
        return this.transitionReturn(request, command, "REJECTED");
      case "orderReturnCancel":
        return this.transitionReturn(request, command, "CANCELLED");
      case "orderExchangeCreate":
        return this.createExchange(request, command);
      case "orderExchangeCancel":
        return this.cancelExchange(request, command);
      case "orderIntegrationLinkDetach":
        return this.detachIntegration(request, command);
      default:
        if (asynchronousAdminOrderCommands.has(command)) {
          return this.prepareOperation(request, command, workflowId);
        }
        throw new Error(`ORDER_COMMAND_NOT_IMPLEMENTED:${command}`);
    }
  }

  private async createDraft(request: AdminOrderCommandInput): Promise<MutableResult> {
    const input = request.input;
    const lines = requiredArray(input, "lines").map(asRecord);
    if (lines.length === 0) throw new Error("ORDER_LINES_REQUIRED");
    const firstMoney = asRecord(lines[0]!.unitPrice);
    const currencyCode = requiredCurrency(firstMoney, "currencyCode");
    const orderId = uuidv7();
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

  private async updateDraftDetails(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableResult> {
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

  private async deleteDraft(request: AdminOrderCommandInput): Promise<MutableResult> {
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

  private async transition(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
    allowed: OrderRow["status"][],
    status: OrderRow["status"],
    timestamps: { placedAt?: boolean; closedAt?: boolean; clearClosedAt?: boolean },
  ): Promise<MutableResult> {
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

  private async completeDraft(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableResult> {
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

  private async archive(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
    archived: boolean,
  ): Promise<MutableResult> {
    const order = await this.lockOrder(request);
    const now = new Date().toISOString();
    await this.connection.execute(sql`
      UPDATE orders.orders SET archived_at = ${archived ? now : null}, updated_at = ${now}
      WHERE store_id = ${request.context.storeId} AND id = ${order.id}
    `);
    return this.bumpAndAudit(request, order, command, request.input, now);
  }

  private async setCustomer(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableResult> {
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

  private async updateTags(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableResult> {
    const order = await this.lockOrder(request);
    const tags = requiredArray(request.input, "tags");
    const now = new Date().toISOString();
    await this.replaceTags(request, order.id, tags, now);
    return this.bumpAndAudit(request, order, command, { tags }, now);
  }

  private async updateAdminNote(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableResult> {
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

  private async addComment(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableResult> {
    const order = await this.lockOrder(request);
    const activityId = uuidv7();
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

  private async updateCustomFields(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableResult> {
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

  private async addDraftLine(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableResult> {
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

  private async updateDraftLine(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableResult> {
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

  private async deleteDraftLine(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableResult> {
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

  // Family implementations are kept below the shared transaction/audit helpers.

  private async beginEdit(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableResult> {
    const order = await this.lockOrder(request, ["OPEN"]);
    const editId = uuidv7();
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

  private async appendEditChange(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableResult> {
    const edit = await this.lockEdit(request);
    const nextEditVersion = edit.version + 1;
    const now = new Date().toISOString();
    const changeId = uuidv7();
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

  private async commitEdit(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
    workflowId: string,
  ): Promise<MutableResult> {
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
    const operationId = await this.insertOperation(
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

  private async abandonEdit(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableResult> {
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

  private async recordManualPayment(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableResult> {
    const order = await this.lockOrder(request);
    const amount = moneyMinor(asRecord(request.input.amount), order.currency_code);
    if (amount <= 0n) throw new Error("ORDER_PAYMENT_AMOUNT_INVALID");
    const transactionId = uuidv7();
    const paidAt = requiredDateTime(request.input, "paidAt");
    await this.connection.execute(sql`
      INSERT INTO orders.order_payment_transactions (
        id, store_id, order_id, currency_code, kind, status, amount, provider,
        provider_transaction_id, receipt, provider_data, processed_at, created_at, updated_at
      ) VALUES (
        ${transactionId}, ${request.context.storeId}, ${order.id}, ${order.currency_code},
        'MANUAL', 'SUCCESS', ${amount}, ${requiredString(request.input, "methodCode")},
        ${optionalString(request.input.reference)},
        ${JSON.stringify({ note: optionalString(request.input.note) })}::jsonb,
        '{}'::jsonb, ${paidAt}, ${paidAt}, ${paidAt}
      )
    `);
    const paidRows = await this.connection.execute<{ amount: string }>(sql`
      SELECT COALESCE(sum(amount), 0)::text AS amount
      FROM orders.order_payment_transactions
      WHERE store_id = ${request.context.storeId} AND order_id = ${order.id}
        AND kind IN ('CAPTURE', 'SALE', 'MANUAL') AND status = 'SUCCESS'
    `);
    const paid = BigInt(paidRows[0]?.amount ?? "0");
    const paymentStatus = paid >= BigInt(order.total_amount) ? "PAID" : "PARTIALLY_PAID";
    await this.connection.execute(sql`
      UPDATE orders.orders SET payment_status = ${paymentStatus}::orders.order_payment_status,
        updated_at = ${paidAt}
      WHERE store_id = ${request.context.storeId} AND id = ${order.id}
    `);
    const result = await this.bumpAndAudit(
      request,
      order,
      command,
      { transactionId, amountMinor: amount.toString(), methodCode: request.input.methodCode },
      paidAt,
    );
    return { ...result, resourceId: transactionId };
  }

  private async overridePaymentStatus(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableResult> {
    const order = await this.lockOrder(request);
    const status = requiredString(request.input, "status");
    requiredString(request.input, "reasonCode");
    requiredString(request.input, "note");
    const online = await this.connection.execute<{ found: boolean }>(sql`
      SELECT true AS found
      FROM orders.order_payment_methods
      WHERE store_id = ${request.context.storeId} AND order_id = ${order.id}
        AND flow = 'ONLINE' AND is_selected = true
      LIMIT 1
    `);
    if (online[0]) throw new Error("ORDER_ONLINE_PAYMENT_OVERRIDE_FORBIDDEN");
    const now = new Date().toISOString();
    await this.connection.execute(sql`
      UPDATE orders.orders SET payment_status = ${status}::orders.order_payment_status,
        updated_at = ${now}
      WHERE store_id = ${request.context.storeId} AND id = ${order.id}
    `);
    return this.bumpAndAudit(request, order, command, request.input, now);
  }

  private async splitFulfillmentOrder(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableResult> {
    const fulfillment = await this.lockFulfillmentOrder(request);
    const selections = requiredArray(request.input, "lines").map(asRecord);
    if (selections.length === 0) throw new Error("FULFILLMENT_LINES_REQUIRED");
    const newId = uuidv7();
    const now = new Date().toISOString();
    await this.connection.execute(sql`
      INSERT INTO orders.order_fulfillment_orders (
        id, store_id, order_id, delivery_group_id, version, status, request_status,
        assigned_location_id, hold_reason, external_source, external_id, metadata,
        provider_snapshot, created_at, updated_at
      ) SELECT ${newId}, store_id, order_id, delivery_group_id, 1, 'OPEN', 'UNSUBMITTED',
        assigned_location_id, NULL, external_source, external_id,
        jsonb_build_object('splitFrom', id), provider_snapshot, ${now}, ${now}
      FROM orders.order_fulfillment_orders
      WHERE store_id = ${request.context.storeId} AND id = ${fulfillment.id}
    `);
    for (const selection of selections) {
      const sourceLineId = requiredUuid(selection, "fulfillmentOrderLineId");
      const quantity = requiredPositiveInt(selection, "quantity");
      const rows = await this.connection.execute<{ order_line_id: string; quantity: number }>(sql`
        SELECT order_line_id, quantity
        FROM orders.order_fulfillment_order_lines
        WHERE store_id = ${request.context.storeId}
          AND fulfillment_order_id = ${fulfillment.id} AND order_line_id = ${sourceLineId}
        FOR UPDATE
      `);
      const source = rows[0];
      if (!source || quantity >= source.quantity)
        throw new Error("FULFILLMENT_SPLIT_QUANTITY_INVALID");
      await this.connection.execute(sql`
        UPDATE orders.order_fulfillment_order_lines SET quantity = quantity - ${quantity}
        WHERE store_id = ${request.context.storeId} AND fulfillment_order_id = ${fulfillment.id}
          AND order_line_id = ${sourceLineId}
      `);
      await this.connection.execute(sql`
        INSERT INTO orders.order_fulfillment_order_lines
          (store_id, order_id, fulfillment_order_id, order_line_id, quantity)
        VALUES (${request.context.storeId}, ${fulfillment.orderId}, ${newId}, ${sourceLineId}, ${quantity})
      `);
    }
    await this.bumpFulfillmentVersion(request.context.storeId, fulfillment.id, now);
    const order = await this.lockOrderById(request.context.storeId, fulfillment.orderId);
    const result = await this.bumpAndAudit(
      request,
      order,
      command,
      { sourceFulfillmentOrderId: fulfillment.id, fulfillmentOrderId: newId },
      now,
    );
    return { ...result, resourceId: newId };
  }

  private async moveFulfillmentOrder(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableResult> {
    const fulfillment = await this.lockFulfillmentOrder(request);
    if (!["OPEN", "SCHEDULED", "ON_HOLD"].includes(fulfillment.status)) {
      throw new Error("FULFILLMENT_MOVE_NOT_ALLOWED");
    }
    const locationId = requiredUuid(request.input, "locationId");
    const now = new Date().toISOString();
    await this.connection.execute(sql`
      UPDATE orders.order_fulfillment_orders
      SET assigned_location_id = ${locationId}, version = version + 1,
          metadata = jsonb_set(metadata, '{serviceCode}', ${JSON.stringify(optionalString(request.input.serviceCode))}::jsonb, true),
          updated_at = ${now}
      WHERE store_id = ${request.context.storeId} AND id = ${fulfillment.id}
    `);
    const order = await this.lockOrderById(request.context.storeId, fulfillment.orderId);
    const result = await this.bumpAndAudit(request, order, command, request.input, now);
    return { ...result, resourceId: fulfillment.id };
  }

  private async holdFulfillmentOrder(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableResult> {
    const fulfillment = await this.lockFulfillmentOrder(request);
    if (["CLOSED", "CANCELLED"].includes(fulfillment.status)) {
      throw new Error("FULFILLMENT_HOLD_NOT_ALLOWED");
    }
    const holdId = uuidv7();
    const now = new Date().toISOString();
    const reasonCode = requiredString(request.input, "reasonCode");
    await this.connection.execute(sql`
      INSERT INTO orders.order_fulfillment_holds (
        id, store_id, order_id, fulfillment_order_id, reason_code, reason,
        system_managed, created_by_type, created_by_id, created_at
      ) VALUES (
        ${holdId}, ${request.context.storeId}, ${fulfillment.orderId}, ${fulfillment.id},
        ${reasonCode}, ${optionalString(request.input.note) ?? reasonCode}, false,
        ${request.context.actor.type}, ${request.context.actor.id}, ${now}
      )
    `);
    await this.connection.execute(sql`
      UPDATE orders.order_fulfillment_orders
      SET status = 'ON_HOLD', hold_reason = ${reasonCode}, version = version + 1, updated_at = ${now}
      WHERE store_id = ${request.context.storeId} AND id = ${fulfillment.id}
    `);
    const order = await this.lockOrderById(request.context.storeId, fulfillment.orderId);
    const result = await this.bumpAndAudit(request, order, command, { holdId, reasonCode }, now);
    return { ...result, resourceId: fulfillment.id };
  }

  private async releaseFulfillmentHold(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableResult> {
    const fulfillment = await this.lockFulfillmentOrder(request);
    const holdId = requiredUuid(request.input, "holdId");
    const now = new Date().toISOString();
    const released = await this.connection.execute<{ id: string }>(sql`
      UPDATE orders.order_fulfillment_holds
      SET released_by_type = ${request.context.actor.type}, released_by_id = ${request.context.actor.id},
          released_at = ${now}, release_reason = 'ADMIN_RELEASE'
      WHERE store_id = ${request.context.storeId} AND fulfillment_order_id = ${fulfillment.id}
        AND id = ${holdId} AND released_at IS NULL AND system_managed = false
      RETURNING id
    `);
    if (!released[0]) throw new Error("FULFILLMENT_HOLD_NOT_FOUND");
    const active = await this.connection.execute<{ found: boolean }>(sql`
      SELECT true AS found FROM orders.order_fulfillment_holds
      WHERE store_id = ${request.context.storeId} AND fulfillment_order_id = ${fulfillment.id}
        AND released_at IS NULL LIMIT 1
    `);
    await this.connection.execute(sql`
      UPDATE orders.order_fulfillment_orders
      SET status = ${active[0] ? "ON_HOLD" : "OPEN"}::orders.order_fulfillment_order_status,
          hold_reason = ${active[0] ? fulfillment.holdReason : null}, version = version + 1, updated_at = ${now}
      WHERE store_id = ${request.context.storeId} AND id = ${fulfillment.id}
    `);
    const order = await this.lockOrderById(request.context.storeId, fulfillment.orderId);
    const result = await this.bumpAndAudit(request, order, command, { holdId }, now);
    return { ...result, resourceId: fulfillment.id };
  }

  private async createFulfillment(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableResult> {
    const fulfillmentOrder = await this.lockFulfillmentOrder(request);
    if (["CLOSED", "CANCELLED", "ON_HOLD"].includes(fulfillmentOrder.status)) {
      throw new Error("FULFILLMENT_CREATE_NOT_ALLOWED");
    }
    const placement = await this.connection.execute<{ status: string }>(sql`
      SELECT status FROM orders.order_checkout_placements
      WHERE store_id = ${request.context.storeId} AND order_id = ${fulfillmentOrder.orderId}
      LIMIT 1 FOR UPDATE
    `);
    if (placement[0] && placement[0].status !== "CONFIRMED") {
      throw new Error("ORDER_PLACEMENT_NOT_CONFIRMED");
    }
    const lines = requiredArray(request.input, "lines").map(asRecord);
    if (lines.length === 0) throw new Error("FULFILLMENT_LINES_REQUIRED");
    const fulfillmentId = uuidv7();
    const now = new Date().toISOString();
    await this.connection.execute(sql`
      INSERT INTO orders.order_fulfillments (
        id, store_id, order_id, fulfillment_order_id, status, idempotency_key,
        metadata, opened_at, completed_at, created_at, updated_at
      ) VALUES (
        ${fulfillmentId}, ${request.context.storeId}, ${fulfillmentOrder.orderId},
        ${fulfillmentOrder.id}, 'SUCCESS', ${requiredString(request.input, "idempotencyKey")},
        '{}'::jsonb, ${now}, ${now}, ${now}, ${now}
      )
    `);
    for (const line of lines) {
      const lineId = requiredUuid(line, "fulfillmentOrderLineId");
      const quantity = requiredPositiveInt(line, "quantity");
      const allocation = await this.connection.execute<{
        quantity: number;
        fulfilled: number;
      }>(sql`
        SELECT allocation.quantity,
          COALESCE((
            SELECT sum(line.quantity)::integer
            FROM orders.order_fulfillment_lines line
            JOIN orders.order_fulfillments fulfillment
              ON fulfillment.store_id = line.store_id AND fulfillment.id = line.fulfillment_id
            WHERE line.store_id = allocation.store_id
              AND line.order_id = allocation.order_id
              AND line.order_line_id = allocation.order_line_id
              AND fulfillment.status = 'SUCCESS'
          ), 0) AS fulfilled
        FROM orders.order_fulfillment_order_lines allocation
        WHERE allocation.store_id = ${request.context.storeId}
          AND allocation.fulfillment_order_id = ${fulfillmentOrder.id}
          AND allocation.order_line_id = ${lineId}
        FOR UPDATE OF allocation
      `);
      if (!allocation[0] || quantity > allocation[0].quantity - allocation[0].fulfilled) {
        throw new Error("FULFILLMENT_QUANTITY_INVALID");
      }
      await this.connection.execute(sql`
        INSERT INTO orders.order_fulfillment_lines
          (store_id, order_id, fulfillment_id, order_line_id, quantity)
        VALUES (${request.context.storeId}, ${fulfillmentOrder.orderId}, ${fulfillmentId}, ${lineId}, ${quantity})
      `);
    }
    const remaining = await this.connection.execute<{ quantity: number }>(sql`
      SELECT COALESCE(sum(allocation.quantity), 0)::integer
        - COALESCE(sum(fulfilled.quantity), 0)::integer AS quantity
      FROM orders.order_fulfillment_order_lines allocation
      LEFT JOIN LATERAL (
        SELECT sum(line.quantity)::integer AS quantity
        FROM orders.order_fulfillment_lines line
        JOIN orders.order_fulfillments fulfillment
          ON fulfillment.store_id = line.store_id AND fulfillment.id = line.fulfillment_id
        WHERE line.store_id = allocation.store_id
          AND line.order_id = allocation.order_id
          AND line.order_line_id = allocation.order_line_id
          AND fulfillment.status = 'SUCCESS'
      ) fulfilled ON true
      WHERE allocation.store_id = ${request.context.storeId}
        AND allocation.fulfillment_order_id = ${fulfillmentOrder.id}
    `);
    await this.connection.execute(sql`
      UPDATE orders.order_fulfillment_orders
      SET status = ${(remaining[0]?.quantity ?? 0) === 0 ? "CLOSED" : "IN_PROGRESS"}::orders.order_fulfillment_order_status,
          closed_at = CASE WHEN ${(remaining[0]?.quantity ?? 0) === 0} THEN ${now}::timestamptz ELSE NULL END,
          version = version + 1, updated_at = ${now}
      WHERE store_id = ${request.context.storeId} AND id = ${fulfillmentOrder.id}
    `);
    const order = await this.lockOrderById(request.context.storeId, fulfillmentOrder.orderId);
    const aggregateRemaining = await this.connection.execute<{
      remaining: number;
      fulfilled: number;
    }>(sql`
      SELECT
        COALESCE(sum(line.quantity - line.cancelled_quantity), 0)::integer
          - COALESCE((
            SELECT sum(fulfilled_line.quantity)::integer
            FROM orders.order_fulfillment_lines fulfilled_line
            JOIN orders.order_fulfillments fulfillment
              ON fulfillment.store_id = fulfilled_line.store_id
             AND fulfillment.id = fulfilled_line.fulfillment_id
            WHERE fulfilled_line.store_id = ${request.context.storeId}
              AND fulfilled_line.order_id = ${order.id}
              AND fulfillment.status = 'SUCCESS'
          ), 0) AS remaining,
        COALESCE((
          SELECT sum(fulfilled_line.quantity)::integer
          FROM orders.order_fulfillment_lines fulfilled_line
          JOIN orders.order_fulfillments fulfillment
            ON fulfillment.store_id = fulfilled_line.store_id
           AND fulfillment.id = fulfilled_line.fulfillment_id
          WHERE fulfilled_line.store_id = ${request.context.storeId}
            AND fulfilled_line.order_id = ${order.id}
            AND fulfillment.status = 'SUCCESS'
        ), 0) AS fulfilled
      FROM orders.order_lines line
      WHERE line.store_id = ${request.context.storeId} AND line.order_id = ${order.id}
    `);
    const fulfillmentStatus =
      (aggregateRemaining[0]?.remaining ?? 0) === 0
        ? "FULFILLED"
        : (aggregateRemaining[0]?.fulfilled ?? 0) > 0
          ? "PARTIALLY_FULFILLED"
          : "UNFULFILLED";
    await this.connection.execute(sql`
      UPDATE orders.orders SET fulfillment_status = ${fulfillmentStatus}::orders.order_fulfillment_status,
        updated_at = ${now}
      WHERE store_id = ${request.context.storeId} AND id = ${order.id}
    `);
    const result = await this.bumpAndAudit(
      request,
      order,
      command,
      { fulfillmentId, fulfillmentOrderId: fulfillmentOrder.id, lines },
      now,
    );
    return { ...result, resourceId: fulfillmentId };
  }

  private async updateShipmentTracking(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableResult> {
    const shipment = await this.lockShipment(request);
    if (shipment.externalId) throw new Error("PROVIDER_MANAGED_SHIPMENT_TRACKING_READ_ONLY");
    const tracking = requiredArray(request.input, "tracking").map(asRecord);
    const now = new Date().toISOString();
    await this.connection.execute(sql`
      DELETE FROM orders.order_shipment_tracking_numbers
      WHERE store_id = ${request.context.storeId} AND shipment_id = ${shipment.id}
    `);
    for (let index = 0; index < tracking.length; index += 1) {
      const item = tracking[index]!;
      await this.connection.execute(sql`
        INSERT INTO orders.order_shipment_tracking_numbers
          (store_id, order_id, shipment_id, number, url, company, is_primary, created_at)
        VALUES (${request.context.storeId}, ${shipment.orderId}, ${shipment.id},
          ${requiredString(item, "number")}, ${optionalString(item.url)}, ${optionalString(item.company)},
          ${index === 0}, ${now})
      `);
    }
    const order = await this.lockOrderById(request.context.storeId, shipment.orderId);
    const result = await this.bumpAndAudit(
      request,
      order,
      command,
      { shipmentId: shipment.id, tracking },
      now,
    );
    return { ...result, resourceId: shipment.id };
  }

  private async markShipment(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
    status: "IN_TRANSIT" | "DELIVERED",
  ): Promise<MutableResult> {
    const shipment = await this.lockShipment(request);
    const timestamp = requiredDateTime(
      request.input,
      status === "DELIVERED" ? "deliveredAt" : "shippedAt",
    );
    await this.connection.execute(sql`
      UPDATE orders.order_shipments
      SET status = ${status}::orders.order_shipment_status,
          shipped_at = CASE WHEN ${status === "IN_TRANSIT"} THEN ${timestamp}::timestamptz ELSE shipped_at END,
          delivered_at = CASE WHEN ${status === "DELIVERED"} THEN ${timestamp}::timestamptz ELSE delivered_at END,
          updated_at = ${timestamp}
      WHERE store_id = ${request.context.storeId} AND id = ${shipment.id}
    `);
    await this.connection.execute(sql`
      INSERT INTO orders.order_shipment_tracking_events (
        store_id, order_id, shipment_id, status, message, happened_at
      ) VALUES (${request.context.storeId}, ${shipment.orderId}, ${shipment.id}, ${status},
        ${command}, ${timestamp})
    `);
    const order = await this.lockOrderById(request.context.storeId, shipment.orderId);
    await this.connection.execute(sql`
      UPDATE orders.orders
      SET delivery_status = ${status}::orders.order_delivery_status, updated_at = ${timestamp}
      WHERE store_id = ${request.context.storeId} AND id = ${order.id}
    `);
    const result = await this.bumpAndAudit(
      request,
      order,
      command,
      { shipmentId: shipment.id },
      timestamp,
    );
    return { ...result, resourceId: shipment.id };
  }

  private async createReturn(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableResult> {
    const order = await this.lockOrder(request, ["OPEN", "CLOSED"]);
    const lines = requiredArray(request.input, "lines").map(asRecord);
    if (lines.length === 0) throw new Error("ORDER_RETURN_LINES_REQUIRED");
    const returnId = uuidv7();
    const now = new Date().toISOString();
    await this.connection.execute(sql`
      INSERT INTO orders.order_return_requests (
        id, store_id, order_id, status, version, customer_note, merchant_note,
        idempotency_key, requested_by_type, requested_by_id, metadata,
        requested_at, created_at, updated_at
      ) VALUES (
        ${returnId}, ${request.context.storeId}, ${order.id}, 'REQUESTED', 1,
        ${optionalString(request.input.customerNote)}, ${optionalString(request.input.staffNote)},
        ${requiredString(request.input, "idempotencyKey")}, ${request.context.actor.type},
        ${request.context.actor.id}, '{}'::jsonb, ${now}, ${now}, ${now}
      )
    `);
    for (const line of lines) {
      const orderLineId = requiredUuid(line, "orderLineId");
      const quantity = requiredPositiveInt(line, "quantity");
      const available = await this.returnableQuantity(
        request.context.storeId,
        order.id,
        orderLineId,
      );
      if (quantity > available) throw new Error("ORDER_RETURN_QUANTITY_EXCEEDED");
      await this.connection.execute(sql`
        INSERT INTO orders.order_return_request_lines (
          store_id, order_id, return_request_id, order_line_id, requested_quantity,
          reason, note, disposition, metadata
        ) VALUES (
          ${request.context.storeId}, ${order.id}, ${returnId}, ${orderLineId}, ${quantity},
          ${requiredString(line, "reasonCode")}::orders.order_return_reason,
          ${optionalString(line.note)}, 'PENDING', '{}'::jsonb
        )
      `);
    }
    await this.connection.execute(sql`
      UPDATE orders.orders SET return_status = 'REQUESTED', updated_at = ${now}
      WHERE store_id = ${request.context.storeId} AND id = ${order.id}
    `);
    const result = await this.bumpAndAudit(request, order, command, { returnId, lines }, now);
    return { ...result, resourceId: returnId };
  }

  private async transitionReturn(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
    status: "APPROVED" | "REJECTED" | "CANCELLED",
  ): Promise<MutableResult> {
    const returned = await this.lockReturn(request);
    const allowed =
      status === "APPROVED" || status === "REJECTED" ? ["REQUESTED"] : ["REQUESTED", "APPROVED"];
    if (!allowed.includes(returned.status)) throw new Error("ORDER_RETURN_TRANSITION_INVALID");
    const now = new Date().toISOString();
    await this.connection.execute(sql`
      UPDATE orders.order_return_requests
      SET status = ${status}::orders.order_return_request_status, version = version + 1,
          merchant_note = COALESCE(${optionalString(request.input.staffNote)}, merchant_note),
          resolved_by_type = ${request.context.actor.type}, resolved_by_id = ${request.context.actor.id},
          resolved_at = CASE WHEN ${status !== "APPROVED"} THEN ${now}::timestamptz ELSE resolved_at END,
          updated_at = ${now}
      WHERE store_id = ${request.context.storeId} AND id = ${returned.id}
    `);
    if (status === "APPROVED") {
      const locationId = optionalUuid(request.input.locationId, "locationId");
      await this.connection.execute(sql`
        UPDATE orders.order_return_request_lines
        SET approved_quantity = requested_quantity,
            restock_location_id = ${locationId}
        WHERE store_id = ${request.context.storeId} AND return_request_id = ${returned.id}
      `);
      if (request.input.createReturnShipment === true) {
        if (!locationId) throw new Error("RETURN_SHIPMENT_LOCATION_REQUIRED");
        await this.connection.execute(sql`
          INSERT INTO orders.order_return_shipments (
            store_id, order_id, return_request_id, status, destination_location_id,
            metadata, created_at, updated_at
          ) VALUES (
            ${request.context.storeId}, ${returned.orderId}, ${returned.id}, 'LABEL_CREATED',
            ${locationId}, ${JSON.stringify({ requestedByCommand: command })}::jsonb, ${now}, ${now}
          )
        `);
      }
    }
    const order = await this.lockOrderById(request.context.storeId, returned.orderId);
    const result = await this.bumpAndAudit(
      request,
      order,
      command,
      { returnId: returned.id, status },
      now,
    );
    return { ...result, resourceId: returned.id };
  }

  private async createExchange(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableResult> {
    const order = await this.lockOrder(request, ["OPEN", "CLOSED"]);
    const inboundLines = requiredArray(request.input, "inboundLines").map(asRecord);
    const outboundLines = requiredArray(request.input, "outboundLines").map(asRecord);
    if (inboundLines.length === 0 || outboundLines.length === 0) {
      throw new Error("ORDER_EXCHANGE_LINES_REQUIRED");
    }
    const returnId = uuidv7();
    const exchangeId = uuidv7();
    const now = new Date().toISOString();
    await this.connection.execute(sql`
      INSERT INTO orders.order_return_requests (
        id, store_id, order_id, status, version, merchant_note, idempotency_key,
        requested_by_type, requested_by_id, metadata, requested_at, created_at, updated_at
      ) VALUES (
        ${returnId}, ${request.context.storeId}, ${order.id}, 'APPROVED', 1,
        ${optionalString(request.input.staffNote)}, ${requiredString(request.input, "idempotencyKey")},
        ${request.context.actor.type}, ${request.context.actor.id},
        ${JSON.stringify({ exchangeId })}::jsonb, ${now}, ${now}, ${now}
      )
    `);
    let inboundAmount = 0n;
    for (const line of inboundLines) {
      const orderLineId = requiredUuid(line, "orderLineId");
      const quantity = requiredPositiveInt(line, "quantity");
      const source = await this.connection.execute<{
        unit_price_amount: string;
        quantity: number;
      }>(sql`
        SELECT unit_price_amount::text AS unit_price_amount, quantity
        FROM orders.order_lines
        WHERE store_id = ${request.context.storeId} AND order_id = ${order.id} AND id = ${orderLineId}
        FOR UPDATE
      `);
      const available = await this.returnableQuantity(
        request.context.storeId,
        order.id,
        orderLineId,
      );
      if (!source[0] || quantity > source[0].quantity || quantity > available)
        throw new Error("ORDER_EXCHANGE_QUANTITY_INVALID");
      const returnLineId = uuidv7();
      const amount = BigInt(source[0].unit_price_amount) * BigInt(quantity);
      inboundAmount += amount;
      await this.connection.execute(sql`
        INSERT INTO orders.order_return_request_lines (
          id, store_id, order_id, return_request_id, order_line_id, requested_quantity,
          approved_quantity, reason, note, disposition, metadata
        ) VALUES (
          ${returnLineId}, ${request.context.storeId}, ${order.id}, ${returnId}, ${orderLineId},
          ${quantity}, ${quantity}, ${requiredString(line, "reasonCode")}::orders.order_return_reason,
          ${optionalString(line.note)}, 'PENDING', '{}'::jsonb
        )
      `);
      await this.connection.execute(sql`
        INSERT INTO orders.order_exchange_inbound_lines (
          store_id, order_id, exchange_id, return_request_line_id, quantity, amount
        ) VALUES (
          ${request.context.storeId}, ${order.id}, ${exchangeId}, ${returnLineId},
          ${quantity}, ${amount}
        )
      `);
    }
    let outboundAmount = 0n;
    const outbound = outboundLines.map((line) => {
      const quantity = requiredPositiveInt(line, "quantity");
      const amount = moneyMinor(asRecord(line.unitPrice), order.currency_code);
      outboundAmount += amount * BigInt(quantity);
      return { line, quantity, amount };
    });
    await this.connection.execute(sql`
      INSERT INTO orders.order_exchanges (
        id, store_id, order_id, return_request_id, version, status, currency_code,
        inbound_amount, outbound_amount, balance_amount, idempotency_key,
        created_by_type, created_by_id, created_at, updated_at
      ) VALUES (
        ${exchangeId}, ${request.context.storeId}, ${order.id}, ${returnId}, 1, 'OPEN',
        ${order.currency_code}, ${inboundAmount}, ${outboundAmount}, ${outboundAmount - inboundAmount},
        ${requiredString(request.input, "idempotencyKey")}, ${request.context.actor.type},
        ${request.context.actor.id}, ${now}, ${now}
      )
    `);
    for (const item of outbound) {
      await this.connection.execute(sql`
        INSERT INTO orders.order_exchange_outbound_lines (
          store_id, order_id, exchange_id, purchasable_id, variant_id, title, sku, snapshot,
          quantity, unit_price_amount, total_amount
        ) VALUES (
          ${request.context.storeId}, ${order.id}, ${exchangeId},
          ${optionalString(item.line.purchasableId) ?? uuidv7()},
          ${optionalString(item.line.purchasableId)}, ${requiredString(item.line, "title")},
          ${optionalString(item.line.sku)}, ${JSON.stringify({
            customFields: jsonObject(item.line.customFields),
            requiresShipping: optionalBoolean(item.line.requiresShipping) ?? true,
            taxable: optionalBoolean(item.line.taxable) ?? true,
          })}::jsonb,
          ${item.quantity}, ${item.amount}, ${item.amount * BigInt(item.quantity)}
        )
      `);
    }
    await this.connection.execute(sql`
      UPDATE orders.orders SET return_status = 'REQUESTED', updated_at = ${now}
      WHERE store_id = ${request.context.storeId} AND id = ${order.id}
    `);
    const result = await this.bumpAndAudit(request, order, command, { returnId, exchangeId }, now);
    return { ...result, resourceId: exchangeId };
  }

  private async cancelExchange(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableResult> {
    const exchangeId = requiredUuid(request.input, "exchangeId");
    const expectedVersion = requiredPositiveInt(request.input, "expectedVersion");
    const rows = await this.connection.execute<{
      order_id: string;
      version: number;
      status: string;
    }>(sql`
      SELECT order_id, version, status FROM orders.order_exchanges
      WHERE store_id = ${request.context.storeId} AND id = ${exchangeId} FOR UPDATE
    `);
    const exchange = rows[0];
    if (!exchange) throw new Error("ORDER_EXCHANGE_NOT_FOUND");
    if (exchange.version !== expectedVersion) throw new Error("ORDER_EXCHANGE_VERSION_CONFLICT");
    if (!["REQUESTED", "OPEN"].includes(exchange.status))
      throw new Error("ORDER_EXCHANGE_CANCEL_NOT_ALLOWED");
    const now = new Date().toISOString();
    await this.connection.execute(sql`
      UPDATE orders.order_exchanges SET status = 'CANCELLED', version = version + 1,
        cancelled_at = ${now}, updated_at = ${now}
      WHERE store_id = ${request.context.storeId} AND id = ${exchangeId}
    `);
    await this.connection.execute(sql`
      UPDATE orders.order_return_requests request
      SET status = 'CANCELLED', version = version + 1, resolved_by_type = ${request.context.actor.type},
        resolved_by_id = ${request.context.actor.id}, resolved_at = ${now}, updated_at = ${now}
      FROM orders.order_exchanges exchange
      WHERE exchange.store_id = request.store_id AND exchange.return_request_id = request.id
        AND exchange.store_id = ${request.context.storeId} AND exchange.id = ${exchangeId}
        AND request.status IN ('REQUESTED', 'APPROVED')
    `);
    const order = await this.lockOrderById(request.context.storeId, exchange.order_id);
    const result = await this.bumpAndAudit(request, order, command, { exchangeId }, now);
    return { ...result, resourceId: exchangeId };
  }

  private async detachIntegration(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableResult> {
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

  private async prepareOperation(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
    workflowId: string,
  ): Promise<MutableResult> {
    const orderId = await this.resolveOperationOrderId(request, command);
    const order = orderId ? await this.lockOrderById(request.context.storeId, orderId) : null;
    if (order && request.input.expectedVersion !== undefined) {
      const expectedVersion = requiredPositiveInt(request.input, "expectedVersion");
      if (order.version !== expectedVersion) throw new Error("ORDER_VERSION_CONFLICT");
    }
    if (command === "orderCancel" && order) await this.validateCancellation(request, order);
    const now = new Date().toISOString();
    const resourceId =
      command === "orderIntegrationSyncRequest" || command === "orderIntegrationSyncRetry"
        ? await this.resolveIntegrationLinkId(request)
        : operationResourceId(request.input);
    const operationId = await this.insertOperation(
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
      return { ...result, operationId, resourceId };
    }
    return { orderId: null, orderVersion: null, resourceId: null, operationId };
  }

  private async lockOrder(
    request: AdminOrderCommandInput,
    allowedStatuses?: OrderRow["status"][],
  ): Promise<OrderRow> {
    const orderId = requiredUuid(request.input, "orderId" in request.input ? "orderId" : "id");
    const order = await this.lockOrderById(request.context.storeId, orderId);
    if (request.input.expectedVersion !== undefined) {
      const expectedVersion = requiredPositiveInt(request.input, "expectedVersion");
      if (order.version !== expectedVersion) throw new Error("ORDER_VERSION_CONFLICT");
    }
    if (allowedStatuses && !allowedStatuses.includes(order.status)) {
      throw new Error(`ORDER_${commandStatus(order.status)}_TRANSITION_NOT_ALLOWED`);
    }
    return order;
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

  private async lockOrderById(storeId: string, orderId: string): Promise<OrderRow> {
    const rows = await this.connection.execute<OrderRow>(sql`
      SELECT id, version, status, currency_code, total_amount::text AS total_amount,
        payment_status, fulfillment_status, delivery_status, return_status
      FROM orders.orders
      WHERE store_id = ${storeId} AND id = ${orderId}
      FOR UPDATE
    `);
    if (!rows[0]) throw new Error("ORDER_NOT_FOUND");
    return rows[0];
  }

  private async lockEdit(request: AdminOrderCommandInput): Promise<{
    id: string;
    orderId: string;
    orderVersion: number;
    version: number;
    currencyCode: string;
  }> {
    const editId = requiredUuid(request.input, "editId");
    const expectedEditVersion = requiredPositiveInt(request.input, "expectedEditVersion");
    const rows = await this.connection.execute<{
      id: string;
      orderId: string;
      orderVersion: number;
      version: number;
      currencyCode: string;
      status: string;
      expiresAt: string;
    }>(sql`
      SELECT edit.id, edit.order_id AS "orderId", current_order.version AS "orderVersion",
        edit.version, edit.currency_code AS "currencyCode", edit.status,
        edit.expires_at::text AS "expiresAt"
      FROM orders.order_edit_sessions edit
      JOIN orders.orders current_order
        ON current_order.store_id = edit.store_id AND current_order.id = edit.order_id
      WHERE edit.store_id = ${request.context.storeId} AND edit.id = ${editId}
      FOR UPDATE OF edit, current_order
    `);
    const edit = rows[0];
    if (!edit) throw new Error("ORDER_EDIT_NOT_FOUND");
    if (edit.status !== "ACTIVE") throw new Error("ORDER_EDIT_NOT_ACTIVE");
    if (Date.parse(edit.expiresAt) <= Date.now()) throw new Error("ORDER_EDIT_EXPIRED");
    if (edit.version !== expectedEditVersion) throw new Error("ORDER_EDIT_VERSION_CONFLICT");
    return edit;
  }

  private async lockFulfillmentOrder(request: AdminOrderCommandInput): Promise<{
    id: string;
    orderId: string;
    version: number;
    status: string;
    holdReason: string | null;
  }> {
    const id = requiredUuid(request.input, "fulfillmentOrderId");
    const rows = await this.connection.execute<{
      id: string;
      orderId: string;
      version: number;
      status: string;
      holdReason: string | null;
    }>(sql`
      SELECT id, order_id AS "orderId", version, status, hold_reason AS "holdReason"
      FROM orders.order_fulfillment_orders
      WHERE store_id = ${request.context.storeId} AND id = ${id}
      FOR UPDATE
    `);
    const fulfillment = rows[0];
    if (!fulfillment) throw new Error("FULFILLMENT_ORDER_NOT_FOUND");
    if (fulfillment.version !== requiredPositiveInt(request.input, "expectedVersion")) {
      throw new Error("FULFILLMENT_ORDER_VERSION_CONFLICT");
    }
    return fulfillment;
  }

  private async lockShipment(request: AdminOrderCommandInput): Promise<{
    id: string;
    orderId: string;
    externalId: string | null;
  }> {
    const id = requiredUuid(request.input, "shipmentId");
    const rows = await this.connection.execute<{
      id: string;
      orderId: string;
      externalId: string | null;
      orderVersion: number;
    }>(sql`
      SELECT shipment.id, shipment.order_id AS "orderId", shipment.external_id AS "externalId",
        current_order.version AS "orderVersion"
      FROM orders.order_shipments shipment
      JOIN orders.orders current_order
        ON current_order.store_id = shipment.store_id AND current_order.id = shipment.order_id
      WHERE shipment.store_id = ${request.context.storeId} AND shipment.id = ${id}
      FOR UPDATE OF shipment, current_order
    `);
    const shipment = rows[0];
    if (!shipment) throw new Error("ORDER_SHIPMENT_NOT_FOUND");
    if (shipment.orderVersion !== requiredPositiveInt(request.input, "expectedVersion")) {
      throw new Error("ORDER_VERSION_CONFLICT");
    }
    return shipment;
  }

  private async lockReturn(request: AdminOrderCommandInput): Promise<{
    id: string;
    orderId: string;
    version: number;
    status: string;
  }> {
    const id = requiredUuid(request.input, "returnId");
    const rows = await this.connection.execute<{
      id: string;
      orderId: string;
      version: number;
      status: string;
    }>(sql`
      SELECT id, order_id AS "orderId", version, status
      FROM orders.order_return_requests
      WHERE store_id = ${request.context.storeId} AND id = ${id}
      FOR UPDATE
    `);
    const returned = rows[0];
    if (!returned) throw new Error("ORDER_RETURN_NOT_FOUND");
    if (returned.version !== requiredPositiveInt(request.input, "expectedVersion")) {
      throw new Error("ORDER_RETURN_VERSION_CONFLICT");
    }
    return returned;
  }

  private async bumpAndAudit(
    request: AdminOrderCommandInput,
    order: OrderRow,
    command: AdminOrderCommandName,
    payload: unknown,
    happenedAt: string,
    activityId?: string,
  ): Promise<MutableResult> {
    const updated = await this.connection.execute<{ version: number }>(sql`
      UPDATE orders.orders
      SET version = version + 1, updated_at = GREATEST(updated_at, ${happenedAt}::timestamptz)
      WHERE store_id = ${request.context.storeId} AND id = ${order.id} AND version = ${order.version}
      RETURNING version
    `);
    const version = updated[0]?.version;
    if (!version) throw new Error("ORDER_VERSION_CONFLICT");
    await this.insertAudit(request, order.id, version, command, payload, happenedAt, activityId);
    return {
      orderId: order.id,
      orderVersion: version,
      resourceId: order.id,
      operationId: null,
    };
  }

  private async insertAudit(
    request: AdminOrderCommandInput,
    orderId: string,
    version: number,
    eventType: string,
    payload: unknown,
    happenedAt: string,
    activityId?: string,
  ): Promise<void> {
    const safePayload = JSON.stringify(jsonObject(payload));
    await this.connection.execute(sql`
      INSERT INTO orders.order_revisions (
        store_id, order_id, version, status, payment_status, fulfillment_status,
        delivery_status, return_status, currency_code, subtotal_amount, discount_amount,
        shipping_amount, tax_amount, duty_amount, adjustment_amount, total_amount,
        snapshot, reason, created_by_type, created_by_id, created_at
      ) SELECT store_id, id, version, status, payment_status, fulfillment_status,
        delivery_status, return_status, currency_code, subtotal_amount, discount_amount,
        shipping_amount, tax_amount, duty_amount, adjustment_amount, total_amount,
        jsonb_build_object('eventType', ${eventType}, 'payload', ${safePayload}::jsonb),
        ${eventType}, ${request.context.actor.type}, ${request.context.actor.id}, ${happenedAt}
      FROM orders.orders
      WHERE store_id = ${request.context.storeId} AND id = ${orderId} AND version = ${version}
    `);
    await this.connection.execute(sql`
      INSERT INTO orders.order_events (
        store_id, order_id, event_type, order_version, visibility, actor_type, actor_id,
        correlation_id, idempotency_key, payload, happened_at
      ) VALUES (
        ${request.context.storeId}, ${orderId}, ${eventType}, ${version}, 'INTERNAL',
        ${request.context.actor.type}, ${request.context.actor.id}, ${request.context.correlationId},
        ${requiredString(request.input, "idempotencyKey")}, ${safePayload}::jsonb, ${happenedAt}
      )
    `);
    await this.connection.execute(sql`
      INSERT INTO orders.order_status_history (
        store_id, order_id, order_version, order_status, payment_status,
        fulfillment_status, delivery_status, return_status, reason_code,
        actor_type, actor_id, metadata, happened_at
      ) SELECT store_id, id, version, status, payment_status, fulfillment_status,
        delivery_status, return_status, ${eventType}, ${request.context.actor.type},
        ${request.context.actor.id}, ${safePayload}::jsonb, ${happenedAt}
      FROM orders.orders
      WHERE store_id = ${request.context.storeId} AND id = ${orderId} AND version = ${version}
    `);
    await this.connection.execute(sql`
      INSERT INTO orders.order_activity (
        id, store_id, order_id, order_version, activity_type, visibility,
        actor_type, actor_id, message, payload, happened_at
      ) VALUES (
        ${activityId ?? uuidv7()}, ${request.context.storeId}, ${orderId}, ${version}, ${eventType},
        ${eventType === "orderCommentAdd" && request.input.visibility === "CUSTOMER" ? "CUSTOMER" : "INTERNAL"},
        ${request.context.actor.type}, ${request.context.actor.id},
        ${eventType === "orderCommentAdd" ? requiredString(request.input, "comment") : null},
        ${safePayload}::jsonb, ${happenedAt}
      )
    `);
  }

  private async insertEventOnly(
    request: AdminOrderCommandInput,
    order: OrderRow,
    eventType: string,
    payload: unknown,
    happenedAt: string,
  ): Promise<void> {
    const safePayload = JSON.stringify(jsonObject(payload));
    await this.connection.execute(sql`
      INSERT INTO orders.order_events (
        store_id, order_id, event_type, order_version, visibility, actor_type, actor_id,
        correlation_id, idempotency_key, payload, happened_at
      ) VALUES (
        ${request.context.storeId}, ${order.id}, ${eventType}, ${order.version}, 'INTERNAL',
        ${request.context.actor.type}, ${request.context.actor.id}, ${request.context.correlationId},
        ${requiredString(request.input, "idempotencyKey")}, ${safePayload}::jsonb, ${happenedAt}
      )
    `);
    await this.connection.execute(sql`
      INSERT INTO orders.order_activity (
        store_id, order_id, order_version, activity_type, visibility, actor_type, actor_id,
        payload, happened_at
      ) VALUES (
        ${request.context.storeId}, ${order.id}, ${order.version}, ${eventType}, 'INTERNAL',
        ${request.context.actor.type}, ${request.context.actor.id}, ${safePayload}::jsonb, ${happenedAt}
      )
    `);
  }

  private async insertLine(
    storeId: string,
    orderId: string,
    line: Record<string, unknown>,
    currencyCode: string,
    now: string,
  ): Promise<string> {
    const id = optionalUuid(line.id, "line.id") ?? uuidv7();
    const quantity = requiredPositiveInt(line, "quantity");
    const unitPrice = moneyMinor(asRecord(line.unitPrice), currencyCode);
    const compareAt = line.unitCompareAtPrice
      ? moneyMinor(asRecord(line.unitCompareAtPrice), currencyCode)
      : null;
    const unitCost = line.unitCost ? moneyMinor(asRecord(line.unitCost), currencyCode) : null;
    await this.connection.execute(sql`
      INSERT INTO orders.order_lines (
        id, store_id, order_id, currency_code, purchasable_id, purchasable_type,
        title, sku, quantity, requires_shipping, taxable, unit_price_amount,
        unit_compare_at_price_amount, subtotal_amount, discount_amount, tax_amount,
        duty_amount, total_amount, purchasable_snapshot, metadata, created_at, updated_at
      ) VALUES (
        ${id}, ${storeId}, ${orderId}, ${currencyCode},
        ${optionalString(line.purchasableId) ?? id}, 'VARIANT', ${requiredString(line, "title")},
        ${optionalString(line.sku)}, ${quantity}, ${optionalBoolean(line.requiresShipping) ?? true},
        ${optionalBoolean(line.taxable) ?? true}, ${unitPrice}, ${compareAt},
        ${unitPrice * BigInt(quantity)}, 0, 0, 0, ${unitPrice * BigInt(quantity)},
        ${JSON.stringify({ purchasableId: optionalString(line.purchasableId) })}::jsonb,
        ${JSON.stringify({
          customFields: jsonObject(line.customFields),
          weight: line.weight ?? null,
          unitCostMinor: unitCost?.toString() ?? null,
        })}::jsonb,
        ${now}, ${now}
      )
    `);
    return id;
  }

  private async recalculateOrder(storeId: string, orderId: string, now: string): Promise<void> {
    await this.connection.execute(sql`
      UPDATE orders.orders current_order
      SET subtotal_amount = totals.subtotal,
          discount_amount = totals.discount,
          shipping_amount = delivery.shipping,
          tax_amount = totals.tax,
          duty_amount = totals.duty,
          adjustment_amount = adjustments.amount,
          total_amount = totals.subtotal - totals.discount + delivery.shipping
            + totals.tax + totals.duty + adjustments.amount,
          payment_status = CASE
            WHEN totals.subtotal - totals.discount + delivery.shipping
              + totals.tax + totals.duty + adjustments.amount = 0
            THEN 'NOT_REQUIRED'::orders.order_payment_status
            WHEN payment.net_paid >= totals.subtotal - totals.discount + delivery.shipping
              + totals.tax + totals.duty + adjustments.amount
            THEN 'PAID'::orders.order_payment_status
            WHEN payment.net_paid > 0 THEN 'PARTIALLY_PAID'::orders.order_payment_status
            WHEN current_order.payment_status = 'AUTHORIZED'
            THEN 'AUTHORIZED'::orders.order_payment_status
            ELSE 'PENDING'::orders.order_payment_status
          END,
          updated_at = ${now}
      FROM (
        SELECT COALESCE(sum(subtotal_amount), 0) AS subtotal,
          COALESCE(sum(discount_amount), 0) AS discount,
          COALESCE(sum(tax_amount), 0) AS tax,
          COALESCE(sum(duty_amount), 0) AS duty
        FROM orders.order_lines
        WHERE store_id = ${storeId} AND order_id = ${orderId}
      ) totals,
      (
        SELECT COALESCE(sum(quoted_amount), 0)::bigint AS shipping
        FROM orders.order_delivery_methods
        WHERE store_id = ${storeId} AND order_id = ${orderId} AND is_selected = true
      ) delivery,
      (
        SELECT COALESCE(sum(amount), 0)::bigint AS amount
        FROM orders.order_adjustments
        WHERE store_id = ${storeId} AND order_id = ${orderId}
      ) adjustments,
      (
        SELECT GREATEST(0,
          COALESCE(sum(amount) FILTER (
            WHERE kind IN ('CAPTURE', 'SALE', 'MANUAL') AND status = 'SUCCESS'
          ), 0)
          - COALESCE(sum(amount) FILTER (
            WHERE kind = 'REFUND' AND status = 'SUCCESS'
          ), 0)
        )::bigint AS net_paid
        FROM orders.order_payment_transactions
        WHERE store_id = ${storeId} AND order_id = ${orderId}
      ) payment
      WHERE current_order.store_id = ${storeId} AND current_order.id = ${orderId}
    `);
  }

  private async refreshEditPreview(
    storeId: string,
    editId: string,
    orderId: string,
    currencyCode: string,
  ): Promise<void> {
    const orderRows = await this.connection.execute<{
      discount: string;
      shipping: string;
      tax: string;
      duty: string;
      adjustment: string;
    }>(sql`
      SELECT discount_amount::text AS discount, shipping_amount::text AS shipping,
        tax_amount::text AS tax, duty_amount::text AS duty,
        adjustment_amount::text AS adjustment
      FROM orders.orders
      WHERE store_id = ${storeId} AND id = ${orderId}
      FOR UPDATE
    `);
    if (!orderRows[0]) throw new Error("ORDER_NOT_FOUND");
    const lineRows = await this.connection.execute<{
      id: string;
      quantity: number;
      unitPrice: string;
      discount: string;
      tax: string;
      duty: string;
    }>(sql`
      SELECT id, quantity, unit_price_amount::text AS "unitPrice",
        discount_amount::text AS discount, tax_amount::text AS tax, duty_amount::text AS duty
      FROM orders.order_lines
      WHERE store_id = ${storeId} AND order_id = ${orderId}
      FOR UPDATE
    `);
    const lines = new Map(
      lineRows.map((line) => [
        line.id,
        {
          quantity: line.quantity,
          unitPrice: BigInt(line.unitPrice),
          discount: BigInt(line.discount),
          tax: BigInt(line.tax),
          duty: BigInt(line.duty),
        },
      ]),
    );
    const changes = await this.connection.execute<{
      changeType: string;
      payload: Record<string, unknown>;
    }>(sql`
      SELECT change_type AS "changeType", payload
      FROM orders.order_edit_changes
      WHERE store_id = ${storeId} AND edit_session_id = ${editId}
      ORDER BY sequence
    `);
    let addedDiscount = 0n;
    let removedDiscount = 0n;
    let shipping = BigInt(orderRows[0].shipping);
    for (const change of changes) {
      const payload = asRecord(change.payload);
      if (change.changeType === "orderEditLineAdd") {
        const line = asRecord(payload.line);
        lines.set(requiredUuid(payload, "changeId"), {
          quantity: requiredPositiveInt(line, "quantity"),
          unitPrice: moneyMinor(asRecord(line.unitPrice), currencyCode),
          discount: 0n,
          tax: 0n,
          duty: 0n,
        });
      } else if (change.changeType === "orderEditLineUpdate") {
        const current = lines.get(requiredUuid(payload, "lineId"));
        if (!current) throw new Error("ORDER_LINE_NOT_FOUND");
        current.quantity = optionalPositiveInt(payload.quantity, "quantity") ?? current.quantity;
        current.unitPrice = payload.unitPrice
          ? moneyMinor(asRecord(payload.unitPrice), currencyCode)
          : current.unitPrice;
      } else if (change.changeType === "orderEditLineRemove") {
        if (!lines.delete(requiredUuid(payload, "lineId"))) throw new Error("ORDER_LINE_NOT_FOUND");
      } else if (change.changeType === "orderEditDiscountAdd") {
        addedDiscount += moneyMinor(asRecord(payload.amount), currencyCode);
      } else if (change.changeType === "orderEditDiscountRemove") {
        const discounts = await this.connection.execute<{ amount: string }>(sql`
          SELECT total_allocated_amount::text AS amount
          FROM orders.order_discount_applications
          WHERE store_id = ${storeId} AND order_id = ${orderId}
            AND id = ${requiredUuid(payload, "discountId")}
        `);
        if (!discounts[0]) throw new Error("ORDER_DISCOUNT_NOT_FOUND");
        removedDiscount += BigInt(discounts[0].amount);
      } else if (change.changeType === "orderEditShippingUpdate") {
        const methodCode = optionalString(asRecord(payload.shipping).methodCode);
        if (methodCode) {
          const methods = await this.connection.execute<{ amount: string }>(sql`
            SELECT COALESCE(sum(quoted_amount), 0)::text AS amount
            FROM orders.order_delivery_methods
            WHERE store_id = ${storeId} AND order_id = ${orderId} AND code = ${methodCode}
          `);
          shipping = BigInt(methods[0]?.amount ?? "0");
        }
      }
    }
    let subtotal = 0n;
    let tax = 0n;
    let duty = 0n;
    for (const line of lines.values()) {
      subtotal += line.unitPrice * BigInt(line.quantity);
      tax += line.tax;
      duty += line.duty;
    }
    if (tax === 0n) tax = BigInt(orderRows[0].tax);
    if (duty === 0n) duty = BigInt(orderRows[0].duty);
    const discount = BigInt(orderRows[0].discount) - removedDiscount;
    const adjustment = BigInt(orderRows[0].adjustment) - addedDiscount;
    const total = subtotal - discount + shipping + tax + duty + adjustment;
    if (discount < 0n || total < 0n) throw new Error("ORDER_EDIT_TOTAL_INVALID");
    await this.connection.execute(sql`
      UPDATE orders.order_edit_sessions
      SET subtotal_amount = ${subtotal}, discount_amount = ${discount},
        shipping_amount = ${shipping}, tax_amount = ${tax}, duty_amount = ${duty},
        adjustment_amount = ${adjustment}, total_amount = ${total}
      WHERE store_id = ${storeId} AND id = ${editId}
    `);
  }

  private async assertLineEditable(
    storeId: string,
    orderId: string,
    lineId: string,
    requestedQuantity: number | null,
  ): Promise<void> {
    const rows = await this.connection.execute<{ committed: number }>(sql`
      SELECT GREATEST(
        COALESCE((SELECT sum(item.quantity)::integer
          FROM orders.order_fulfillment_lines item
          JOIN orders.order_fulfillments fulfillment
            ON fulfillment.store_id = item.store_id AND fulfillment.id = item.fulfillment_id
          WHERE item.store_id = line.store_id AND item.order_id = line.order_id
            AND item.order_line_id = line.id AND fulfillment.status = 'SUCCESS'), 0),
        COALESCE((SELECT sum(item.approved_quantity)::integer
          FROM orders.order_return_request_lines item
          JOIN orders.order_return_requests request
            ON request.store_id = item.store_id AND request.id = item.return_request_id
          WHERE item.store_id = line.store_id AND item.order_id = line.order_id
            AND item.order_line_id = line.id AND request.status NOT IN ('REJECTED', 'CANCELLED')), 0),
        COALESCE((SELECT sum(item.quantity)::integer
          FROM orders.order_refund_lines item
          JOIN orders.order_refunds refund
            ON refund.store_id = item.store_id AND refund.id = item.refund_id
          WHERE item.store_id = line.store_id AND item.order_id = line.order_id
            AND item.order_line_id = line.id AND refund.status <> 'FAILED'), 0)
      ) AS committed
      FROM orders.order_lines line
      WHERE line.store_id = ${storeId} AND line.order_id = ${orderId} AND line.id = ${lineId}
      FOR UPDATE OF line
    `);
    if (!rows[0]) throw new Error("ORDER_LINE_NOT_FOUND");
    if (requestedQuantity !== null && requestedQuantity < rows[0].committed) {
      throw new Error("ORDER_EDIT_QUANTITY_COMMITTED");
    }
  }

  private async upsertContact(
    request: AdminOrderCommandInput,
    orderId: string,
    contact: Record<string, unknown>,
    now: string,
  ): Promise<void> {
    await this.connection.execute(sql`
      INSERT INTO orders.order_contacts (
        store_id, order_id, type, first_name, middle_name, last_name, email,
        phone_e164, customer_note, metadata, created_at, updated_at
      ) VALUES (
        ${request.context.storeId}, ${orderId}, 'BILLING', ${optionalString(contact.firstName)},
        ${optionalString(contact.middleName)}, ${optionalString(contact.lastName)},
        ${optionalString(contact.email)}, ${optionalString(contact.phone)},
        ${optionalString(contact.note)}, '{}'::jsonb, ${now}, ${now}
      ) ON CONFLICT (store_id, order_id) DO UPDATE
        SET first_name = EXCLUDED.first_name, middle_name = EXCLUDED.middle_name,
            last_name = EXCLUDED.last_name, email = EXCLUDED.email,
            phone_e164 = EXCLUDED.phone_e164, customer_note = EXCLUDED.customer_note,
            updated_at = EXCLUDED.updated_at
    `);
  }

  private async upsertAddress(
    storeId: string,
    orderId: string,
    type: "BILLING" | "SHIPPING",
    address: Record<string, unknown>,
    now: string,
  ): Promise<string> {
    const existing = await this.connection.execute<{ id: string }>(sql`
      SELECT id FROM orders.order_addresses
      WHERE store_id = ${storeId} AND order_id = ${orderId}
        AND type = ${type}::orders.order_address_type
      ORDER BY created_at, id LIMIT 1 FOR UPDATE
    `);
    const addressId = existing[0]?.id ?? uuidv7();
    if (existing[0]) {
      await this.connection.execute(sql`
        UPDATE orders.order_addresses
        SET address1 = ${optionalString(address.address1)},
          address2 = ${optionalString(address.address2)}, city = ${optionalString(address.city)},
          country_code = ${requiredString(address, "countryCode").toUpperCase()},
          province_code = ${optionalString(address.provinceCode)},
          postal_code = ${optionalString(address.postalCode)},
          company = ${optionalString(address.company)},
          metadata = ${JSON.stringify(jsonObject(address.data))}::jsonb, updated_at = ${now}
        WHERE store_id = ${storeId} AND order_id = ${orderId} AND id = ${addressId}
      `);
    } else {
      await this.connection.execute(sql`
        INSERT INTO orders.order_addresses (
          id, store_id, order_id, type, address1, address2, city, country_code,
          province_code, postal_code, company, metadata, created_at, updated_at
        ) VALUES (
          ${addressId}, ${storeId}, ${orderId}, ${type}::orders.order_address_type,
          ${optionalString(address.address1)}, ${optionalString(address.address2)},
          ${optionalString(address.city)}, ${requiredString(address, "countryCode").toUpperCase()},
          ${optionalString(address.provinceCode)}, ${optionalString(address.postalCode)},
          ${optionalString(address.company)}, ${JSON.stringify(jsonObject(address.data))}::jsonb,
          ${now}, ${now}
        )
      `);
    }
    return addressId;
  }

  private async upsertRecipient(
    storeId: string,
    orderId: string,
    recipientId: string | null,
    recipient: Record<string, unknown>,
    now: string,
  ): Promise<string> {
    const id = recipientId ?? uuidv7();
    if (recipientId) {
      await this.connection.execute(sql`
        UPDATE orders.order_recipients
        SET first_name = ${optionalString(recipient.firstName)},
          middle_name = ${optionalString(recipient.middleName)},
          last_name = ${optionalString(recipient.lastName)}, email = ${optionalString(recipient.email)},
          phone = ${optionalString(recipient.phone)}, metadata = ${JSON.stringify({
            company: optionalString(recipient.company),
          })}::jsonb, updated_at = ${now}
        WHERE store_id = ${storeId} AND order_id = ${orderId} AND id = ${id}
      `);
    } else {
      await this.connection.execute(sql`
        INSERT INTO orders.order_recipients (
          id, store_id, order_id, first_name, middle_name, last_name, email, phone,
          metadata, created_at, updated_at
        ) VALUES (
          ${id}, ${storeId}, ${orderId}, ${optionalString(recipient.firstName)},
          ${optionalString(recipient.middleName)}, ${optionalString(recipient.lastName)},
          ${optionalString(recipient.email)}, ${optionalString(recipient.phone)},
          ${JSON.stringify({ company: optionalString(recipient.company) })}::jsonb, ${now}, ${now}
        )
      `);
    }
    return id;
  }

  private async syncDraftDelivery(
    storeId: string,
    orderId: string,
    currencyCode: string,
    shipping: Record<string, unknown>,
    now: string,
  ): Promise<void> {
    const current = await this.connection.execute<{
      id: string;
      addressId: string | null;
      recipientId: string | null;
    }>(sql`
      SELECT id, address_id AS "addressId", recipient_id AS "recipientId"
      FROM orders.order_delivery_groups
      WHERE store_id = ${storeId} AND order_id = ${orderId}
      ORDER BY created_at, id LIMIT 1 FOR UPDATE
    `);
    let addressId = current[0]?.addressId ?? null;
    let recipientId = current[0]?.recipientId ?? null;
    if (shipping.address) {
      addressId = await this.upsertAddress(
        storeId,
        orderId,
        "SHIPPING",
        asRecord(shipping.address),
        now,
      );
    }
    if (shipping.recipient) {
      recipientId = await this.upsertRecipient(
        storeId,
        orderId,
        recipientId,
        asRecord(shipping.recipient),
        now,
      );
    }
    const lineTotals = await this.connection.execute<{ subtotal: string }>(sql`
      SELECT COALESCE(sum(subtotal_amount), 0)::text AS subtotal
      FROM orders.order_lines
      WHERE store_id = ${storeId} AND order_id = ${orderId} AND requires_shipping
    `);
    const subtotal = BigInt(lineTotals[0]?.subtotal ?? "0");
    const groupId = current[0]?.id ?? uuidv7();
    if (current[0]) {
      await this.connection.execute(sql`
        UPDATE orders.order_delivery_groups
        SET address_id = ${addressId}, recipient_id = ${recipientId},
          requires_shipping = true, subtotal_amount = ${subtotal}, discount_amount = 0,
          tax_amount = 0, total_amount = ${subtotal}, updated_at = ${now}
        WHERE store_id = ${storeId} AND order_id = ${orderId} AND id = ${groupId}
      `);
    } else {
      await this.connection.execute(sql`
        INSERT INTO orders.order_delivery_groups (
          id, store_id, order_id, currency_code, status, address_id, recipient_id,
          requires_shipping, subtotal_amount, discount_amount, tax_amount, total_amount,
          metadata, created_at, updated_at
        ) VALUES (
          ${groupId}, ${storeId}, ${orderId}, ${currencyCode}, 'OPEN', ${addressId}, ${recipientId},
          true, ${subtotal}, 0, 0, ${subtotal}, '{}'::jsonb, ${now}, ${now}
        )
      `);
    }
    await this.connection.execute(sql`
      DELETE FROM orders.order_delivery_group_lines
      WHERE store_id = ${storeId} AND order_id = ${orderId} AND delivery_group_id = ${groupId}
    `);
    await this.connection.execute(sql`
      INSERT INTO orders.order_delivery_group_lines (
        store_id, order_id, delivery_group_id, order_line_id, quantity
      )
      SELECT store_id, order_id, ${groupId}, id, quantity
      FROM orders.order_lines
      WHERE store_id = ${storeId} AND order_id = ${orderId} AND requires_shipping
    `);
    const methodCode = optionalString(shipping.methodCode);
    if (methodCode) {
      await this.connection.execute(sql`
        UPDATE orders.order_delivery_methods SET is_selected = false, updated_at = ${now}
        WHERE store_id = ${storeId} AND order_id = ${orderId} AND delivery_group_id = ${groupId}
      `);
      await this.connection.execute(sql`
        INSERT INTO orders.order_delivery_methods (
          store_id, order_id, delivery_group_id, currency_code, code, provider,
          title, type, payment_model, quoted_amount, is_selected,
          provider_data, customer_input_snapshot, created_at, updated_at
        ) VALUES (
          ${storeId}, ${orderId}, ${groupId}, ${currencyCode}, ${methodCode}, 'admin',
          ${methodCode}, 'SHIPPING', 'MERCHANT_COLLECTED', 0, true, '{}'::jsonb,
          '{}'::jsonb, ${now}, ${now}
        ) ON CONFLICT (store_id, order_id, delivery_group_id, code, provider) DO UPDATE
          SET is_selected = true, updated_at = EXCLUDED.updated_at
      `);
    }
    await this.recalculateOrder(storeId, orderId, now);
  }

  private async refreshDraftDeliveryGroup(
    storeId: string,
    orderId: string,
    now: string,
  ): Promise<void> {
    const groups = await this.connection.execute<{ id: string }>(sql`
      SELECT id FROM orders.order_delivery_groups
      WHERE store_id = ${storeId} AND order_id = ${orderId}
      ORDER BY created_at, id LIMIT 1 FOR UPDATE
    `);
    const groupId = groups[0]?.id;
    if (!groupId) return;
    await this.connection.execute(sql`
      DELETE FROM orders.order_delivery_group_lines
      WHERE store_id = ${storeId} AND order_id = ${orderId} AND delivery_group_id = ${groupId}
    `);
    await this.connection.execute(sql`
      INSERT INTO orders.order_delivery_group_lines (
        store_id, order_id, delivery_group_id, order_line_id, quantity
      )
      SELECT store_id, order_id, ${groupId}, id, quantity
      FROM orders.order_lines
      WHERE store_id = ${storeId} AND order_id = ${orderId} AND requires_shipping
    `);
    await this.connection.execute(sql`
      UPDATE orders.order_delivery_groups delivery_group
      SET subtotal_amount = totals.subtotal, discount_amount = 0, tax_amount = 0,
        total_amount = totals.subtotal, updated_at = ${now}
      FROM (
        SELECT COALESCE(sum(subtotal_amount), 0) AS subtotal
        FROM orders.order_lines
        WHERE store_id = ${storeId} AND order_id = ${orderId} AND requires_shipping
      ) totals
      WHERE delivery_group.store_id = ${storeId} AND delivery_group.order_id = ${orderId}
        AND delivery_group.id = ${groupId}
    `);
  }

  private async replaceTags(
    request: AdminOrderCommandInput,
    orderId: string,
    rawTags: readonly unknown[],
    now: string,
  ): Promise<void> {
    const tags = [...new Set(rawTags.map((value) => String(value).trim()).filter(Boolean))];
    await this.connection.execute(sql`
      DELETE FROM orders.order_tags
      WHERE store_id = ${request.context.storeId} AND order_id = ${orderId}
    `);
    for (const tag of tags) {
      await this.connection.execute(sql`
        INSERT INTO orders.order_tags
          (store_id, order_id, tag, added_by_type, added_by_id, created_at)
        VALUES (${request.context.storeId}, ${orderId}, ${tag},
          ${request.context.actor.type}, ${request.context.actor.id}, ${now})
      `);
    }
  }

  private async writeAdminNote(
    request: AdminOrderCommandInput,
    orderId: string,
    note: string,
    now: string,
  ): Promise<void> {
    await this.connection.execute(sql`
      INSERT INTO orders.order_admin_notes (
        store_id, order_id, body, created_by_type, created_by_id,
        updated_by_type, updated_by_id, created_at, updated_at
      ) VALUES (
        ${request.context.storeId}, ${orderId}, ${note}, ${request.context.actor.type},
        ${request.context.actor.id}, ${request.context.actor.type}, ${request.context.actor.id},
        ${now}, ${now}
      ) ON CONFLICT (store_id, order_id) DO UPDATE
        SET body = EXCLUDED.body, updated_by_type = EXCLUDED.updated_by_type,
            updated_by_id = EXCLUDED.updated_by_id, updated_at = EXCLUDED.updated_at
    `);
  }

  private async bumpFulfillmentVersion(storeId: string, id: string, now: string): Promise<void> {
    await this.connection.execute(sql`
      UPDATE orders.order_fulfillment_orders SET version = version + 1, updated_at = ${now}
      WHERE store_id = ${storeId} AND id = ${id}
    `);
  }

  private async returnableQuantity(
    storeId: string,
    orderId: string,
    orderLineId: string,
  ): Promise<number> {
    const rows = await this.connection.execute<{ available: number }>(sql`
      SELECT line.quantity - line.cancelled_quantity - COALESCE((
        SELECT sum(return_line.requested_quantity)
        FROM orders.order_return_request_lines return_line
        JOIN orders.order_return_requests request
          ON request.store_id = return_line.store_id AND request.id = return_line.return_request_id
        WHERE return_line.store_id = line.store_id AND return_line.order_id = line.order_id
          AND return_line.order_line_id = line.id
          AND request.status NOT IN ('REJECTED', 'CANCELLED')
      ), 0) AS available
      FROM orders.order_lines line
      WHERE line.store_id = ${storeId} AND line.order_id = ${orderId} AND line.id = ${orderLineId}
      FOR UPDATE
    `);
    if (!rows[0]) throw new Error("ORDER_LINE_NOT_FOUND");
    return rows[0].available;
  }

  private async insertOperation(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
    workflowId: string,
    orderId: string | null,
    resourceId: string | null,
    status: "RUNNING" | "SUCCEEDED",
    now: string,
  ): Promise<string> {
    const operationId = uuidv7();
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

  async externalEffects(
    command: AdminOrderCommandName,
    request: AdminOrderCommandInput,
    result: AdminOrderCommandResult,
  ): Promise<readonly AdminOrderExternalEffect[]> {
    const key = requiredString(request.input, "idempotencyKey");
    const base = {
      storeId: request.context.storeId,
      idempotencyKey: key,
      correlationId: request.context.correlationId,
    };
    if (command === "orderPaymentCapture" || command === "orderPaymentVoid") {
      const transactionId = requiredUuid(request.input, "transactionId");
      const payment = await this.paymentRoute(request.context.storeId, transactionId);
      return [
        {
          route:
            command === "orderPaymentCapture" ? "payments.capturePayment" : "payments.voidPayment",
          params:
            command === "orderPaymentCapture"
              ? {
                  ...base,
                  paymentSessionId: payment.sessionId,
                  expectedSessionRevision: payment.sessionRevision,
                  amount: paymentMoney(request.input.amount, payment.currencyCode, payment.amount),
                }
              : {
                  ...base,
                  paymentSessionId: payment.sessionId,
                  expectedSessionRevision: payment.sessionRevision,
                  reason: optionalString(request.input.reason),
                },
        },
      ];
    }
    if (command === "orderPaymentRetry" || command === "orderRefundCreate") {
      const orderId = result.orderId ?? requiredUuid(request.input, "orderId");
      const payment = await this.latestPaymentRoute(request.context.storeId, orderId);
      return [
        {
          route:
            command === "orderPaymentRetry"
              ? "payments.reconcilePayment"
              : "payments.refundPayment",
          params:
            command === "orderPaymentRetry"
              ? {
                  ...base,
                  paymentSessionId: payment.sessionId,
                  expectedSessionRevision: payment.sessionRevision,
                }
              : {
                  ...base,
                  paymentSessionId: payment.sessionId,
                  expectedSessionRevision: payment.sessionRevision,
                  amount: paymentMoney(request.input.amount, payment.currencyCode),
                  reason: requiredString(request.input, "reasonCode"),
                },
        },
      ];
    }
    if (command === "orderReturnReceive") {
      if (!result.orderId) throw new Error("ORDER_NOT_FOUND");
      const returnId = requiredUuid(request.input, "returnId");
      const effects: AdminOrderExternalEffect[] = [];
      const receivedLines = requiredArray(request.input, "lines").map(asRecord);
      const restockRows = await this.connection.execute<{
        orderLineId: string;
        variantId: string;
        warehouseId: string | null;
        previousRestockable: number;
      }>(sql`
        SELECT return_line.order_line_id AS "orderLineId",
          order_line.purchasable_id AS "variantId",
          return_line.restock_location_id AS "warehouseId",
          return_line.restockable_quantity AS "previousRestockable"
        FROM orders.order_return_request_lines return_line
        JOIN orders.order_lines order_line
          ON order_line.store_id = return_line.store_id
         AND order_line.order_id = return_line.order_id
         AND order_line.id = return_line.order_line_id
        WHERE return_line.store_id = ${request.context.storeId}
          AND return_line.order_id = ${result.orderId}
          AND return_line.return_request_id = ${returnId}
        FOR UPDATE OF return_line
      `);
      const restockByLine = new Map(restockRows.map((line) => [line.orderLineId, line]));
      const inventoryLines = receivedLines.flatMap((line) => {
        const orderLineId = requiredUuid(line, "orderLineId");
        const current = restockByLine.get(orderLineId);
        if (!current) throw new Error("RETURN_RECEIVE_LINE_INVALID");
        const requested = Number(line.restockableQuantity ?? 0);
        const quantity = requested - current.previousRestockable;
        if (quantity < 0) throw new Error("RETURN_RESTOCK_QUANTITY_DECREASED");
        if (quantity === 0) return [];
        const warehouseId =
          current.warehouseId ?? optionalUuid(request.input.locationId, "locationId");
        if (!warehouseId) throw new Error("RETURN_RESTOCK_LOCATION_REQUIRED");
        return [
          {
            orderLineId,
            variantId: current.variantId,
            warehouseId,
            targetQuantity: requested,
            quantity,
          },
        ];
      });
      if (inventoryLines.length > 0) {
        effects.push({
          route: "inventory.restockOrderReturnInventory",
          params: {
            ...base,
            orderId: result.orderId,
            returnId,
            lines: inventoryLines,
          },
        });
      }
      if (request.input.refund) {
        const payment = await this.latestPaymentRoute(request.context.storeId, result.orderId);
        const refund = asRecord(request.input.refund);
        effects.push({
          route: "payments.refundPayment",
          params: {
            ...base,
            paymentSessionId: payment.sessionId,
            expectedSessionRevision: payment.sessionRevision,
            amount: paymentMoney(refund.amount, payment.currencyCode),
            reason: optionalString(refund.reasonCode) ?? "RETURN_RECEIVED",
          },
        });
      }
      return effects;
    }
    if (command === "shipmentCreate") {
      const fulfillmentId = requiredUuid(request.input, "fulfillmentId");
      const packageItems = requiredArray(request.input, "packages")
        .map(asRecord)
        .flatMap((shipmentPackage) => requiredArray(shipmentPackage, "items").map(asRecord));
      if (packageItems.length === 0) throw new Error("SHIPMENT_PACKAGE_ITEMS_REQUIRED");
      const quantities = new Map<string, number>();
      for (const item of packageItems) {
        const lineId = requiredUuid(item, "orderLineId");
        quantities.set(
          lineId,
          (quantities.get(lineId) ?? 0) + requiredPositiveInt(item, "quantity"),
        );
      }
      const rows = await this.connection.execute<{
        fulfillmentOrderId: string;
        version: number;
      }>(sql`
        SELECT fulfillment.fulfillment_order_id AS "fulfillmentOrderId", fulfillment_order.version
        FROM orders.order_fulfillments fulfillment
        JOIN orders.order_fulfillment_orders fulfillment_order
          ON fulfillment_order.store_id = fulfillment.store_id
         AND fulfillment_order.id = fulfillment.fulfillment_order_id
        WHERE fulfillment.store_id = ${request.context.storeId} AND fulfillment.id = ${fulfillmentId}
        FOR UPDATE OF fulfillment_order
      `);
      if (!rows[0]) throw new Error("FULFILLMENT_NOT_FOUND");
      return [
        {
          route: "delivery.createDeliveryShipment",
          params: {
            ...base,
            fulfillmentOrderId: rows[0].fulfillmentOrderId,
            expectedFulfillmentOrderRevision: rows[0].version,
            lineItems: [...quantities].map(([fulfillmentOrderLineItemId, quantity]) => ({
              fulfillmentOrderLineItemId,
              quantity,
            })),
          },
        },
      ];
    }
    if (command === "shipmentCancel" || command === "shipmentReconcile") {
      const shipmentId = requiredUuid(request.input, "shipmentId");
      const rows = await this.connection.execute<{
        providerShipmentId: string | null;
        revision: number;
      }>(sql`
        SELECT external_id AS "providerShipmentId",
          COALESCE((metadata->>'providerRevision')::integer, 1) AS revision
        FROM orders.order_shipments
        WHERE store_id = ${request.context.storeId} AND id = ${shipmentId}
        FOR UPDATE
      `);
      if (!rows[0]?.providerShipmentId) throw new Error("SHIPMENT_PROVIDER_ROUTE_MISSING");
      return [
        {
          route:
            command === "shipmentCancel"
              ? "delivery.cancelDeliveryShipment"
              : "delivery.reconcileDeliveryShipment",
          params: {
            ...base,
            shipmentId: rows[0].providerShipmentId,
            expectedShipmentRevision: rows[0].revision,
            ...(command === "shipmentCancel"
              ? { reason: requiredString(request.input, "reasonCode") }
              : {}),
          },
        },
      ];
    }
    if (command === "orderCancel") {
      if (!result.orderId) throw new Error("ORDER_NOT_FOUND");
      const effects: AdminOrderExternalEffect[] = [];
      const shipments = await this.connection.execute<{
        shipmentId: string;
        revision: number;
      }>(sql`
        SELECT external_id AS "shipmentId",
          COALESCE((metadata->>'providerRevision')::integer, 1) AS revision
        FROM orders.order_shipments
        WHERE store_id = ${request.context.storeId} AND order_id = ${result.orderId}
          AND external_id IS NOT NULL AND status NOT IN ('DELIVERED', 'CANCELLED')
        ORDER BY created_at, id
        FOR UPDATE
      `);
      for (const shipment of shipments) {
        effects.push({
          route: "delivery.cancelDeliveryShipment",
          params: {
            ...base,
            idempotencyKey: `${key}:shipment:${shipment.shipmentId}`,
            shipmentId: shipment.shipmentId,
            expectedShipmentRevision: shipment.revision,
            reason: requiredString(request.input, "reasonCode"),
          },
        });
      }
      const fulfillmentOrders = await this.connection.execute<{ id: string }>(sql`
        SELECT id FROM orders.order_fulfillment_orders
        WHERE store_id = ${request.context.storeId} AND order_id = ${result.orderId}
          AND external_source IS NOT NULL
          AND request_status IN ('SUBMITTED', 'ACCEPTED')
        ORDER BY created_at, id FOR UPDATE
      `);
      for (const fulfillment of fulfillmentOrders) {
        effects.push({
          route: "apps.executeCapability",
          params: {
            storeId: request.context.storeId,
            capability: "fulfillment.service",
            operation: "requestCancellation",
            target: {
              aggregate: "fulfillment-order",
              aggregateId: fulfillment.id,
              domain: `store:${request.context.storeId}`,
            },
            correlationId: request.context.correlationId,
            executionId: result.operationId,
            input: {
              orderId: result.orderId,
              fulfillmentOrderId: fulfillment.id,
              reasonCode: request.input.reasonCode,
              idempotencyKey: `${key}:fulfillment:${fulfillment.id}`,
            },
          },
        });
      }
      if (request.input.restock !== false) {
        effects.push({
          route: "inventory.releaseCheckoutInventory",
          params: { ...base, idempotencyKey: `${key}:inventory`, orderId: result.orderId },
        });
      }
      const payments = await this.connection.execute<{
        sessionId: string | null;
        sessionRevision: number;
        currencyCode: string;
        totalAmount: string;
        paymentStatus: string;
      }>(sql`
        SELECT COALESCE(inbox.payload->>'paymentSessionId', inbox.payload->'session'->>'paymentSessionId') AS "sessionId",
          COALESCE((inbox.payload->>'sessionRevision')::integer,
            (inbox.payload->'session'->>'revision')::integer, 1) AS "sessionRevision",
          current_order.currency_code AS "currencyCode",
          current_order.total_amount::text AS "totalAmount",
          current_order.payment_status AS "paymentStatus"
        FROM orders.orders current_order
        LEFT JOIN LATERAL (
          SELECT payload FROM orders.order_payment_event_inbox event
          WHERE event.store_id = current_order.store_id AND event.order_id = current_order.id
          ORDER BY event.event_sequence DESC LIMIT 1
        ) inbox ON true
        WHERE current_order.store_id = ${request.context.storeId} AND current_order.id = ${result.orderId}
      `);
      const payment = payments[0];
      if (
        payment?.sessionId &&
        ["AUTHORIZED", "PARTIALLY_PAID", "PAID"].includes(payment.paymentStatus)
      ) {
        const refund = ["PARTIALLY_PAID", "PAID"].includes(payment.paymentStatus);
        effects.push({
          route: refund ? "payments.refundPayment" : "payments.voidPayment",
          params: {
            ...base,
            idempotencyKey: `${key}:payment`,
            paymentSessionId: payment.sessionId,
            expectedSessionRevision: payment.sessionRevision,
            reason: requiredString(request.input, "reasonCode"),
            ...(refund
              ? {
                  amount: {
                    amountMinor: payment.totalAmount,
                    currencyCode: payment.currencyCode,
                  },
                }
              : {}),
          },
        });
      }
      return effects;
    }
    if (command === "fulfillmentOrderSubmit" || command === "fulfillmentOrderCancelRequest") {
      const fulfillmentOrderId = requiredUuid(request.input, "fulfillmentOrderId");
      return [
        {
          route: "apps.executeCapability",
          params: {
            storeId: request.context.storeId,
            capability: "fulfillment.service",
            operation:
              command === "fulfillmentOrderSubmit"
                ? "submitFulfillmentRequest"
                : "requestCancellation",
            target: {
              aggregate: "fulfillment-order",
              aggregateId: fulfillmentOrderId,
              domain: `store:${request.context.storeId}`,
            },
            correlationId: request.context.correlationId,
            executionId: result.operationId,
            input: { ...request.input, storeId: request.context.storeId },
          },
        },
      ];
    }
    if (command === "orderIntegrationSyncRequest" || command === "orderIntegrationSyncRetry") {
      const link = await this.integrationRoute(request, result.orderId);
      const snapshot = await this.orderSyncSnapshot(request.context.storeId, result.orderId!);
      return [
        {
          route: "apps.executeCapability",
          params: {
            storeId: request.context.storeId,
            capability: "crm.order-sync",
            operation: "upsertOrder",
            installationId: link.installationId,
            correlationId: request.context.correlationId,
            executionId: result.operationId,
            input: {
              schemaVersion: 1,
              snapshot,
              externalOrderId: link.externalOrderId,
              force: request.input.force === true,
              idempotencyKey: key,
            },
          },
        },
      ];
    }
    return [];
  }

  async recordOperationAttempt(
    storeId: string,
    operationId: string,
    attemptNumber: number,
    effect: AdminOrderExternalEffect,
    response: unknown,
    error?: unknown,
  ): Promise<void> {
    const finishedAt = new Date().toISOString();
    await this.connection.execute(sql`
      INSERT INTO orders.order_operation_attempts (
        store_id, operation_id, attempt_number, provider_route, request_hash,
        response_hash, status, error_code, error_message, completed_at
      ) VALUES (
        ${storeId}, ${operationId}, ${attemptNumber}, ${effect.route}, ${digest(effect.params)},
        ${error ? null : digest(response)},
        ${error ? "FAILED" : "SUCCEEDED"}::orders.order_operation_status,
        ${error ? errorCode(error) : null}, ${error ? errorMessage(error) : null}, ${finishedAt}
      ) ON CONFLICT (store_id, operation_id, attempt_number) DO NOTHING
    `);
  }

  async applyFulfillmentServiceCallback(
    callback: FulfillmentServiceCallbackWorkflowInput,
  ): Promise<CompleteOrderFulfillmentServiceOperationV1Result> {
    const { context, input } = callback;
    const operations = await this.connection.execute<{
      orderId: string;
      fulfillmentOrderId: string;
      kind: string;
    }>(sql`
      SELECT order_id AS "orderId", resource_id AS "fulfillmentOrderId", kind
      FROM orders.order_operations
      WHERE store_id = ${context.storeId} AND id = ${input.operationId}
        AND kind IN ('FULFILLMENT_SUBMIT', 'FULFILLMENT_CANCEL')
      FOR UPDATE
    `);
    const operation = operations[0];
    if (!operation?.orderId || !operation.fulfillmentOrderId) {
      throw new Error("FULFILLMENT_PROVIDER_OPERATION_NOT_FOUND");
    }
    const requests = await this.connection.execute<{ installationId: string }>(sql`
      SELECT app_installation_id AS "installationId"
      FROM orders.order_fulfillment_service_requests
      WHERE store_id = ${context.storeId}
        AND fulfillment_order_id = ${operation.fulfillmentOrderId}
      ORDER BY request_revision DESC LIMIT 1 FOR UPDATE
    `);
    if (requests[0]?.installationId !== context.installationId) {
      throw new Error("FULFILLMENT_PROVIDER_ROUTE_MISMATCH");
    }
    const replay = await this.connection.execute<{ id: string }>(sql`
      SELECT id FROM orders.order_fulfillment_event_inbox
      WHERE store_id = ${context.storeId} AND provider_code = ${context.appCode}
        AND provider_event_id = ${input.providerEventId}
      LIMIT 1
    `);
    const order = await this.lockOrderById(context.storeId, operation.orderId);
    if (replay[0]) {
      return {
        orderId: order.id,
        fulfillmentOrderId: operation.fulfillmentOrderId,
        orderVersion: order.version,
        duplicate: true,
      };
    }
    const requestHash = digest(input);
    await this.connection.execute(sql`
      INSERT INTO orders.order_fulfillment_event_inbox (
        store_id, order_id, provider_code, provider_resource_id, provider_event_id,
        provider_sequence, event_type, schema_version, request_hash, status,
        payload, received_at, processed_at
      ) VALUES (
        ${context.storeId}, ${order.id}, ${context.appCode}, ${input.externalId},
        ${input.providerEventId}, ${input.providerSequence}, ${input.status}, 1,
        ${requestHash}, 'APPLIED', ${JSON.stringify(input.payload)}::jsonb,
        ${input.occurredAt}, ${input.occurredAt}
      )
    `);
    const requestStatus =
      input.status === "REJECTED"
        ? operation.kind === "FULFILLMENT_CANCEL"
          ? "CANCELLATION_REJECTED"
          : "REJECTED"
        : operation.kind === "FULFILLMENT_CANCEL"
          ? "CANCELLATION_ACCEPTED"
          : "ACCEPTED";
    const fulfillmentStatus =
      input.status === "COMPLETED"
        ? "CLOSED"
        : input.status === "CANCELLED"
          ? "CANCELLED"
          : input.status === "IN_PROGRESS"
            ? "IN_PROGRESS"
            : null;
    await this.connection.execute(sql`
      UPDATE orders.order_fulfillment_orders
      SET request_status = ${requestStatus}::orders.order_fulfillment_request_status,
        status = COALESCE(${fulfillmentStatus}::orders.order_fulfillment_order_status, status),
        external_source = ${context.appCode}, external_id = ${input.externalId},
        provider_snapshot = jsonb_build_object(
          'installationId', ${context.installationId}, 'appCode', ${context.appCode},
          'appVersion', ${context.appVersion}, 'externalRevision', ${input.externalRevision}
        ),
        version = version + 1, updated_at = ${input.occurredAt}
      WHERE store_id = ${context.storeId} AND id = ${operation.fulfillmentOrderId}
    `);
    const request: AdminOrderCommandInput = {
      context: {
        organizationId: context.organizationId,
        storeId: context.storeId,
        actor: { type: "APP", id: context.installationId },
        correlationId: context.correlationId,
      },
      input: { idempotencyKey: input.providerEventId },
    };
    const result = await this.bumpAndAudit(
      request,
      order,
      operation.kind === "FULFILLMENT_CANCEL"
        ? "fulfillmentOrderCancelRequest"
        : "fulfillmentOrderSubmit",
      { providerStatus: input.status, externalId: input.externalId },
      input.occurredAt,
    );
    return {
      orderId: order.id,
      fulfillmentOrderId: operation.fulfillmentOrderId,
      orderVersion: result.orderVersion!,
      duplicate: false,
    };
  }

  async applyIntegrationEvent(
    event: IntegrationEventWorkflowInput,
  ): Promise<ApplyOrderIntegrationEventV1Result> {
    const { context, input } = event;
    const links = await this.connection.execute<{
      orderId: string;
      installationId: string;
      externalId: string | null;
    }>(sql`
      SELECT order_id AS "orderId", app_installation_id AS "installationId",
        external_id AS "externalId"
      FROM orders.order_integration_links
      WHERE store_id = ${context.storeId} AND id = ${input.integrationLinkId}
      FOR UPDATE
    `);
    const link = links[0];
    if (!link || link.installationId !== context.installationId) {
      throw new Error("ORDER_INTEGRATION_ROUTE_MISMATCH");
    }
    if (link.externalId && link.externalId !== input.externalOrderId) {
      throw new Error("ORDER_INTEGRATION_EXTERNAL_ID_MISMATCH");
    }
    const replay = await this.connection.execute<{ id: string }>(sql`
      SELECT id FROM orders.order_integration_event_inbox
      WHERE store_id = ${context.storeId} AND app_installation_id = ${context.installationId}
        AND provider_event_id = ${input.providerEventId}
      LIMIT 1
    `);
    const order = await this.lockOrderById(context.storeId, link.orderId);
    if (replay[0]) {
      return {
        orderId: order.id,
        integrationLinkId: input.integrationLinkId,
        orderVersion: order.version,
        duplicate: true,
        reconciliationRequired: input.eventType !== "SYNC_ACKNOWLEDGED",
      };
    }
    const reconciliationRequired = input.eventType !== "SYNC_ACKNOWLEDGED";
    await this.connection.execute(sql`
      INSERT INTO orders.order_integration_event_inbox (
        store_id, order_id, app_installation_id, provider_event_id,
        external_order_id, external_revision, event_type, schema_version,
        status, payload, received_at, processed_at
      ) VALUES (
        ${context.storeId}, ${order.id}, ${context.installationId}, ${input.providerEventId},
        ${input.externalOrderId}, ${input.externalRevision}, ${input.eventType}, 1,
        ${reconciliationRequired ? "IGNORED" : "APPLIED"}::orders.order_inbox_status,
        ${JSON.stringify(input.payload)}::jsonb, ${input.occurredAt}, ${input.occurredAt}
      )
    `);
    await this.connection.execute(sql`
      UPDATE orders.order_integration_links
      SET external_id = COALESCE(external_id, ${input.externalOrderId}),
        last_imported_external_version = ${input.externalRevision},
        status = ${reconciliationRequired ? "OUT_OF_SYNC" : "SYNCED"}::orders.order_integration_sync_status,
        last_synced_at = CASE WHEN ${reconciliationRequired} THEN last_synced_at ELSE ${input.occurredAt}::timestamptz END,
        updated_at = ${input.occurredAt}
      WHERE store_id = ${context.storeId} AND id = ${input.integrationLinkId}
    `);
    const request: AdminOrderCommandInput = {
      context: {
        organizationId: context.organizationId,
        storeId: context.storeId,
        actor: { type: "APP", id: context.installationId },
        correlationId: context.correlationId,
      },
      input: { idempotencyKey: input.providerEventId },
    };
    const result = await this.bumpAndAudit(
      request,
      order,
      "orderIntegrationSyncRequest",
      {
        integrationLinkId: input.integrationLinkId,
        eventType: input.eventType,
        externalRevision: input.externalRevision,
        reconciliationRequired,
      },
      input.occurredAt,
    );
    return {
      orderId: order.id,
      integrationLinkId: input.integrationLinkId,
      orderVersion: result.orderVersion!,
      duplicate: false,
      reconciliationRequired,
    };
  }

  async applyExternalEffectResult(
    command: AdminOrderCommandName,
    request: AdminOrderCommandInput,
    result: AdminOrderCommandResult,
    effect: AdminOrderExternalEffect,
    response: unknown,
  ): Promise<void> {
    const envelope = isPlainRecord(response) ? response : {};
    const data = isPlainRecord(envelope.data) ? envelope.data : envelope;
    const now = new Date().toISOString();
    if (command === "orderIntegrationSyncRequest" || command === "orderIntegrationSyncRetry") {
      const linkId = await this.resolveIntegrationLinkId(request);
      const externalId = optionalString(data.externalId);
      if (!externalId) throw new Error("ORDER_INTEGRATION_EXTERNAL_ID_REQUIRED");
      const externalRevision = optionalString(data.externalRevision);
      const externalUrl = optionalString(data.externalUrl);
      const installationId = optionalUuid(envelope.installationId, "installationId");
      const appCode = optionalString(envelope.appCode);
      const routeRevision = optionalString(envelope.routeRevision);
      const updated = await this.connection.execute<{ id: string }>(sql`
        UPDATE orders.order_integration_links
        SET external_id = ${externalId}, external_url = ${externalUrl},
          status = 'SYNCED', last_exported_order_version = ${result.orderVersion},
          last_synced_at = ${now}, last_error_code = NULL, last_error_message = NULL,
          app_code = COALESCE(${appCode}, app_code),
          updated_at = ${now}
        WHERE store_id = ${request.context.storeId} AND order_id = ${result.orderId}
          AND id = ${linkId}
          AND (${installationId}::uuid IS NULL OR app_installation_id = ${installationId}::uuid)
        RETURNING id
      `);
      if (!updated[0]) throw new Error("ORDER_INTEGRATION_ROUTE_MISMATCH");
      const attempt = await this.connection.execute<{ number: number }>(sql`
        SELECT COALESCE(max(attempt_number), 0)::integer + 1 AS number
        FROM orders.order_integration_sync_attempts
        WHERE store_id = ${request.context.storeId} AND integration_link_id = ${linkId}
      `);
      await this.connection.execute(sql`
        INSERT INTO orders.order_integration_sync_attempts (
          store_id, order_id, integration_link_id, direction, status, attempt_number,
          exported_order_version, external_revision, idempotency_key, request_hash,
          response_hash, started_at, completed_at
        ) VALUES (
          ${request.context.storeId}, ${result.orderId}, ${linkId}, 'EXPORT', 'SUCCEEDED',
          ${attempt[0]?.number ?? 1}, ${result.orderVersion}, ${externalRevision},
          ${requiredString(request.input, "idempotencyKey")}, ${digest(effect.params)},
          ${digest(response)}, ${now}, ${now}
        )
      `);
      await this.connection.execute(sql`
        UPDATE orders.order_integration_links
        SET last_imported_external_version = COALESCE(last_imported_external_version, ${externalRevision}),
          updated_at = ${now}
        WHERE store_id = ${request.context.storeId} AND id = ${linkId}
      `);
      void routeRevision;
      return;
    }
    if (command === "fulfillmentOrderSubmit" || command === "fulfillmentOrderCancelRequest") {
      const fulfillmentOrderId = requiredUuid(request.input, "fulfillmentOrderId");
      const installationId = optionalUuid(envelope.installationId, "installationId");
      const appCode = optionalString(envelope.appCode);
      const externalId = optionalString(data.externalId) ?? optionalString(data.requestId);
      if (!installationId || !appCode) throw new Error("FULFILLMENT_PROVIDER_ROUTE_MISSING");
      const fulfillmentRows = await this.connection.execute<{ orderId: string }>(sql`
        SELECT order_id AS "orderId"
        FROM orders.order_fulfillment_orders
        WHERE store_id = ${request.context.storeId} AND id = ${fulfillmentOrderId}
        FOR UPDATE
      `);
      if (!fulfillmentRows[0]) throw new Error("FULFILLMENT_ORDER_NOT_FOUND");
      const revisionRows = await this.connection.execute<{ revision: number }>(sql`
        SELECT COALESCE(max(request_revision), 0)::integer + 1 AS revision
        FROM orders.order_fulfillment_service_requests
        WHERE store_id = ${request.context.storeId} AND fulfillment_order_id = ${fulfillmentOrderId}
      `);
      await this.connection.execute(sql`
        INSERT INTO orders.order_fulfillment_service_requests (
          store_id, order_id, fulfillment_order_id, app_installation_id, app_code,
          request_revision, status, provider_reference, provider_revision,
          request_snapshot, response_snapshot, submitted_at, responded_at
        ) VALUES (
          ${request.context.storeId}, ${fulfillmentRows[0].orderId}, ${fulfillmentOrderId},
          ${installationId}, ${appCode}, ${revisionRows[0]?.revision ?? 1},
          ${command === "fulfillmentOrderSubmit" ? "ACCEPTED" : "CANCELLATION_ACCEPTED"}::orders.order_fulfillment_request_status,
          ${externalId}, ${optionalString(data.externalRevision)},
          ${JSON.stringify(request.input)}::jsonb, ${JSON.stringify(data)}::jsonb, ${now}, ${now}
        )
      `);
      await this.connection.execute(sql`
        UPDATE orders.order_fulfillment_orders
        SET request_status = ${command === "fulfillmentOrderSubmit" ? "ACCEPTED" : "CANCELLATION_ACCEPTED"}::orders.order_fulfillment_request_status,
          external_source = COALESCE(${appCode}, external_source),
          external_id = COALESCE(${externalId}, external_id),
          provider_snapshot = ${JSON.stringify({
            installationId: installationId ?? null,
            appCode: appCode ?? null,
            routeRevision: optionalString(envelope.routeRevision),
          })}::jsonb,
          version = version + 1, updated_at = ${now}
        WHERE store_id = ${request.context.storeId} AND id = ${fulfillmentOrderId}
      `);
      return;
    }
    if (command === "shipmentCreate") {
      if (optionalString(data.status) !== "ACCEPTED") {
        throw new Error("SHIPMENT_PROVIDER_NOT_CONFIGURED");
      }
      const providerShipmentId = optionalUuid(data.shipmentId, "shipmentId");
      if (!providerShipmentId || !result.orderId)
        throw new Error("SHIPMENT_PROVIDER_RESULT_INVALID");
      const fulfillmentId = requiredUuid(request.input, "fulfillmentId");
      const existing = await this.connection.execute<{ id: string }>(sql`
        SELECT id FROM orders.order_shipments
        WHERE store_id = ${request.context.storeId} AND order_id = ${result.orderId}
          AND external_id = ${providerShipmentId}
        LIMIT 1 FOR UPDATE
      `);
      if (existing[0]) return;
      const shipmentId = uuidv7();
      await this.connection.execute(sql`
        INSERT INTO orders.order_shipments (
          id, store_id, order_id, fulfillment_id, status, carrier_code,
          service_code, external_id, metadata, created_at, updated_at
        ) VALUES (
          ${shipmentId}, ${request.context.storeId}, ${result.orderId}, ${fulfillmentId},
          'LABEL_CREATED', ${optionalString(request.input.providerCode)},
          ${optionalString(request.input.serviceCode)}, ${providerShipmentId},
          ${JSON.stringify({
            providerRevision: 1,
            deliveryOperationId: optionalString(data.operationId),
            deliveryWorkflowId: optionalString(data.workflowId),
          })}::jsonb, ${now}, ${now}
        )
      `);
      const order = await this.lockOrderById(request.context.storeId, result.orderId);
      const packages = requiredArray(request.input, "packages").map(asRecord);
      for (let index = 0; index < packages.length; index += 1) {
        const shipmentPackage = packages[index]!;
        const weight = shipmentPackage.weight ? asRecord(shipmentPackage.weight) : {};
        const dimensions = shipmentPackage.dimensions ? asRecord(shipmentPackage.dimensions) : {};
        const packageId = uuidv7();
        const declaredValue = shipmentPackage.declaredValue
          ? moneyMinor(asRecord(shipmentPackage.declaredValue), order.currency_code)
          : null;
        await this.connection.execute(sql`
          INSERT INTO orders.order_shipment_packages (
            id, store_id, order_id, shipment_id, package_reference,
            weight_value, weight_unit, length_value, width_value, height_value,
            dimensions_unit, declared_value_amount, currency_code, metadata, created_at
          ) VALUES (
            ${packageId}, ${request.context.storeId}, ${result.orderId}, ${shipmentId},
            ${`package-${index + 1}`}, ${optionalPositiveNumber(weight.value)},
            ${optionalString(weight.unit)}, ${optionalPositiveNumber(dimensions.length)},
            ${optionalPositiveNumber(dimensions.width)}, ${optionalPositiveNumber(dimensions.height)},
            ${optionalString(dimensions.unit)}, ${declaredValue}, ${order.currency_code},
            '{}'::jsonb, ${now}
          )
        `);
        for (const rawItem of requiredArray(shipmentPackage, "items")) {
          const item = asRecord(rawItem);
          await this.connection.execute(sql`
            INSERT INTO orders.order_shipment_package_lines (
              store_id, order_id, package_id, fulfillment_id, order_line_id, quantity
            ) VALUES (
              ${request.context.storeId}, ${result.orderId}, ${packageId}, ${fulfillmentId},
              ${requiredUuid(item, "orderLineId")}, ${requiredPositiveInt(item, "quantity")}
            )
          `);
        }
      }
      await this.connection.execute(sql`
        UPDATE orders.orders SET delivery_status = 'NOT_SHIPPED', updated_at = ${now}
        WHERE store_id = ${request.context.storeId} AND id = ${result.orderId}
      `);
    }
  }

  async bulkTargets(request: AdminOrderCommandInput): Promise<readonly AdminOrderBulkTarget[]> {
    const selection = asRecord(request.input.selection);
    const ids =
      selection.ids === undefined
        ? null
        : requiredArray(selection, "ids").map((id) => {
            if (typeof id !== "string" || !isUuid(id)) throw new Error("ORDER_BULK_ID_INVALID");
            return id;
          });
    const excluded =
      selection.excludedIds === undefined
        ? []
        : requiredArray(selection, "excludedIds").map((id) => {
            if (typeof id !== "string" || !isUuid(id)) throw new Error("ORDER_BULK_ID_INVALID");
            return id;
          });
    const where = selection.where ? asRecord(selection.where) : {};
    const statuses = Array.isArray(where.statuses)
      ? where.statuses.filter((value): value is string => typeof value === "string")
      : null;
    if (!ids?.length && Object.keys(where).length === 0) {
      throw new Error("ORDER_BULK_SELECTION_REQUIRED");
    }
    return this.connection.execute<AdminOrderBulkTarget>(sql`
      SELECT current_order.id, current_order.version,
        COALESCE(array_agg(tag.tag ORDER BY tag.tag) FILTER (WHERE tag.tag IS NOT NULL), '{}') AS tags
      FROM orders.orders current_order
      LEFT JOIN orders.order_tags tag
        ON tag.store_id = current_order.store_id AND tag.order_id = current_order.id
      WHERE current_order.store_id = ${request.context.storeId}
        AND (${ids}::uuid[] IS NULL OR current_order.id = ANY(${ids}::uuid[]))
        AND NOT (current_order.id = ANY(${excluded}::uuid[]))
        AND (${statuses}::orders.order_status[] IS NULL OR current_order.status = ANY(${statuses}::orders.order_status[]))
      GROUP BY current_order.id, current_order.version, current_order.created_at
      ORDER BY current_order.created_at, current_order.id
      LIMIT 1000
    `);
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

  private async paymentRoute(storeId: string, transactionId: string) {
    const rows = await this.connection.execute<{
      sessionId: string | null;
      sessionRevision: number;
      currencyCode: string;
      amount: string;
    }>(sql`
      SELECT provider_data->>'paymentSessionId' AS "sessionId",
        COALESCE((provider_data->>'sessionRevision')::integer, 1) AS "sessionRevision",
        currency_code AS "currencyCode", amount::text AS amount
      FROM orders.order_payment_transactions
      WHERE store_id = ${storeId} AND id = ${transactionId}
      FOR UPDATE
    `);
    if (!rows[0]?.sessionId) throw new Error("PAYMENT_SESSION_ROUTE_MISSING");
    return { ...rows[0], sessionId: rows[0].sessionId };
  }

  private async latestPaymentRoute(storeId: string, orderId: string) {
    const rows = await this.connection.execute<{
      sessionId: string | null;
      sessionRevision: number;
      currencyCode: string;
    }>(sql`
      SELECT COALESCE(payload->>'paymentSessionId', payload->'session'->>'paymentSessionId') AS "sessionId",
        COALESCE((payload->>'sessionRevision')::integer, (payload->'session'->>'revision')::integer, 1) AS "sessionRevision",
        current_order.currency_code AS "currencyCode"
      FROM orders.order_payment_event_inbox inbox
      JOIN orders.orders current_order
        ON current_order.store_id = inbox.store_id AND current_order.id = inbox.order_id
      WHERE inbox.store_id = ${storeId} AND inbox.order_id = ${orderId}
      ORDER BY inbox.event_sequence DESC LIMIT 1
    `);
    if (!rows[0]?.sessionId) throw new Error("PAYMENT_SESSION_ROUTE_MISSING");
    return { ...rows[0], sessionId: rows[0].sessionId };
  }

  private async integrationRoute(request: AdminOrderCommandInput, orderId: string | null) {
    if (!orderId) throw new Error("ORDER_NOT_FOUND");
    const linkId = await this.resolveIntegrationLinkId(request);
    const rows = await this.connection.execute<{
      installationId: string;
      externalOrderId: string | null;
    }>(sql`
      SELECT app_installation_id AS "installationId", external_id AS "externalOrderId"
      FROM orders.order_integration_links
      WHERE store_id = ${request.context.storeId} AND order_id = ${orderId} AND id = ${linkId}
      FOR UPDATE
    `);
    if (!rows[0]) throw new Error("ORDER_INTEGRATION_LINK_NOT_FOUND");
    return rows[0];
  }

  private async resolveIntegrationLinkId(request: AdminOrderCommandInput): Promise<string> {
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

  private async orderSyncSnapshot(
    storeId: string,
    orderId: string,
  ): Promise<Record<string, unknown>> {
    const rows = await this.connection.execute<Record<string, unknown>>(sql`
      SELECT jsonb_build_object(
        'schemaVersion', 1,
        'storeId', current_order.store_id,
        'orderId', current_order.id,
        'orderVersion', current_order.version,
        'orderNumber', current_order.order_number::text,
        'status', current_order.status,
        'paymentStatus', current_order.payment_status,
        'fulfillmentStatus', current_order.fulfillment_status,
        'deliveryStatus', current_order.delivery_status,
        'currencyCode', current_order.currency_code,
        'totals', jsonb_build_object(
          'subtotalMinor', current_order.subtotal_amount::text,
          'discountMinor', current_order.discount_amount::text,
          'shippingMinor', current_order.shipping_amount::text,
          'taxMinor', current_order.tax_amount::text,
          'totalMinor', current_order.total_amount::text,
          'paidMinor', COALESCE(payment.paid, 0)::text,
          'refundedMinor', COALESCE(payment.refunded, 0)::text
        ),
        'lines', COALESCE(lines.value, '[]'::jsonb),
        'tags', COALESCE(tags.value, '[]'::jsonb),
        'placedAt', current_order.placed_at,
        'updatedAt', current_order.updated_at
      ) AS snapshot
      FROM orders.orders current_order
      LEFT JOIN LATERAL (
        SELECT
          COALESCE(sum(amount) FILTER (WHERE kind IN ('CAPTURE', 'SALE', 'MANUAL') AND status = 'SUCCESS'), 0) AS paid,
          COALESCE(sum(amount) FILTER (WHERE kind = 'REFUND' AND status = 'SUCCESS'), 0) AS refunded
        FROM orders.order_payment_transactions transaction
        WHERE transaction.store_id = current_order.store_id AND transaction.order_id = current_order.id
      ) payment ON true
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(jsonb_build_object(
          'orderLineId', line.id, 'sku', line.sku, 'title', line.title,
          'quantity', line.quantity, 'unitPriceMinor', line.unit_price_amount::text,
          'totalMinor', line.total_amount::text
        ) ORDER BY line.created_at, line.id) AS value
        FROM orders.order_lines line
        WHERE line.store_id = current_order.store_id AND line.order_id = current_order.id
      ) lines ON true
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(tag.tag ORDER BY tag.tag) AS value
        FROM orders.order_tags tag
        WHERE tag.store_id = current_order.store_id AND tag.order_id = current_order.id
      ) tags ON true
      WHERE current_order.store_id = ${storeId} AND current_order.id = ${orderId}
    `);
    const snapshot = rows[0]?.snapshot;
    if (!snapshot || typeof snapshot !== "object") throw new Error("ORDER_NOT_FOUND");
    return snapshot as Record<string, unknown>;
  }

  async completeOperation(
    command: AdminOrderCommandName,
    request: AdminOrderCommandInput,
    result: AdminOrderCommandResult,
    succeeded: boolean,
    error?: unknown,
  ): Promise<void> {
    const operationId = result.operationId;
    if (!operationId) throw new Error("ORDER_OPERATION_ID_REQUIRED");
    const now = new Date().toISOString();
    if (succeeded && result.orderId) {
      await this.finalizeDomainOperation(command, request, result.orderId, now);
    }
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
  }

  private async finalizeDomainOperation(
    command: AdminOrderCommandName,
    request: AdminOrderCommandInput,
    orderId: string,
    now: string,
  ): Promise<void> {
    const order = await this.lockOrderById(request.context.storeId, orderId);
    let changed = false;
    if (command === "orderCancel") {
      if (order.status === "CANCELLED") return;
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
      await this.bumpAndAudit(
        request,
        fresh,
        `${command}.completed` as AdminOrderCommandName,
        { operationCompleted: true },
        now,
      );
    }
  }

  private async resolveOperationOrderId(
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

  private async findReplay(
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

  private async saveReplay(
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

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("ORDER_COMMAND_OBJECT_REQUIRED");
  }
  return value as Record<string, unknown>;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function jsonObject(value: unknown): Record<string, unknown> {
  if (value === undefined || value === null) return {};
  return asRecord(value);
}

function requiredString(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  if (typeof value !== "string" || !value.trim())
    throw new Error(`ORDER_${field.toUpperCase()}_REQUIRED`);
  return value.trim();
}

function optionalString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new Error("ORDER_STRING_INVALID");
  return value.trim() || null;
}

function requiredUuid(record: Record<string, unknown>, field: string): string {
  const value = requiredString(record, field);
  if (!isUuid(value)) throw new Error(`ORDER_${field.toUpperCase()}_INVALID`);
  return value;
}

function optionalUuid(value: unknown, field: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || !isUuid(value))
    throw new Error(`ORDER_${field.toUpperCase()}_INVALID`);
  return value;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function requiredPositiveInt(record: Record<string, unknown>, field: string): number {
  const value = record[field];
  if (!Number.isSafeInteger(value) || Number(value) <= 0)
    throw new Error(`ORDER_${field.toUpperCase()}_INVALID`);
  return Number(value);
}

function optionalPositiveInt(value: unknown, field: string): number | null {
  if (value === undefined || value === null) return null;
  if (!Number.isSafeInteger(value) || Number(value) <= 0)
    throw new Error(`ORDER_${field.toUpperCase()}_INVALID`);
  return Number(value);
}

function optionalPositiveNumber(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error("ORDER_POSITIVE_NUMBER_INVALID");
  }
  return value;
}

function requiredArray(record: Record<string, unknown>, field: string): unknown[] {
  const value = record[field];
  if (!Array.isArray(value)) throw new Error(`ORDER_${field.toUpperCase()}_REQUIRED`);
  return value;
}

function requiredCurrency(record: Record<string, unknown>, field: string): string {
  const value = requiredString(record, field).toUpperCase();
  if (!/^[A-Z]{3}$/.test(value)) throw new Error("ORDER_CURRENCY_INVALID");
  return value;
}

function optionalBoolean(value: unknown): boolean | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "boolean") throw new Error("ORDER_BOOLEAN_INVALID");
  return value;
}

function requiredDateTime(record: Record<string, unknown>, field: string): string {
  const value = requiredString(record, field);
  if (!Number.isFinite(Date.parse(value))) throw new Error(`ORDER_${field.toUpperCase()}_INVALID`);
  return value;
}

function moneyMinor(value: Record<string, unknown>, expectedCurrency: string): bigint {
  const currency = requiredCurrency(value, "currencyCode");
  if (currency !== expectedCurrency) throw new Error("ORDER_CURRENCY_MISMATCH");
  const parsed = parseDecimalInput(value.amount);
  if (!parsed) throw new Error("ORDER_MONEY_INVALID");
  const normalized = Money.fromMinor(
    BigInt(parsed.amount),
    currency,
    BigInt(parsed.scale),
  ).normalizeScale();
  const minor = normalized.amountMinor();
  if (minor < 0n) throw new Error("ORDER_MONEY_NEGATIVE");
  return minor;
}

function paymentMoney(value: unknown, currencyCode: string, fallbackMinor?: string) {
  if (value === undefined || value === null) {
    if (!fallbackMinor) throw new Error("ORDER_MONEY_REQUIRED");
    return { amountMinor: fallbackMinor, currencyCode };
  }
  const money = asRecord(value);
  return { amountMinor: moneyMinor(money, currencyCode).toString(), currencyCode };
}

function lineTotals(lines: Record<string, unknown>[], currencyCode: string) {
  const subtotal = lines.reduce((sum, line) => {
    const quantity = requiredPositiveInt(line, "quantity");
    return sum + moneyMinor(asRecord(line.unitPrice), currencyCode) * BigInt(quantity);
  }, 0n);
  return { subtotal, total: subtotal };
}

function digest(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, child]) => child !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
    .join(",")}}`;
}

function operationResourceId(input: Record<string, unknown>): string | null {
  for (const field of [
    "shipmentId",
    "fulfillmentId",
    "fulfillmentOrderId",
    "returnId",
    "editId",
    "integrationLinkId",
  ]) {
    if (input[field]) return requiredUuid(input, field);
  }
  return null;
}

function commandResourceType(command: AdminOrderCommandName): string {
  if (command.startsWith("shipment")) return "OrderShipment";
  if (command.startsWith("fulfillmentOrder")) return "OrderFulfillmentOrder";
  if (command.startsWith("fulfillment")) return "OrderFulfillment";
  if (command.startsWith("orderReturn")) return "OrderReturn";
  if (command.startsWith("orderEdit")) return "OrderEditSession";
  return "OrderIntegrationLink";
}

function commandStatus(status: string): string {
  return status.replace(/[^A-Z0-9]+/gi, "_").toUpperCase();
}

function errorCode(error: unknown): string {
  const message = errorMessage(error);
  return /^[A-Z][A-Z0-9_]+$/.test(message) ? message : "ORDER_OPERATION_FAILED";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function escapeSql(value: string): string {
  return value.replaceAll("'", "''");
}
