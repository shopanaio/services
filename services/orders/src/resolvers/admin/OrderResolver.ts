import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { TypePolicy } from "@shopana/type-resolver";
import { OrdersType } from "./OrdersType.js";
import {
  mapDiscount,
  mapFulfillmentOrder,
  mapLine,
  mapPayment,
  mapSimpleEntity,
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

@TypePolicy<OrderResolver>({
  resource: "store.data",
  action: "read",
  organizationId: (resolver) => resolver.$ctx.store.organizationId,
  domain: (resolver) => `store:${resolver.$ctx.store.id}`,
})
export class OrderResolver extends OrdersType<string, Row> {
  protected async $preload(): Promise<Row> {
    const row = await this.$ctx.loaders.order.load(this.$props);
    if (!row) throw new Error("ORDER_NOT_FOUND");
    return row;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.Order);
  }

  async version() {
    return numberValue(await this.$data, "version", 1);
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
    const status = stringValue(row, "status");
    const actions =
      status === "DRAFT"
        ? ["UPDATE_DETAILS", "EDIT_LINES", "COMPLETE_DRAFT"]
        : status === "OPEN"
          ? [
              "UPDATE_DETAILS",
              "EDIT_LINES",
              "CANCEL",
              "CLOSE",
              "RECORD_MANUAL_PAYMENT",
              "CREATE_FULFILLMENT",
              "CREATE_RETURN",
              "CREATE_EXCHANGE",
              "REQUEST_INTEGRATION_SYNC",
            ]
          : status === "CLOSED"
            ? ["REOPEN"]
            : [];
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
    return null;
  }

  async customer() {
    const id = nullableString(await this.$data, "customerId");
    return id ? { __typename: "Customer", id: encodeId(id, GlobalIdEntity.Customer) } : null;
  }

  async customerSnapshot() {
    const row = await this.$data;
    return new OrderCustomerSnapshotResolver(
      { contact: rowValue(row, "contact") ?? {}, customerId: nullableString(row, "customerId") },
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
    return rowsValue(row, "lines").map((line) => mapLine(line, currency));
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
    return [];
  }
  async payment() {
    const row = await this.$data;
    return mapPayment(row, stringValue(row, "currencyCode"));
  }
  async fulfillmentOrders() {
    const row = await this.$data;
    return rowsValue(row, "fulfillmentOrders").map((item) => mapFulfillmentOrder(item, this.id()));
  }
  async fulfillments() {
    return rowsValue(await this.$data, "fulfillments").map((item) =>
      mapSimpleEntity(item, GlobalIdEntity.Fulfillment),
    );
  }
  async shipments() {
    return rowsValue(await this.$data, "shipments").map((item) =>
      mapSimpleEntity(item, GlobalIdEntity.Shipment),
    );
  }
  async returns(args: { first?: number; after?: string }) {
    return simpleConnection(
      rowsValue(await this.$data, "returns"),
      GlobalIdEntity.OrderReturn,
      args.first,
    );
  }
  async exchanges(args: { first?: number; after?: string }) {
    return simpleConnection(
      rowsValue(await this.$data, "exchanges"),
      GlobalIdEntity.OrderExchange,
      args.first,
    );
  }
  async refunds(args: { first?: number; after?: string }) {
    return simpleConnection(
      rowsValue(await this.$data, "refunds"),
      GlobalIdEntity.OrderRefund,
      args.first,
    );
  }

  activity(args: { first?: number; after?: string }) {
    return new OrderActivityConnectionResolver({ orderId: this.$props, ...args }, this.$ctx);
  }

  async integrationLinks() {
    return rowsValue(await this.$data, "integrationLinks").map((item) =>
      mapSimpleEntity(item, GlobalIdEntity.OrderIntegrationLink),
    );
  }
  async tags() {
    return (value(await this.$data, "tags") as unknown[] | undefined)?.map(String) ?? [];
  }
  async adminNote() {
    return nullableString(await this.$data, "adminNote");
  }
  async customerNote() {
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
    const address = rowsValue(await this.$data, "addresses").find(
      (item) => stringValue(item, "type") === type,
    );
    return address ? new OrderAddressResolver(address, this.$ctx) : null;
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
    return nullableString(this.$props, "phoneE164");
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
    return null;
  }
  middleName() {
    return null;
  }
  lastName() {
    return null;
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
    return null;
  }
  phone() {
    return null;
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
}> {
  customerId() {
    return encodeId(this.$props.customerId, GlobalIdEntity.Customer);
  }
  email() {
    return nullableString(this.$props.contact, "email");
  }
  phone() {
    return nullableString(this.$props.contact, "phoneE164");
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
    return nullableString(this.$props.contact, "countryCode");
  }
}

class OrderActivityConnectionResolver extends OrdersType<{
  orderId: string;
  first?: number;
  after?: string;
}> {
  private async connection() {
    const after = this.$props.after
      ? Number(Buffer.from(this.$props.after, "base64url").toString("utf8"))
      : 0;
    const rows = await this.$ctx.repository.adminRead.activity(
      this.$ctx.store.id,
      this.$props.orderId,
      after,
      this.$props.first ?? 50,
    );
    const nodes = rows.map((row) => ({
      id: encodeId(stringValue(row, "id"), GlobalIdEntity.OrderActivity),
      sequence: stringValue(row, "sequence"),
      type: stringValue(row, "activityType"),
      visibility: stringValue(row, "visibility"),
      message: nullableString(row, "message"),
      actor: {
        type: stringValue(row, "actorType"),
        id: nullableString(row, "actorId"),
        displayName: null,
        user: null,
        apiKey: null,
      },
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
        hasNextPage: rows.length === (this.$props.first ?? 50),
        hasPreviousPage: after > 0,
        startCursor: edges[0]?.cursor ?? null,
        endCursor: edges.at(-1)?.cursor ?? null,
      },
      totalCount: nodes.length,
    };
  }
  async edges() {
    return (await this.connection()).edges;
  }
  async nodes() {
    return (await this.connection()).nodes;
  }
  async pageInfo() {
    return (await this.connection()).pageInfo;
  }
  async totalCount() {
    return (await this.connection()).totalCount;
  }
}

function simpleConnection(rows: Row[], type: GlobalIdEntity, first = 20) {
  const nodes = rows
    .slice(0, Math.min(Math.max(first, 1), 100))
    .map((row) => mapSimpleEntity(row, type));
  const edges = nodes.map((node, index) => ({
    node,
    cursor: Buffer.from(String(index), "utf8").toString("base64url"),
  }));
  return {
    nodes,
    edges,
    totalCount: rows.length,
    pageInfo: {
      hasNextPage: rows.length > nodes.length,
      hasPreviousPage: false,
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges.at(-1)?.cursor ?? null,
    },
  };
}
