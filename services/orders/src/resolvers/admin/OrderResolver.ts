import { GlobalIdEntity, parseGlobalId } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError, SubgraphReference, TypePolicy } from "@shopana/type-resolver";
import { OrdersType } from "./OrdersType.js";
import {
  mapDiscount,
  mapFulfillmentOrder,
  mapLine,
  mapPayment,
  mapTaxLine,
} from "./entityMappers.js";
import {
  encodeId,
  money,
  nullableString,
  numberValue,
  rowValue,
  rowsValue,
  stringValue,
  value,
  type Row,
} from "./values.js";
import {
  computeReturnEligibility,
  extractReturnPolicy,
} from "../../domain/order/returnEligibility.js";

@TypePolicy<OrderResolver>({
  resource: "store.data",
  action: "read",
  organizationId: (resolver) => resolver.$ctx.store.organizationId,
  domain: (resolver) => `store:${resolver.$ctx.store.id}`,
})
@SubgraphReference()
export class OrderResolver extends OrdersType<string, Row> {
  private sensitiveAccess?: Promise<boolean>;

  protected async $preload(): Promise<Row> {
    const row = await this.$ctx.loaders.order.load(this.$props);
    if (!row) throw new PreloadNotFoundError(`Order with ID ${this.$props} not found`);
    return row;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.Order);
  }

  async number() {
    return stringValue(await this.$data, "orderNumber");
  }
  async status() {
    return stringValue(await this.$data, "status");
  }
  async paymentStatus() {
    return stringValue(await this.$data, "paymentStatus");
  }
  async fulfillmentStatus() {
    return stringValue(await this.$data, "fulfillmentStatus");
  }
  async deliveryStatus() {
    return stringValue(await this.$data, "deliveryStatus");
  }
  async returnStatus() {
    return stringValue(await this.$data, "returnStatus");
  }
  async riskLevel() {
    return stringValue(await this.$data, "riskLevel", "NONE");
  }
  async origin() {
    return stringValue(await this.$data, "origin");
  }

  async availableActions() {
    const row = await this.$data;
    const authorization = {
      organizationId: this.$ctx.store.organizationId,
      domain: `store:${this.$ctx.store.id}`,
      resource: "store.data",
    } as const;
    const [canWrite, canAdmin] = await Promise.all([
      this.authProvider.authorize({ ...authorization, action: "write" }),
      this.canReadSensitiveData(),
    ]);
    if (!canWrite) return [];

    const status = stringValue(row, "status");
    const actions: string[] =
      status === "DRAFT"
        ? ["UPDATE_DETAILS", "EDIT_LINES", "COMPLETE_DRAFT"]
        : status === "OPEN"
          ? ["UPDATE_DETAILS", "EDIT_LINES", "CANCEL", "CLOSE"]
          : status === "CLOSED"
            ? ["REOPEN"]
            : [];

    if (status === "OPEN" && canAdmin) {
      const paymentStatus = stringValue(row, "paymentStatus");
      const lines = await this.lines();
      const hasFulfillableLines = lines.some((line) => line.fulfillableQuantity > 0);
      const hasReturnableLines = lines.some((line) => line.returnableQuantity > 0);
      const placement = rowValue(row, "checkoutPlacement");
      const placementReady = !placement || stringValue(placement, "status") === "CONFIRMED";
      const selectedPaymentMethod =
        rowsValue(row, "paymentMethods").find((method) => value(method, "isSelected") === true) ??
        rowsValue(row, "paymentMethods")[0];
      const paymentCapabilities = stringArray(
        value(rowValue(selectedPaymentMethod ?? {}, "providerData") ?? {}, "capabilities"),
      );
      const supportsPayment = (capability: string) =>
        paymentCapabilities.length === 0 || paymentCapabilities.includes(capability);
      const supportsFulfillment = rowsValue(row, "fulfillmentOrders").some((item) => {
        const providerSnapshot = rowValue(item, "providerSnapshot") ?? {};
        const snapshot = rowValue(providerSnapshot, "snapshot") ?? providerSnapshot;
        const capabilities = stringArray(value(snapshot, "supportedActions"));
        return (
          capabilities.length === 0 ||
          capabilities.some((action) => action === "CREATE_SHIPMENT" || action === "FULFILL")
        );
      });
      if (["PENDING", "PARTIALLY_PAID"].includes(paymentStatus)) {
        actions.push("RECORD_MANUAL_PAYMENT");
      }
      if (paymentStatus === "AUTHORIZED" && supportsPayment("CAPTURE")) {
        actions.push("CAPTURE_PAYMENT");
      }
      if (paymentStatus === "AUTHORIZED" && supportsPayment("VOID")) actions.push("VOID_PAYMENT");
      if (["PAID", "PARTIALLY_REFUNDED"].includes(paymentStatus) && supportsPayment("REFUND")) {
        actions.push("REFUND");
      }
      if (paymentStatus === "FAILED" && supportsPayment("RETRY")) actions.push("RETRY_PAYMENT");
      if (hasFulfillableLines && placementReady && supportsFulfillment) {
        actions.push("CREATE_FULFILLMENT");
      }
      if (hasReturnableLines) actions.push("CREATE_RETURN", "CREATE_EXCHANGE");
      if (rowsValue(row, "integrationLinks").length > 0) {
        actions.push("REQUEST_INTEGRATION_SYNC");
      }
    }
    actions.push(value(row, "archivedAt") ? "UNARCHIVE" : "ARCHIVE");
    return actions;
  }

  async source() {
    const row = await this.$data;
    const code = nullableString(row, "externalSource") ?? nullableString(row, "salesChannel");
    return code ? { code, externalId: nullableString(row, "externalId"), externalUrl: null } : null;
  }

  async checkout() {
    const id = nullableString(await this.$data, "checkoutId");
    return id ? { __typename: "Checkout", id: encodeId(id, GlobalIdEntity.Checkout) } : null;
  }

  async checkoutPlacement() {
    const placement = rowValue(await this.$data, "checkoutPlacement");
    if (!placement) return null;
    return {
      placementId: encodeId(
        stringValue(placement, "placementId"),
        GlobalIdEntity.CheckoutPlacement,
      ),
      checkoutId: encodeId(stringValue(placement, "checkoutId"), GlobalIdEntity.Checkout),
      resultRevision: stringValue(placement, "resultRevision"),
      finalQuoteRevision: stringValue(placement, "finalQuoteRevision"),
      paymentMethodsRevision: stringValue(placement, "paymentMethodsRevision"),
      deliveryRevision: stringValue(placement, "deliveryRevision"),
      contractVersion: numberValue(placement, "contractVersion", 1),
      snapshotHash: stringValue(placement, "snapshotHash"),
      status: stringValue(placement, "status"),
      confirmedAt: nullableString(placement, "confirmedAt"),
      failedAt: nullableString(placement, "failedAt"),
    };
  }

  async customer() {
    const id = nullableString(await this.$data, "customerId");
    return id ? { __typename: "Customer", id: encodeId(id, GlobalIdEntity.Customer) } : null;
  }

  async customerSnapshot() {
    const row = await this.$data;
    const shippingAddress = rowsValue(row, "addresses").find(
      (address) => stringValue(address, "type") === "SHIPPING",
    );
    return new OrderCustomerSnapshotResolver(
      {
        contact: rowValue(row, "contact") ?? {},
        customerId: nullableString(row, "customerId"),
        countryCode: shippingAddress ? nullableString(shippingAddress, "countryCode") : null,
      },
      this.$ctx,
    );
  }

  async contact() {
    return new OrderContactResolver(rowValue(await this.$data, "contact") ?? {}, this.$ctx);
  }

  async billingAddress() {
    return this.address("BILLING");
  }
  async shippingAddress() {
    return this.address("SHIPPING");
  }
  async localeCode() {
    return nullableString(await this.$data, "localeCode");
  }
  async currencyCode() {
    return stringValue(await this.$data, "currencyCode");
  }

  async cost() {
    const row = await this.$data;
    const currency = stringValue(row, "currencyCode");
    const payment = mapPayment(row, currency);
    return {
      subtotalAmount: money(value(row, "subtotalAmount"), currency),
      discountAmount: money(value(row, "discountAmount"), currency),
      shippingAmount: money(value(row, "shippingAmount"), currency),
      taxAmount: money(value(row, "taxAmount"), currency),
      dutyAmount: money(value(row, "dutyAmount"), currency),
      adjustmentAmount: money(value(row, "adjustmentAmount"), currency),
      totalAmount: money(value(row, "totalAmount"), currency),
      paidAmount: payment.capturedAmount,
      refundedAmount: payment.refundedAmount,
      outstandingAmount: payment.outstandingAmount,
    };
  }

  async totalQuantity() {
    return rowsValue(await this.$data, "lines").reduce(
      (sum, line) => sum + numberValue(line, "quantity"),
      0,
    );
  }

  async lines() {
    const row = await this.$data;
    const currency = stringValue(row, "currencyCode");
    const successfulFulfillmentIds = new Set(
      rowsValue(row, "fulfillments")
        .filter((fulfillment) => stringValue(fulfillment, "status") === "SUCCESS")
        .map((fulfillment) => stringValue(fulfillment, "id")),
    );
    const fulfilled = quantityByLine(
      rowsValue(row, "fulfillmentLines").filter((line) =>
        successfulFulfillmentIds.has(stringValue(line, "fulfillmentId")),
      ),
      "orderLineId",
      "quantity",
    );
    const received = quantityByLine(
      rowsValue(row, "returnLines"),
      "orderLineId",
      "receivedQuantity",
    );
    const openReturnIds = new Set(
      rowsValue(row, "returns")
        .filter((item) => !["REJECTED", "CANCELLED"].includes(stringValue(item, "status")))
        .map((item) => stringValue(item, "id")),
    );
    const requested = quantityByLine(
      rowsValue(row, "returnLines").filter((item) =>
        openReturnIds.has(stringValue(item, "returnRequestId")),
      ),
      "orderLineId",
      "requestedQuantity",
    );
    const eligibility = new Map(
      computeReturnEligibility(
        {
          orderStatus: stringValue(row, "status"),
          returnWindowStartedAt: returnWindowStartedAt(
            rowsValue(row, "fulfillments"),
            rowsValue(row, "shipments"),
          ),
          now: new Date().toISOString(),
          returnPolicy: extractReturnPolicy(rowValue(row, "metadata")),
        },
        rowsValue(row, "lines").map((line) => ({
          orderLineId: stringValue(line, "id"),
          quantity: numberValue(line, "quantity"),
          cancelledQuantity: numberValue(line, "cancelledQuantity"),
          fulfilledQuantity: fulfilled.get(stringValue(line, "id")) ?? 0,
          requestedQuantity: requested.get(stringValue(line, "id")) ?? 0,
        })),
      ).map((item) => [item.orderLineId, item] as const),
    );
    return rowsValue(row, "lines").map((line) => {
      const mapped = mapLine(line, currency);
      const lineId = stringValue(line, "id");
      const fulfilledQuantity = fulfilled.get(lineId) ?? 0;
      const returnedQuantity = received.get(lineId) ?? 0;
      return {
        ...mapped,
        fulfilledQuantity,
        returnedQuantity,
        fulfillableQuantity: Math.max(
          0,
          mapped.quantity - mapped.cancelledQuantity - fulfilledQuantity,
        ),
        returnableQuantity: eligibility.get(lineId)?.maxReturnableQuantity ?? 0,
      };
    });
  }

  async discounts() {
    const row = await this.$data;
    return rowsValue(row, "discounts").map((item) =>
      mapDiscount(item, stringValue(row, "currencyCode")),
    );
  }

  async taxLines() {
    const row = await this.$data;
    return rowsValue(row, "taxLines").map((item) =>
      mapTaxLine(item, stringValue(row, "currencyCode")),
    );
  }

  async deliveryGroups() {
    const order = await this.$data;
    const lines = new Map(
      (await this.lines()).map((line) => [decodeGlobalId(line.id), line] as const),
    );
    const links = rowsValue(order, "deliveryGroupLines");
    const methods = rowsValue(order, "deliveryMethods");
    const addresses = rowsValue(order, "addresses");
    const recipients = rowsValue(order, "recipients");
    const currency = stringValue(order, "currencyCode");
    return rowsValue(order, "deliveryGroups").map((group) => {
      const groupId = stringValue(group, "id");
      const addressId = nullableString(group, "addressId");
      const recipientId = nullableString(group, "recipientId");
      const recipient = recipientId
        ? recipients.find((item) => stringValue(item, "id") === recipientId)
        : undefined;
      const selected = methods.find(
        (method) =>
          stringValue(method, "deliveryGroupId") === groupId &&
          value(method, "isSelected") === true,
      );
      return {
        id: encodeId(groupId, GlobalIdEntity.OrderDeliveryGroup),
        lines: links
          .filter((link) => stringValue(link, "deliveryGroupId") === groupId)
          .map((link) => lines.get(stringValue(link, "orderLineId")))
          .filter((line) => line !== undefined),
        address: addressId
          ? new OrderAddressResolver(
              {
                ...recipient,
                ...addresses.find((address) => stringValue(address, "id") === addressId),
              },
              this.$ctx,
            )
          : null,
        recipient: recipientId ? new OrderContactResolver(recipient ?? {}, this.$ctx) : null,
        selectedMethod: selected
          ? {
              code: stringValue(selected, "code"),
              title: nullableString(selected, "title") ?? stringValue(selected, "code"),
              providerCode: stringValue(selected, "provider"),
              type: stringValue(selected, "type"),
              paymentModel: nullableString(selected, "paymentModel"),
              amount: money(value(selected, "quotedAmount"), currency),
              customerInput: rowValue(selected, "customerInputSnapshot") ?? {},
              providerSnapshot: rowValue(selected, "providerData") ?? {},
            }
          : null,
        createdAt: stringValue(group, "createdAt"),
        updatedAt: stringValue(group, "updatedAt"),
      };
    });
  }
  async payment() {
    const row = await this.$data;
    return mapPayment(row, stringValue(row, "currencyCode"));
  }
  async fulfillmentOrders() {
    const row = await this.$data;
    const canAdmin = await this.canReadSensitiveData();
    const placement = rowValue(row, "checkoutPlacement");
    const placementReady = !placement || stringValue(placement, "status") === "CONFIRMED";
    const orderLines = lineMap(await this.lines());
    const allocations = rowsValue(row, "fulfillmentOrderLines");
    const fulfilled = quantityByLine(rowsValue(row, "fulfillmentLines"), "orderLineId", "quantity");
    const holds = rowsValue(row, "fulfillmentHolds");
    return rowsValue(row, "fulfillmentOrders").map((item) => {
      const id = stringValue(item, "id");
      const mapped = mapFulfillmentOrder(item, this.id());
      return {
        ...mapped,
        supportedActions: canAdmin
          ? mapped.supportedActions.filter(
              (action) =>
                placementReady || !["CREATE_SHIPMENT", "FULFILL", "SUBMIT"].includes(action),
            )
          : [],
        deliveryGroup: {
          id: encodeId(stringValue(item, "deliveryGroupId"), GlobalIdEntity.OrderDeliveryGroup),
        },
        lines: allocations
          .filter((allocation) => stringValue(allocation, "fulfillmentOrderId") === id)
          .map((allocation) => {
            const lineId = stringValue(allocation, "orderLineId");
            const quantity = numberValue(allocation, "quantity");
            const fulfilledQuantity = Math.min(quantity, fulfilled.get(lineId) ?? 0);
            return {
              id: encodeId(`${id}:${lineId}`, GlobalIdEntity.FulfillmentOrderLine),
              orderLine: orderLines.get(lineId),
              quantity,
              remainingQuantity: Math.max(0, quantity - fulfilledQuantity),
              fulfilledQuantity,
            };
          }),
        holds: holds
          .filter((hold) => stringValue(hold, "fulfillmentOrderId") === id)
          .map((hold) => ({
            id: encodeId(stringValue(hold, "id"), GlobalIdEntity.FulfillmentHold),
            reasonCode: stringValue(hold, "reasonCode"),
            note: nullableString(hold, "reason"),
            heldBy: actorValue(hold, "createdBy"),
            createdAt: stringValue(hold, "createdAt"),
            releasedAt: nullableString(hold, "releasedAt"),
          })),
      };
    });
  }
  async fulfillments() {
    const row = await this.$data;
    const orderLines = lineMap(await this.lines());
    const fulfillmentOrders = new Map(
      (await this.fulfillmentOrders()).map((item) => [decodeGlobalId(item.id), item] as const),
    );
    const allocations = rowsValue(row, "fulfillmentLines");
    const shipments = rowsValue(row, "shipments");
    return rowsValue(row, "fulfillments").map((item) => {
      const id = stringValue(item, "id");
      return {
        id: encodeId(id, GlobalIdEntity.Fulfillment),
        order: new OrderResolver(this.$props, this.$ctx),
        fulfillmentOrder: fulfillmentOrders.get(stringValue(item, "fulfillmentOrderId")),
        status: stringValue(item, "status"),
        locationId:
          encodeOptionalReference(nullableString(item, "locationId"), "Location") ??
          encodeOptionalReference(id, "Location"),
        lines: allocations
          .filter((allocation) => stringValue(allocation, "fulfillmentId") === id)
          .map((allocation) => ({
            orderLine: orderLines.get(stringValue(allocation, "orderLineId")),
            quantity: numberValue(allocation, "quantity"),
          })),
        shipments: shipments
          .filter((shipment) => stringValue(shipment, "fulfillmentId") === id)
          .map((shipment) =>
            this.mapShipment(
              shipment,
              item,
              orderLines,
              fulfillmentOrders.get(stringValue(item, "fulfillmentOrderId")),
            ),
          ),
        notifyCustomer: value(item, "notifyCustomer") === true,
        createdAt: stringValue(item, "createdAt"),
        updatedAt: stringValue(item, "updatedAt"),
      };
    });
  }
  async shipments() {
    const row = await this.$data;
    const fulfillmentById = new Map(
      rowsValue(row, "fulfillments").map((item) => [stringValue(item, "id"), item] as const),
    );
    const fulfillmentOrders = new Map(
      (await this.fulfillmentOrders()).map((item) => [decodeGlobalId(item.id), item] as const),
    );
    const orderLines = lineMap(await this.lines());
    return rowsValue(row, "shipments").map((shipment) =>
      this.mapShipment(
        shipment,
        fulfillmentById.get(stringValue(shipment, "fulfillmentId")) ?? {},
        orderLines,
        fulfillmentOrders.get(
          stringValue(
            fulfillmentById.get(stringValue(shipment, "fulfillmentId")) ?? {},
            "fulfillmentOrderId",
          ),
        ),
      ),
    );
  }
  async returns(args: { first?: number; after?: string }) {
    const order = await this.$data;
    const lines = lineMap(await this.lines());
    const returnLines = rowsValue(order, "returnLines");
    const nodes = rowsValue(order, "returns").map((item) => {
      const id = stringValue(item, "id");
      return {
        id: encodeId(id, GlobalIdEntity.OrderReturn),
        order: new OrderResolver(this.$props, this.$ctx),
        status: stringValue(item, "status"),
        lines: returnLines
          .filter((line) => stringValue(line, "returnRequestId") === id)
          .map((line) => ({
            orderLine: lines.get(stringValue(line, "orderLineId")),
            quantity: numberValue(line, "requestedQuantity"),
            receivedQuantity: numberValue(line, "receivedQuantity"),
            restockableQuantity: numberValue(line, "restockableQuantity"),
            damagedQuantity: numberValue(line, "damagedQuantity"),
            reasonCode: stringValue(line, "reason"),
            note: nullableString(line, "note"),
          })),
        returnShipment: null,
        customerNote: nullableString(item, "customerNote"),
        staffNote: nullableString(item, "merchantNote"),
        requestedAt: stringValue(item, "requestedAt"),
        approvedAt:
          stringValue(item, "status") === "APPROVED" ? nullableString(item, "resolvedAt") : null,
        receivedAt:
          stringValue(item, "status") === "RECEIVED" ? nullableString(item, "resolvedAt") : null,
        completedAt:
          stringValue(item, "status") === "COMPLETED" ? nullableString(item, "resolvedAt") : null,
        createdAt: stringValue(item, "createdAt"),
        updatedAt: stringValue(item, "updatedAt"),
      };
    });
    return simpleConnection(nodes, args.first, args.after);
  }
  async exchanges(args: { first?: number; after?: string }) {
    const order = await this.$data;
    const lines = lineMap(await this.lines());
    const returnLines = rowsValue(order, "returnLines");
    const inbound = rowsValue(order, "exchangeInboundLines");
    const outbound = rowsValue(order, "exchangeOutboundLines");
    const nodes = rowsValue(order, "exchanges").map((item) => {
      const id = stringValue(item, "id");
      return {
        id: encodeId(id, GlobalIdEntity.OrderExchange),
        order: new OrderResolver(this.$props, this.$ctx),
        status: stringValue(item, "status"),
        inboundLines: inbound
          .filter((line) => stringValue(line, "exchangeId") === id)
          .map((allocation) => {
            const line = returnLines.find(
              (candidate) =>
                stringValue(candidate, "id") === stringValue(allocation, "returnRequestLineId"),
            );
            return {
              orderLine: line ? lines.get(stringValue(line, "orderLineId")) : null,
              quantity: numberValue(allocation, "quantity"),
              receivedQuantity: line ? numberValue(line, "receivedQuantity") : 0,
              restockableQuantity: line ? numberValue(line, "restockableQuantity") : 0,
              damagedQuantity: line ? numberValue(line, "damagedQuantity") : 0,
              reasonCode: line ? stringValue(line, "reason") : "OTHER",
              note: line ? nullableString(line, "note") : null,
            };
          }),
        outboundLines: outbound
          .filter((line) => stringValue(line, "exchangeId") === id)
          .map((line) =>
            mapLine(
              {
                ...line,
                purchasableSnapshot: rowValue(line, "snapshot") ?? {},
                subtotalAmount: value(line, "totalAmount"),
                discountAmount: 0,
                taxAmount: 0,
                dutyAmount: 0,
              },
              stringValue(item, "currencyCode"),
            ),
          ),
        balance: money(value(item, "balanceAmount"), stringValue(item, "currencyCode")),
        createdAt: stringValue(item, "createdAt"),
        updatedAt: stringValue(item, "updatedAt"),
      };
    });
    return simpleConnection(nodes, args.first, args.after);
  }
  async refunds(args: { first?: number; after?: string }) {
    const order = await this.$data;
    const lines = lineMap(await this.lines());
    const refundLines = rowsValue(order, "refundLines");
    const allocations = rowsValue(order, "refundTransactionAllocations");
    const transactions = rowsValue(order, "paymentTransactions");
    const nodes = rowsValue(order, "refunds").map((item) => {
      const id = stringValue(item, "id");
      return {
        id: encodeId(id, GlobalIdEntity.OrderRefund),
        order: new OrderResolver(this.$props, this.$ctx),
        status: stringValue(item, "status"),
        amount: money(value(item, "totalAmount"), stringValue(item, "currencyCode")),
        reasonCode: nullableString(item, "reason") ?? "OTHER",
        note: nullableString(item, "note"),
        lines: refundLines
          .filter((line) => stringValue(line, "refundId") === id)
          .map((line) => ({
            orderLine: lines.get(stringValue(line, "orderLineId")) ?? null,
            quantity: numberValue(line, "quantity"),
            amount: money(value(line, "totalAmount"), stringValue(item, "currencyCode")),
          })),
        transactions: allocations
          .filter((allocation) => stringValue(allocation, "refundId") === id)
          .map((allocation) =>
            transactions.find(
              (transaction) =>
                stringValue(transaction, "id") === stringValue(allocation, "transactionId"),
            ),
          )
          .filter((transaction) => transaction !== undefined)
          .map(
            (transaction) =>
              mapPayment(
                { ...order, paymentTransactions: [transaction] },
                stringValue(item, "currencyCode"),
              ).transactions[0],
          ),
        createdAt: stringValue(item, "createdAt"),
        processedAt: nullableString(item, "processedAt"),
      };
    });
    return simpleConnection(nodes, args.first, args.after);
  }

  activity(args: { first?: number; after?: string }) {
    return new OrderActivityConnectionResolver({ orderId: this.$props, ...args }, this.$ctx);
  }

  async integrationLinks() {
    return rowsValue(await this.$data, "integrationLinks").map((item) => ({
      id: encodeId(stringValue(item, "id"), GlobalIdEntity.OrderIntegrationLink),
      kind: stringValue(item, "kind"),
      appCode: stringValue(item, "appCode"),
      installationId: encodeId(
        stringValue(item, "appInstallationId"),
        GlobalIdEntity.AppInstallation,
      ),
      direction: stringValue(item, "direction"),
      externalId: nullableString(item, "externalId"),
      externalUrl: nullableString(item, "externalUrl"),
      status: stringValue(item, "status"),
      lastExportedOrderVersion:
        value(item, "lastExportedOrderVersion") == null
          ? null
          : numberValue(item, "lastExportedOrderVersion"),
      lastImportedExternalVersion: nullableString(item, "lastImportedExternalVersion"),
      lastSyncedAt: nullableString(item, "lastSyncedAt"),
      lastErrorCode: nullableString(item, "lastErrorCode"),
      lastErrorMessage: nullableString(item, "lastErrorMessage"),
      createdAt: stringValue(item, "createdAt"),
      updatedAt: stringValue(item, "updatedAt"),
    }));
  }
  async tags() {
    return (value(await this.$data, "tags") as unknown[] | undefined)?.map(String) ?? [];
  }
  async adminNote() {
    if (!(await this.canReadSensitiveData())) return null;
    return nullableString(await this.$data, "adminNote");
  }
  async customerNote() {
    if (!(await this.canReadSensitiveData())) return null;
    return nullableString(rowValue(await this.$data, "contact") ?? {}, "customerNote");
  }
  async customFields() {
    return rowValue(await this.$data, "metadata") ?? {};
  }
  async placedAt() {
    return nullableString(await this.$data, "placedAt");
  }
  async cancelledAt() {
    return nullableString(await this.$data, "cancelledAt");
  }
  async closedAt() {
    return nullableString(await this.$data, "closedAt");
  }
  async archivedAt() {
    return nullableString(await this.$data, "archivedAt");
  }
  async expiresAt() {
    return nullableString(await this.$data, "expiresAt");
  }
  async createdAt() {
    return stringValue(await this.$data, "createdAt");
  }
  async updatedAt() {
    return stringValue(await this.$data, "updatedAt");
  }

  private async address(type: string) {
    const order = await this.$data;
    const address = rowsValue(order, "addresses").find(
      (item) => stringValue(item, "type") === type,
    );
    if (!address) return null;
    const group = rowsValue(order, "deliveryGroups").find(
      (item) => stringValue(item, "addressId") === stringValue(address, "id"),
    );
    const recipient = group
      ? rowsValue(order, "recipients").find(
          (item) => stringValue(item, "id") === stringValue(group, "recipientId"),
        )
      : undefined;
    return new OrderAddressResolver(
      { ...(recipient ?? rowValue(order, "contact")), ...address },
      this.$ctx,
    );
  }

  private canReadSensitiveData(): Promise<boolean> {
    this.sensitiveAccess ??= this.authProvider.authorize({
      organizationId: this.$ctx.store.organizationId,
      domain: `store:${this.$ctx.store.id}`,
      resource: "store.data",
      action: "admin",
    });
    return this.sensitiveAccess;
  }

  private async mapShipment(
    shipment: Row,
    fulfillment: Row,
    orderLines: Map<string, Awaited<ReturnType<OrderResolver["lines"]>>[number]>,
    fulfillmentOrder?: Awaited<ReturnType<OrderResolver["fulfillmentOrders"]>>[number],
  ) {
    if (!fulfillmentOrder) {
      throw new PreloadNotFoundError("Fulfillment order for shipment was not found");
    }
    const row = await this.$data;
    const shipmentId = stringValue(shipment, "id");
    const fulfillmentId = stringValue(shipment, "fulfillmentId");
    const fulfillmentLines = rowsValue(row, "fulfillmentLines");
    const packages = rowsValue(row, "shipmentPackages");
    const packageLines = rowsValue(row, "shipmentPackageLines");
    return {
      id: encodeId(shipmentId, GlobalIdEntity.Shipment),
      order: new OrderResolver(this.$props, this.$ctx),
      fulfillment: {
        id: encodeId(fulfillmentId, GlobalIdEntity.Fulfillment),
        order: new OrderResolver(this.$props, this.$ctx),
        fulfillmentOrder,
        status: stringValue(fulfillment, "status", "PENDING"),
        locationId:
          encodeOptionalReference(nullableString(fulfillment, "locationId"), "Location") ??
          encodeOptionalReference(fulfillmentId, "Location"),
        lines: fulfillmentLines
          .filter((line) => stringValue(line, "fulfillmentId") === fulfillmentId)
          .map((line) => ({
            orderLine: orderLines.get(stringValue(line, "orderLineId")),
            quantity: numberValue(line, "quantity"),
          })),
        shipments: [],
        notifyCustomer: false,
        createdAt: stringValue(fulfillment, "createdAt", stringValue(shipment, "createdAt")),
        updatedAt: stringValue(fulfillment, "updatedAt", stringValue(shipment, "updatedAt")),
      },
      status: stringValue(shipment, "status"),
      providerCode: nullableString(shipment, "carrierCode"),
      providerReference: nullableString(shipment, "externalId"),
      serviceCode: nullableString(shipment, "serviceCode"),
      tracking: rowsValue(row, "shipmentTrackingNumbers")
        .filter((tracking) => stringValue(tracking, "shipmentId") === shipmentId)
        .map((tracking) => ({
          number: stringValue(tracking, "number"),
          url: nullableString(tracking, "url"),
          company: nullableString(tracking, "company"),
        })),
      packages: packages
        .filter((item) => stringValue(item, "shipmentId") === shipmentId)
        .map((item) => {
          const packageId = stringValue(item, "id");
          const weightValue = nullableString(item, "weightValue");
          const length = nullableString(item, "lengthValue");
          return {
            id: encodeId(packageId, GlobalIdEntity.ShipmentPackage),
            weight: weightValue
              ? { value: Number(weightValue), unit: stringValue(item, "weightUnit") }
              : null,
            dimensions: length
              ? {
                  length: Number(length),
                  width: numberValue(item, "widthValue"),
                  height: numberValue(item, "heightValue"),
                  unit: stringValue(item, "dimensionsUnit"),
                }
              : null,
            declaredValue:
              value(item, "declaredValueAmount") == null
                ? null
                : money(value(item, "declaredValueAmount"), stringValue(item, "currencyCode")),
            items: packageLines
              .filter((line) => stringValue(line, "packageId") === packageId)
              .map((line) => ({
                orderLine: orderLines.get(stringValue(line, "orderLineId")),
                quantity: numberValue(line, "quantity"),
              })),
          };
        }),
      events: rowsValue(row, "shipmentTrackingEvents")
        .filter((event) => stringValue(event, "shipmentId") === shipmentId)
        .map((event) => ({
          id: encodeId(stringValue(event, "id"), GlobalIdEntity.ShipmentEvent),
          status: stringValue(event, "status"),
          message: nullableString(event, "message"),
          location: nullableString(event, "location"),
          happenedAt: stringValue(event, "happenedAt"),
          recordedAt: stringValue(event, "recordedAt"),
        })),
      shippedAt: nullableString(shipment, "shippedAt"),
      estimatedDeliveryAt: nullableString(shipment, "estimatedDeliveryAt"),
      deliveredAt: nullableString(shipment, "deliveredAt"),
      createdAt: stringValue(shipment, "createdAt"),
      updatedAt: stringValue(shipment, "updatedAt"),
    };
  }
}

@TypePolicy<OrderContactResolver>({
  resource: "store.data",
  action: "admin",
  organizationId: (resolver) => resolver.$ctx.store.organizationId,
  domain: (resolver) => `store:${resolver.$ctx.store.id}`,
})
class OrderContactResolver extends OrdersType<Row> {
  email() {
    return nullableString(this.$props, "email");
  }
  phone() {
    return nullableString(this.$props, "phoneE164") ?? nullableString(this.$props, "phone");
  }
  firstName() {
    return nullableString(this.$props, "firstName");
  }
  middleName() {
    return nullableString(this.$props, "middleName");
  }
  lastName() {
    return nullableString(this.$props, "lastName");
  }
  company() {
    return nullableString(this.$props, "company");
  }
  note() {
    return nullableString(this.$props, "customerNote");
  }
  redactedAt() {
    return nullableString(this.$props, "redactedAt");
  }
}

@TypePolicy<OrderAddressResolver>({
  resource: "store.data",
  action: "admin",
  organizationId: (resolver) => resolver.$ctx.store.organizationId,
  domain: (resolver) => `store:${resolver.$ctx.store.id}`,
})
class OrderAddressResolver extends OrdersType<Row> {
  id() {
    return encodeId(stringValue(this.$props, "id"), GlobalIdEntity.OrderAddress);
  }
  firstName() {
    return nullableString(this.$props, "firstName");
  }
  middleName() {
    return nullableString(this.$props, "middleName");
  }
  lastName() {
    return nullableString(this.$props, "lastName");
  }
  company() {
    return nullableString(this.$props, "company");
  }
  address1() {
    return nullableString(this.$props, "address1");
  }
  address2() {
    return nullableString(this.$props, "address2");
  }
  city() {
    return nullableString(this.$props, "city");
  }
  provinceCode() {
    return nullableString(this.$props, "provinceCode");
  }
  postalCode() {
    return nullableString(this.$props, "postalCode");
  }
  countryCode() {
    return nullableString(this.$props, "countryCode");
  }
  email() {
    return nullableString(this.$props, "email");
  }
  phone() {
    return nullableString(this.$props, "phone") ?? nullableString(this.$props, "phoneE164");
  }
  data() {
    return rowValue(this.$props, "metadata") ?? {};
  }
  redactedAt() {
    return nullableString(this.$props, "redactedAt");
  }
}

@TypePolicy<OrderCustomerSnapshotResolver>({
  resource: "store.data",
  action: "admin",
  organizationId: (resolver) => resolver.$ctx.store.organizationId,
  domain: (resolver) => `store:${resolver.$ctx.store.id}`,
})
class OrderCustomerSnapshotResolver extends OrdersType<{
  contact: Row;
  customerId: string | null;
  countryCode: string | null;
}> {
  customerId() {
    return encodeId(this.$props.customerId, GlobalIdEntity.Customer);
  }
  email() {
    return nullableString(this.$props.contact, "email");
  }
  phone() {
    return (
      nullableString(this.$props.contact, "phoneE164") ??
      nullableString(this.$props.contact, "phone")
    );
  }
  firstName() {
    return nullableString(this.$props.contact, "firstName");
  }
  middleName() {
    return nullableString(this.$props.contact, "middleName");
  }
  lastName() {
    return nullableString(this.$props.contact, "lastName");
  }
  company() {
    return nullableString(this.$props.contact, "company");
  }
  countryCode() {
    return this.$props.countryCode;
  }
}

class OrderActivityConnectionResolver extends OrdersType<{
  orderId: string;
  first?: number;
  after?: string;
}> {
  private result?: ReturnType<OrderActivityConnectionResolver["connection"]>;

  private load() {
    this.result ??= this.connection();
    return this.result;
  }

  private async connection() {
    const after = decodeActivityCursor(this.$props.after);
    const pageSize = Math.min(Math.max(this.$props.first ?? 50, 1), 250);
    const [page, totalCount] = await Promise.all([
      this.$ctx.repository.adminRead.activity(
        this.$ctx.store.id,
        this.$props.orderId,
        after,
        pageSize + 1,
      ),
      this.$ctx.repository.adminRead.activityCount(this.$ctx.store.id, this.$props.orderId),
    ]);
    const rows = page.slice(0, pageSize);
    const nodes = rows.map((row) => ({
      id: encodeId(stringValue(row, "id"), GlobalIdEntity.OrderActivity),
      sequence: stringValue(row, "sequence"),
      type: stringValue(row, "activityType"),
      visibility: stringValue(row, "visibility"),
      message: nullableString(row, "message"),
      actor: actorValue(row, "actor"),
      data: rowValue(row, "payload") ?? {},
      happenedAt: stringValue(row, "happenedAt"),
      recordedAt: stringValue(row, "recordedAt"),
    }));
    const edges = nodes.map((node) => ({
      node,
      cursor: Buffer.from(String(node.sequence), "utf8").toString("base64url"),
    }));
    return {
      nodes,
      edges,
      pageInfo: {
        hasNextPage: page.length > pageSize,
        hasPreviousPage: after > 0,
        startCursor: edges[0]?.cursor ?? null,
        endCursor: edges.at(-1)?.cursor ?? null,
      },
      totalCount,
    };
  }
  async edges() {
    return (await this.load()).edges;
  }
  async nodes() {
    return (await this.load()).nodes;
  }
  async pageInfo() {
    return (await this.load()).pageInfo;
  }
  async totalCount() {
    return (await this.load()).totalCount;
  }
}

function decodeActivityCursor(cursor?: string): number {
  if (!cursor) return 0;
  const value = Number(Buffer.from(cursor, "base64url").toString("utf8"));
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("ORDER_CURSOR_INVALID");
  return value;
}

function simpleConnection<T extends { id: string | null }>(rows: T[], first = 20, after?: string) {
  const offset = decodeOffset(after);
  const nodes = rows.slice(offset, offset + Math.min(Math.max(first, 1), 100));
  const edges = nodes.map((node, index) => ({
    node,
    cursor: Buffer.from(String(offset + index + 1), "utf8").toString("base64url"),
  }));
  return {
    nodes,
    edges,
    totalCount: rows.length,
    pageInfo: {
      hasNextPage: rows.length > offset + nodes.length,
      hasPreviousPage: offset > 0,
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges.at(-1)?.cursor ?? null,
    },
  };
}

function decodeOffset(cursor?: string): number {
  if (!cursor) return 0;
  const value = Number(Buffer.from(cursor, "base64url").toString("utf8"));
  if (!Number.isInteger(value) || value < 0) throw new Error("ORDER_CURSOR_INVALID");
  return value;
}

function lineMap(lines: Awaited<ReturnType<OrderResolver["lines"]>>) {
  return new Map(lines.map((line) => [decodeGlobalId(line.id), line] as const));
}

function quantityByLine(rows: Row[], idField: string, quantityField: string): Map<string, number> {
  const result = new Map<string, number>();
  for (const row of rows) {
    const id = stringValue(row, idField);
    result.set(id, (result.get(id) ?? 0) + numberValue(row, quantityField));
  }
  return result;
}

/** Mirrors the write path: delivery wins, with fulfilment completion for shipment-less goods. */
function returnWindowStartedAt(fulfillments: Row[], shipments: Row[]): string | null {
  const successfulFulfillments = fulfillments.filter(
    (fulfillment) => stringValue(fulfillment, "status") === "SUCCESS",
  );
  if (successfulFulfillments.length === 0) return null;
  let latest: string | null = null;
  for (const fulfillment of successfulFulfillments) {
    const fulfillmentId = stringValue(fulfillment, "id");
    const fulfillmentShipments = shipments.filter(
      (shipment) => stringValue(shipment, "fulfillmentId") === fulfillmentId,
    );
    const activeShipments = fulfillmentShipments.filter(
      (shipment) => stringValue(shipment, "status") !== "CANCELLED",
    );
    if (fulfillmentShipments.length > 0 && activeShipments.length === 0) return null;
    if (activeShipments.some((shipment) => !nullableString(shipment, "deliveredAt"))) return null;
    const receiptAt =
      fulfillmentShipments.length === 0
        ? nullableString(fulfillment, "completedAt")
        : activeShipments.reduce<string | null>((lastDeliveredAt, shipment) => {
            const deliveredAt = nullableString(shipment, "deliveredAt")!;
            if (lastDeliveredAt === null || deliveredAt > lastDeliveredAt) return deliveredAt;
            return lastDeliveredAt;
          }, null);
    if (!receiptAt) return null;
    if (latest === null || receiptAt > latest) latest = receiptAt;
  }
  return latest;
}

function stringArray(input: unknown): string[] {
  return Array.isArray(input) ? input.map(String) : [];
}

function decodeGlobalId(id: string | null): string {
  if (!id) return "";
  return parseGlobalId(id).id;
}

function encodeOptionalReference(id: string | null, type: string): string | null {
  return id ? Buffer.from(`gid://shopana/${type}/${id}`, "utf8").toString("base64") : null;
}

function actorValue(row: Row, prefix: string) {
  const storedType = stringValue(row, `${prefix}Type`, "SYSTEM");
  const type = storedType === "STAFF" ? "USER" : storedType;
  const rawId = nullableString(row, `${prefix}Id`);
  const entity =
    type === "API_KEY"
      ? GlobalIdEntity.ApiKey
      : type === "CUSTOMER"
        ? GlobalIdEntity.Customer
        : type === "APP"
          ? GlobalIdEntity.AppInstallation
          : GlobalIdEntity.User;
  const id = rawId ? encodeId(rawId, entity) : null;
  return {
    type,
    id,
    displayName: null,
    user: type === "USER" && id ? { __typename: "User", id } : null,
    apiKey: type === "API_KEY" && id ? { __typename: "ApiKey", id } : null,
  };
}
