import { sql, type SQL } from "drizzle-orm";
import type { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../../infrastructure/db/database.js";
import type {
  AdminOrderCommandInput,
  AdminOrderCommandName,
  AdminOrderCommandResult,
} from "../../domain/admin/AdminOrderCommandContracts.js";
import type {
  FulfillmentServiceCallbackWorkflowInput,
  IntegrationEventWorkflowInput,
  IntegrationImportWorkflowInput,
} from "../../domain/integration/OrderProviderContracts.js";
import {
  assertImportableLineQuantity,
  assertImportableOrder,
  assertImportableSnapshot,
  importedLineTotalMinor,
  proratedMinorAmount,
} from "../../domain/integration/orderIntegrationImport.js";
import type {
  ApplyOrderIntegrationEventV1Result,
  ApplyOrderIntegrationImportV1Result,
  CompleteOrderFulfillmentServiceOperationV1Result,
} from "@shopana/broker-types";
import {
  asRecord,
  digest,
  errorCode,
  errorMessage,
  isPlainRecord,
  moneyMinor,
  optionalPositiveNumber,
  optionalString,
  optionalUuid,
  paymentMoney,
  requiredArray,
  requiredPositiveInt,
  requiredString,
  requiredUuid,
} from "./AdminOrderCommandValues.js";

import { AdminOrderCoreRepository } from "./AdminOrderCoreRepository.js";
import type { AdminOrderOperationRepository } from "./AdminOrderOperationRepository.js";
import type { AdminOrderExternalEffect } from "../../application/admin/AdminOrderCommandPorts.js";

export class AdminOrderProviderRepository extends AdminOrderCoreRepository {
  constructor(
    db: Database,
    txManager: TransactionManager<Database>,
    private readonly operations: AdminOrderOperationRepository,
  ) {
    super(db, txManager);
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
                  amount: paymentMoney(request.input.amount, payment.currencyCode, payment.amount),
                }
              : {
                  ...base,
                  paymentSessionId: payment.sessionId,
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
                }
              : {
                  ...base,
                  paymentSessionId: payment.sessionId,
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
          route: "catalog.restockOrderReturnInventory",
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
      const rows = await this.connection.execute<{ fulfillmentOrderId: string }>(sql`
        SELECT fulfillment.fulfillment_order_id AS "fulfillmentOrderId"
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
          route: "catalog.releaseCheckoutInventory",
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
    if (command === "fulfillmentCancel") {
      const fulfillmentId = requiredUuid(request.input, "fulfillmentId");
      const rows = await this.connection.execute<{
        fulfillmentOrderId: string;
        externalSource: string | null;
      }>(sql`
        SELECT fulfillment.fulfillment_order_id AS "fulfillmentOrderId",
          fulfillment_order.external_source AS "externalSource"
        FROM orders.order_fulfillments fulfillment
        JOIN orders.order_fulfillment_orders fulfillment_order
          ON fulfillment_order.store_id = fulfillment.store_id
         AND fulfillment_order.id = fulfillment.fulfillment_order_id
        WHERE fulfillment.store_id = ${request.context.storeId} AND fulfillment.id = ${fulfillmentId}
        FOR UPDATE OF fulfillment_order
      `);
      const fulfillment = rows[0];
      if (!fulfillment) throw new Error("FULFILLMENT_NOT_FOUND");
      if (!fulfillment.externalSource) return [];
      return [
        {
          route: "apps.executeCapability",
          params: {
            storeId: request.context.storeId,
            capability: "fulfillment.service",
            operation: "requestCancellation",
            target: {
              aggregate: "fulfillment-order",
              aggregateId: fulfillment.fulfillmentOrderId,
              domain: `store:${request.context.storeId}`,
            },
            correlationId: request.context.correlationId,
            executionId: result.operationId,
            input: {
              ...request.input,
              storeId: request.context.storeId,
              fulfillmentOrderId: fulfillment.fulfillmentOrderId,
            },
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
        orderVersion: null,
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
        updated_at = ${input.occurredAt}
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
        orderVersion: null,
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

  async applyIntegrationImport(
    importInput: IntegrationImportWorkflowInput,
  ): Promise<ApplyOrderIntegrationImportV1Result> {
    const { context, input } = importInput;
    const snapshot = input.import;
    assertImportableSnapshot(snapshot);
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
    if (link.externalId && link.externalId !== snapshot.externalOrderId) {
      throw new Error("ORDER_INTEGRATION_EXTERNAL_ID_MISMATCH");
    }
    const replay = await this.connection.execute<{ id: string }>(sql`
      SELECT id FROM orders.order_integration_event_inbox
      WHERE store_id = ${context.storeId} AND app_installation_id = ${context.installationId}
        AND provider_event_id = ${input.providerEventId}
      LIMIT 1
    `);
    const revisionReplay = await this.connection.execute<{ id: string }>(sql`
      SELECT id FROM orders.order_integration_event_inbox
      WHERE store_id = ${context.storeId} AND order_id = ${link.orderId}
        AND app_installation_id = ${context.installationId}
        AND external_order_id = ${snapshot.externalOrderId}
        AND external_revision = ${snapshot.externalRevision}
      LIMIT 1
    `);
    const previousImports = await this.connection.execute<{
      observedAt: string;
    }>(sql`
      SELECT payload->>'observedAt' AS "observedAt"
      FROM orders.order_integration_event_inbox
      WHERE store_id = ${context.storeId} AND order_id = ${link.orderId}
        AND app_installation_id = ${context.installationId}
        AND external_order_id = ${snapshot.externalOrderId}
        AND status = 'APPLIED'::orders.order_inbox_status
        AND external_revision IS NOT NULL
        AND payload->>'observedAt' IS NOT NULL
      ORDER BY (payload->>'observedAt')::timestamptz DESC, processed_at DESC, id DESC
      LIMIT 1
    `);
    const order = await this.lockOrderById(context.storeId, link.orderId);
    if (replay[0] || revisionReplay[0]) {
      return {
        orderId: order.id,
        integrationLinkId: input.integrationLinkId,
        orderVersion: null,
        duplicate: true,
      };
    }
    const previousImport = previousImports[0];
    if (
      previousImport &&
      Date.parse(snapshot.observedAt) <= Date.parse(previousImport.observedAt)
    ) {
      throw new Error("ORDER_INTEGRATION_IMPORT_OUT_OF_ORDER");
    }
    assertImportableOrder(order.status);
    // Provider-reported `observedAt` orders facts inside the external system and
    // is kept in the inbox payload; platform bookkeeping columns stay on the
    // server clock so they remain monotonic and cannot be backdated by an app.
    const now = new Date().toISOString();
    const request: AdminOrderCommandInput = {
      context: {
        organizationId: context.organizationId,
        storeId: context.storeId,
        actor: { type: "APP", id: context.installationId },
        correlationId: context.correlationId,
      },
      input: { idempotencyKey: input.idempotencyKey },
    };
    if (
      snapshot.status ||
      snapshot.paymentStatus ||
      snapshot.fulfillmentStatus ||
      snapshot.deliveryStatus
    ) {
      await this.connection.execute(sql`
        UPDATE orders.orders
        SET status = COALESCE(${snapshot.status}::orders.order_status, status),
            closed_at = CASE
              WHEN ${snapshot.status}::orders.order_status = 'CLOSED'
                THEN COALESCE(closed_at, ${now}::timestamptz)
              WHEN ${snapshot.status}::orders.order_status = 'OPEN' THEN NULL
              ELSE closed_at
            END,
            payment_status = COALESCE(
              ${snapshot.paymentStatus}::orders.order_payment_status, payment_status
            ),
            fulfillment_status = COALESCE(
              ${snapshot.fulfillmentStatus}::orders.order_fulfillment_status, fulfillment_status
            ),
            delivery_status = COALESCE(
              ${snapshot.deliveryStatus}::orders.order_delivery_status, delivery_status
            ),
            updated_at = ${now}
        WHERE store_id = ${context.storeId} AND id = ${order.id}
      `);
    }
    if (snapshot.lineQuantities && snapshot.lineQuantities.length > 0) {
      for (const line of snapshot.lineQuantities) {
        await this.applyImportedLineQuantity(context.storeId, order.id, line, now);
      }
      await this.refreshDiscountAllocationTotals(context.storeId, order.id);
      await this.recalculateOrder(context.storeId, order.id, now);
    }
    if (snapshot.tags) {
      await this.replaceTags(request, order.id, snapshot.tags, now);
    }
    await this.connection.execute(sql`
      INSERT INTO orders.order_integration_event_inbox (
        store_id, order_id, app_installation_id, provider_event_id, external_order_id,
        external_revision, event_type, schema_version, status, payload,
        received_at, processed_at
      ) VALUES (
        ${context.storeId}, ${order.id}, ${context.installationId}, ${input.providerEventId},
        ${snapshot.externalOrderId}, ${snapshot.externalRevision}, 'EXTERNAL_CHANGED', 1,
        'APPLIED'::orders.order_inbox_status, ${JSON.stringify(snapshot)}::jsonb,
        ${now}, ${now}
      )
    `);
    await this.connection.execute(sql`
      UPDATE orders.order_integration_links
      SET external_id = COALESCE(external_id, ${snapshot.externalOrderId}),
          last_imported_external_version = ${snapshot.externalRevision},
          status = 'SYNCED'::orders.order_integration_sync_status,
          last_synced_at = ${now}::timestamptz,
          updated_at = ${now}
      WHERE store_id = ${context.storeId} AND id = ${input.integrationLinkId}
    `);
    const result = await this.bumpAndAudit(
      request,
      order,
      "orderIntegrationImportApply",
      { integrationLinkId: input.integrationLinkId, import: snapshot },
      now,
    );
    return {
      orderId: order.id,
      integrationLinkId: input.integrationLinkId,
      orderVersion: result.orderVersion!,
      duplicate: false,
    };
  }

  /**
   * Applies an imported line quantity and keeps the money of that line
   * proportional: detail rows are scaled first, then the line aggregates are
   * rebuilt from them, so tax, duty and discount never describe the quantity
   * that was originally captured.
   */
  private async applyImportedLineQuantity(
    storeId: string,
    orderId: string,
    line: Readonly<{ orderLineId: string; quantity: number }>,
    now: string,
  ): Promise<void> {
    const lines = await this.connection.execute<{
      quantity: number;
      cancelledQuantity: number;
      unitPriceAmount: string;
      discountAmount: string;
      taxAmount: string;
      dutyAmount: string;
    }>(sql`
      SELECT quantity, cancelled_quantity AS "cancelledQuantity",
        unit_price_amount::text AS "unitPriceAmount",
        discount_amount::text AS "discountAmount", tax_amount::text AS "taxAmount",
        duty_amount::text AS "dutyAmount"
      FROM orders.order_lines
      WHERE store_id = ${storeId} AND order_id = ${orderId} AND id = ${line.orderLineId}
      FOR UPDATE
    `);
    const current = lines[0];
    if (!current) throw new Error("ORDER_LINE_NOT_FOUND");
    const fulfilled = await this.connection.execute<{ quantity: number }>(sql`
      SELECT COALESCE(sum(fulfillment_line.quantity), 0)::integer AS quantity
      FROM orders.order_fulfillment_lines fulfillment_line
      JOIN orders.order_fulfillments fulfillment
        ON fulfillment.store_id = fulfillment_line.store_id
       AND fulfillment.order_id = fulfillment_line.order_id
       AND fulfillment.id = fulfillment_line.fulfillment_id
      WHERE fulfillment_line.store_id = ${storeId} AND fulfillment_line.order_id = ${orderId}
        AND fulfillment_line.order_line_id = ${line.orderLineId}
        AND fulfillment.status NOT IN ('FAILURE', 'CANCELLED')
    `);
    assertImportableLineQuantity(line.quantity, {
      quantity: current.quantity,
      cancelledQuantity: current.cancelledQuantity,
      fulfilledQuantity: fulfilled[0]?.quantity ?? 0,
    });
    if (line.quantity === current.quantity) return;
    await this.reconcileImportedRouting(
      storeId,
      orderId,
      line.orderLineId,
      line.quantity - current.cancelledQuantity,
    );
    const scale = { next: line.quantity, previous: current.quantity };
    const taxLines = await this.scaleLineDetailAmounts(
      sql`orders.order_line_tax_lines`,
      storeId,
      orderId,
      line.orderLineId,
      scale,
    );
    const dutyLines = await this.scaleLineDetailAmounts(
      sql`orders.order_line_duties`,
      storeId,
      orderId,
      line.orderLineId,
      scale,
    );
    const discountAllocations = await this.scaleLineDetailAmounts(
      sql`orders.order_line_discount_allocations`,
      storeId,
      orderId,
      line.orderLineId,
      scale,
    );
    const detailTotal = (amounts: readonly string[], fallbackMinor: string): bigint =>
      amounts.length > 0
        ? amounts.reduce((total, amount) => total + BigInt(amount), 0n)
        : proratedMinorAmount(fallbackMinor, scale.next, scale.previous);
    const tax = detailTotal(taxLines, current.taxAmount);
    const duty = detailTotal(dutyLines, current.dutyAmount);
    const discount = detailTotal(discountAllocations, current.discountAmount);
    const subtotal = BigInt(current.unitPriceAmount) * BigInt(line.quantity);
    const total = importedLineTotalMinor(subtotal, discount, tax, duty);
    const updated = await this.connection.execute<{ id: string }>(sql`
      UPDATE orders.order_lines
      SET quantity = ${line.quantity},
          subtotal_amount = ${subtotal.toString()},
          discount_amount = ${discount.toString()},
          tax_amount = ${tax.toString()},
          duty_amount = ${duty.toString()},
          total_amount = ${total.toString()},
          updated_at = ${now}
      WHERE store_id = ${storeId} AND order_id = ${orderId} AND id = ${line.orderLineId}
      RETURNING id
    `);
    if (!updated[0]) throw new Error("ORDER_LINE_NOT_FOUND");
  }

  /**
   * Shrinks only unfulfilled routed capacity. Fulfilled quantities are hard
   * floors; the remainder is removed deterministically by route id so the
   * deferred order-integrity checks see the same quantity at every layer.
   */
  private async reconcileImportedRouting(
    storeId: string,
    orderId: string,
    orderLineId: string,
    targetQuantity: number,
  ): Promise<void> {
    const fulfillmentOrderLines = await this.connection.execute<{
      id: string;
      quantity: number;
      deliveryGroupId: string | null;
    }>(sql`
      SELECT line.fulfillment_order_id AS id, line.quantity,
        fulfillment_order.delivery_group_id AS "deliveryGroupId"
      FROM orders.order_fulfillment_order_lines line
      JOIN orders.order_fulfillment_orders fulfillment_order
        ON fulfillment_order.store_id = line.store_id
       AND fulfillment_order.order_id = line.order_id
       AND fulfillment_order.id = line.fulfillment_order_id
      WHERE line.store_id = ${storeId} AND line.order_id = ${orderId}
        AND line.order_line_id = ${orderLineId}
        AND fulfillment_order.status <> 'CANCELLED'::orders.order_fulfillment_order_status
      ORDER BY line.fulfillment_order_id
      FOR UPDATE OF line, fulfillment_order
    `);
    const routedWithFloors: RoutedQuantity[] = [];
    for (const route of fulfillmentOrderLines) {
      const fulfilled = await this.connection.execute<{ quantity: number }>(sql`
        SELECT COALESCE(sum(fulfillment_line.quantity), 0)::integer AS quantity
        FROM orders.order_fulfillment_lines fulfillment_line
        JOIN orders.order_fulfillments fulfillment
          ON fulfillment.store_id = fulfillment_line.store_id
         AND fulfillment.order_id = fulfillment_line.order_id
         AND fulfillment.id = fulfillment_line.fulfillment_id
        WHERE fulfillment_line.store_id = ${storeId}
          AND fulfillment_line.order_id = ${orderId}
          AND fulfillment_line.order_line_id = ${orderLineId}
          AND fulfillment.fulfillment_order_id = ${route.id}
          AND fulfillment.status NOT IN ('FAILURE', 'CANCELLED')
      `);
      routedWithFloors.push({
        id: route.id,
        quantity: route.quantity,
        floor: fulfilled[0]?.quantity ?? 0,
        groupId: route.deliveryGroupId,
      });
    }
    const nextFulfillmentRoutes = allocateRoutedQuantities(routedWithFloors, targetQuantity);
    const groupFloors = new Map<string, number>();
    for (const route of nextFulfillmentRoutes) {
      if (route.groupId) {
        groupFloors.set(route.groupId, (groupFloors.get(route.groupId) ?? 0) + route.quantity);
      }
      if (route.quantity === 0) {
        await this.connection.execute(sql`
          DELETE FROM orders.order_fulfillment_order_lines
          WHERE store_id = ${storeId} AND order_id = ${orderId}
            AND fulfillment_order_id = ${route.id} AND order_line_id = ${orderLineId}
        `);
      } else {
        await this.connection.execute(sql`
          UPDATE orders.order_fulfillment_order_lines SET quantity = ${route.quantity}
          WHERE store_id = ${storeId} AND order_id = ${orderId}
            AND fulfillment_order_id = ${route.id} AND order_line_id = ${orderLineId}
        `);
      }
    }

    const deliveryGroupLines = await this.connection.execute<{
      id: string;
      quantity: number;
    }>(sql`
      SELECT line.delivery_group_id AS id, line.quantity
      FROM orders.order_delivery_group_lines line
      JOIN orders.order_delivery_groups delivery_group
        ON delivery_group.store_id = line.store_id
       AND delivery_group.order_id = line.order_id
       AND delivery_group.id = line.delivery_group_id
      WHERE line.store_id = ${storeId} AND line.order_id = ${orderId}
        AND line.order_line_id = ${orderLineId}
        AND delivery_group.status <> 'CANCELLED'::orders.order_delivery_group_status
      ORDER BY line.delivery_group_id
      FOR UPDATE OF line, delivery_group
    `);
    const nextDeliveryRoutes = allocateRoutedQuantities(
      deliveryGroupLines.map((route) => ({
        ...route,
        floor: groupFloors.get(route.id) ?? 0,
        groupId: null,
      })),
      targetQuantity,
    );
    for (const route of nextDeliveryRoutes) {
      if (route.quantity === 0) {
        await this.connection.execute(sql`
          DELETE FROM orders.order_delivery_group_lines
          WHERE store_id = ${storeId} AND order_id = ${orderId}
            AND delivery_group_id = ${route.id} AND order_line_id = ${orderLineId}
        `);
      } else {
        await this.connection.execute(sql`
          UPDATE orders.order_delivery_group_lines SET quantity = ${route.quantity}
          WHERE store_id = ${storeId} AND order_id = ${orderId}
            AND delivery_group_id = ${route.id} AND order_line_id = ${orderLineId}
        `);
      }
    }
  }

  private async scaleLineDetailAmounts(
    table: SQL,
    storeId: string,
    orderId: string,
    orderLineId: string,
    scale: Readonly<{ next: number; previous: number }>,
  ): Promise<readonly string[]> {
    const rows = await this.connection.execute<{ amount: string }>(sql`
      UPDATE ${table}
      SET amount = amount * ${scale.next} / ${scale.previous}
      WHERE store_id = ${storeId} AND order_id = ${orderId} AND order_line_id = ${orderLineId}
      RETURNING amount::text AS amount
    `);
    return rows.map((row) => row.amount);
  }

  /** Keeps discount applications consistent with their per-line allocations. */
  private async refreshDiscountAllocationTotals(storeId: string, orderId: string): Promise<void> {
    await this.connection.execute(sql`
      UPDATE orders.order_discount_applications application
      SET total_allocated_amount = COALESCE(allocation.amount, 0)
      FROM (
        SELECT discount_application_id AS id, sum(amount) AS amount
        FROM orders.order_line_discount_allocations
        WHERE store_id = ${storeId} AND order_id = ${orderId}
        GROUP BY discount_application_id
      ) allocation
      WHERE application.store_id = ${storeId} AND application.order_id = ${orderId}
        AND application.id = allocation.id
    `);
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
      const linkId = await this.operations.resolveIntegrationLinkId(request);
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
      const fulfillmentRows = await this.connection.execute<{ orderId: string }>(sql`
        SELECT order_id AS "orderId"
        FROM orders.order_fulfillment_orders
        WHERE store_id = ${request.context.storeId} AND id = ${fulfillmentOrderId}
        FOR UPDATE
      `);
      if (!fulfillmentRows[0]) throw new Error("FULFILLMENT_ORDER_NOT_FOUND");
      await this.recordFulfillmentServiceRequest({
        request,
        envelope,
        data,
        orderId: fulfillmentRows[0].orderId,
        fulfillmentOrderId,
        status: command === "fulfillmentOrderSubmit" ? "ACCEPTED" : "CANCELLATION_ACCEPTED",
        adoptExternalIdentity: true,
        now,
      });
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
      const shipmentId = await this.generateUuidV7();
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
        const packageId = await this.generateUuidV7();
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
      await this.recordShipmentProviderOperation(
        request,
        result.orderId!,
        shipmentId,
        "CREATE",
        "delivery.createDeliveryShipment",
        optionalString(data.shipmentId),
        data,
        now,
      );
    }
    if (command === "fulfillmentCancel") {
      const fulfillmentId = requiredUuid(request.input, "fulfillmentId");
      const fulfillmentRows = await this.connection.execute<{ fulfillmentOrderId: string }>(sql`
        SELECT fulfillment_order_id AS "fulfillmentOrderId"
        FROM orders.order_fulfillments
        WHERE store_id = ${request.context.storeId} AND id = ${fulfillmentId}
        FOR UPDATE
      `);
      const fulfillmentOrderId = fulfillmentRows[0]?.fulfillmentOrderId;
      if (!fulfillmentOrderId) throw new Error("FULFILLMENT_ORDER_NOT_FOUND");
      await this.recordFulfillmentServiceRequest({
        request,
        envelope,
        data,
        orderId: result.orderId!,
        fulfillmentOrderId,
        status: "CANCELLATION_ACCEPTED",
        adoptExternalIdentity: false,
        now,
      });
    }
    if (command === "shipmentCancel") {
      const shipmentId = requiredUuid(request.input, "shipmentId");
      if (optionalString(data.status) !== "ACCEPTED") {
        throw new Error("SHIPMENT_CANCEL_NOT_ACCEPTED");
      }
      const updated = await this.connection.execute<{ id: string }>(sql`
        UPDATE orders.order_shipments
        SET status = 'CANCELLED'::orders.order_shipment_status, updated_at = ${now},
            metadata = jsonb_set(
              COALESCE(metadata, '{}'::jsonb),
              '{deliveryOperationId}', to_jsonb(${optionalString(data.operationId)}::text), true
            )
        WHERE store_id = ${request.context.storeId} AND id = ${shipmentId}
        RETURNING id
      `);
      if (!updated[0]) throw new Error("SHIPMENT_NOT_FOUND");
      await this.connection.execute(sql`
        INSERT INTO orders.order_shipment_tracking_events (
          store_id, order_id, shipment_id, status, message, happened_at
        )
        SELECT store_id, order_id, id, 'CANCELLED'::orders.order_shipment_status,
          'shipmentCancel', ${now}::timestamptz
        FROM orders.order_shipments
        WHERE store_id = ${request.context.storeId} AND id = ${shipmentId}
      `);
      await this.recordShipmentProviderOperation(
        request,
        result.orderId!,
        shipmentId,
        "CANCEL",
        "delivery.cancelDeliveryShipment",
        optionalString(data.shipmentId),
        data,
        now,
      );
    }
    if (command === "shipmentReconcile") {
      const shipmentId = requiredUuid(request.input, "shipmentId");
      const mappedStatus = mapDeliveryShipmentState(optionalString(data.shipmentState));
      if (mappedStatus) {
        await this.connection.execute(sql`
          UPDATE orders.order_shipments
          SET status = ${mappedStatus}::orders.order_shipment_status,
              metadata = jsonb_set(
                COALESCE(metadata, '{}'::jsonb),
                '{reconcile}', ${JSON.stringify(data)}::jsonb, true
              ),
              updated_at = ${now}
          WHERE store_id = ${request.context.storeId} AND id = ${shipmentId}
        `);
      } else {
        await this.connection.execute(sql`
          UPDATE orders.order_shipments
          SET metadata = jsonb_set(
                COALESCE(metadata, '{}'::jsonb),
                '{reconcile}', ${JSON.stringify(data)}::jsonb, true
              ),
              updated_at = ${now}
          WHERE store_id = ${request.context.storeId} AND id = ${shipmentId}
        `);
      }
      const events = Array.isArray(data.events) ? data.events.map(asRecord) : [];
      for (const event of events) {
        const eventStatus = mapDeliveryShipmentState(optionalString(event.state)) ?? "IN_TRANSIT";
        await this.connection.execute(sql`
          INSERT INTO orders.order_shipment_tracking_events (
            store_id, order_id, shipment_id, status, message, happened_at
          )
          SELECT store_id, order_id, id,
            ${eventStatus}::orders.order_shipment_status,
            ${optionalString(event.message)}, ${optionalString(event.occurredAt) ?? now}::timestamptz
          FROM orders.order_shipments
          WHERE store_id = ${request.context.storeId} AND id = ${shipmentId}
        `);
      }
      await this.recordShipmentProviderOperation(
        request,
        result.orderId!,
        shipmentId,
        "RECONCILE",
        "delivery.reconcileDeliveryShipment",
        optionalString(data.providerShipmentReference) ?? optionalString(data.shipmentId),
        data,
        now,
      );
    }
  }

  /**
   * Records one provider round trip against a fulfillment order. Both the
   * submit/cancel-request commands and the fulfillment-level cancellation share
   * it so the request revision, provider snapshot and audit trail stay uniform.
   */
  private async recordFulfillmentServiceRequest(
    input: Readonly<{
      request: AdminOrderCommandInput;
      envelope: Record<string, unknown>;
      data: Record<string, unknown>;
      orderId: string;
      fulfillmentOrderId: string;
      status: "ACCEPTED" | "CANCELLATION_ACCEPTED";
      adoptExternalIdentity: boolean;
      now: string;
    }>,
  ): Promise<void> {
    const { request, envelope, data, fulfillmentOrderId, now } = input;
    const storeId = request.context.storeId;
    const installationId = optionalUuid(envelope.installationId, "installationId");
    const appCode = optionalString(envelope.appCode);
    if (!installationId || !appCode) throw new Error("FULFILLMENT_PROVIDER_ROUTE_MISSING");
    const externalId = optionalString(data.externalId) ?? optionalString(data.requestId);
    const revisionRows = await this.connection.execute<{ revision: number }>(sql`
      SELECT COALESCE(max(request_revision), 0)::integer + 1 AS revision
      FROM orders.order_fulfillment_service_requests
      WHERE store_id = ${storeId} AND fulfillment_order_id = ${fulfillmentOrderId}
    `);
    await this.connection.execute(sql`
      INSERT INTO orders.order_fulfillment_service_requests (
        store_id, order_id, fulfillment_order_id, app_installation_id, app_code,
        request_revision, status, provider_reference, provider_revision,
        request_snapshot, response_snapshot, submitted_at, responded_at
      ) VALUES (
        ${storeId}, ${input.orderId}, ${fulfillmentOrderId},
        ${installationId}, ${appCode}, ${revisionRows[0]?.revision ?? 1},
        ${input.status}::orders.order_fulfillment_request_status,
        ${externalId}, ${optionalString(data.externalRevision)},
        ${JSON.stringify(request.input)}::jsonb, ${JSON.stringify(data)}::jsonb, ${now}, ${now}
      )
    `);
    const externalIdentity = input.adoptExternalIdentity
      ? sql`external_source = COALESCE(${appCode}, external_source),
          external_id = COALESCE(${externalId}, external_id),`
      : sql``;
    await this.connection.execute(sql`
      UPDATE orders.order_fulfillment_orders
      SET request_status = ${input.status}::orders.order_fulfillment_request_status,
        ${externalIdentity}
        provider_snapshot = ${JSON.stringify({
          installationId,
          appCode,
          routeRevision: optionalString(envelope.routeRevision),
        })}::jsonb,
        updated_at = ${now}
      WHERE store_id = ${storeId} AND id = ${fulfillmentOrderId}
    `);
  }

  private async recordShipmentProviderOperation(
    request: AdminOrderCommandInput,
    orderId: string,
    shipmentId: string,
    operation: "CREATE" | "CANCEL" | "RECONCILE",
    route: string,
    providerReference: string | null,
    response: unknown,
    now: string,
  ): Promise<void> {
    await this.connection.execute(sql`
      INSERT INTO orders.order_shipment_provider_operations (
        store_id, order_id, shipment_id, operation, status, provider_code,
        provider_route, idempotency_key, request_hash, provider_reference,
        response, attempts, available_at, completed_at, created_at, updated_at
      ) VALUES (
        ${request.context.storeId}, ${orderId}, ${shipmentId}, ${operation},
        'SUCCEEDED'::orders.order_operation_status, 'delivery', ${route},
        ${requiredString(request.input, "idempotencyKey")}, ${digest(request.input)},
        ${providerReference}, ${JSON.stringify(response)}::jsonb, 1, ${now}, ${now}, ${now}, ${now}
      )
      ON CONFLICT ("store_id", "provider_route", "idempotency_key") DO NOTHING
    `);
  }

  protected async paymentRoute(storeId: string, transactionId: string) {
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

  protected async latestPaymentRoute(storeId: string, orderId: string) {
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

  protected async integrationRoute(request: AdminOrderCommandInput, orderId: string | null) {
    if (!orderId) throw new Error("ORDER_NOT_FOUND");
    const linkId = await this.operations.resolveIntegrationLinkId(request);
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

  protected async orderSyncSnapshot(
    storeId: string,
    orderId: string,
  ): Promise<Record<string, unknown>> {
    const rows = await this.connection.execute<Record<string, unknown>>(sql`
      SELECT jsonb_build_object(
        'schemaVersion', 1,
        'storeId', current_order.store_id,
        'orderId', current_order.id,
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
}

type RoutedQuantity = Readonly<{
  id: string;
  quantity: number;
  floor: number;
  groupId: string | null;
}>;

function allocateRoutedQuantities(
  routes: readonly RoutedQuantity[],
  targetQuantity: number,
): readonly RoutedQuantity[] {
  const currentTotal = routes.reduce((total, route) => total + route.quantity, 0);
  const desiredTotal = Math.min(currentTotal, targetQuantity);
  const floorTotal = routes.reduce((total, route) => total + route.floor, 0);
  if (floorTotal > desiredTotal) {
    throw new Error("ORDER_INTEGRATION_IMPORT_LINE_FULFILLED");
  }
  let remaining = desiredTotal - floorTotal;
  return routes.map((route) => {
    const available = route.quantity - route.floor;
    if (available < 0) throw new Error("ORDER_INTEGRATION_IMPORT_LINE_FULFILLED");
    const retained = Math.min(available, remaining);
    remaining -= retained;
    return { ...route, quantity: route.floor + retained };
  });
}

function mapDeliveryShipmentState(state: string | null): string | null {
  switch (state) {
    case "PENDING":
      return "LABEL_CREATED";
    case "ACCEPTED":
      return "READY_FOR_PICKUP";
    case "IN_TRANSIT":
      return "IN_TRANSIT";
    case "OUT_FOR_DELIVERY":
      return "OUT_FOR_DELIVERY";
    case "DELIVERED":
      return "DELIVERED";
    case "DELIVERY_FAILED":
      return "EXCEPTION";
    case "RETURNING":
    case "RETURNED":
      return "RETURNED_TO_SENDER";
    case "CANCELLED":
      return "CANCELLED";
    default:
      return null;
  }
}
