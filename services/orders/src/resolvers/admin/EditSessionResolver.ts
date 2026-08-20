import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { TypePolicy } from "@shopana/type-resolver";
import { OrderResolver } from "./OrderResolver.js";
import { OrdersType } from "./OrdersType.js";
import { encodeId, money, numberValue, rowsValue, stringValue, value, type Row } from "./values.js";

@TypePolicy<OrderEditSessionResolver>({
  resource: "store.data",
  action: "read",
  organizationId: (resolver) => resolver.$ctx.store.organizationId,
  domain: (resolver) => `store:${resolver.$ctx.store.id}`,
})
export class OrderEditSessionResolver extends OrdersType<string, Row> {
  protected async $preload(): Promise<Row> {
    const row = await this.$ctx.loaders.editSession.load(this.$props);
    if (!row) throw new Error("ORDER_EDIT_NOT_FOUND");
    return row;
  }
  id() {
    return this.encodeId(this.$props, GlobalIdEntity.OrderEditSession);
  }
  async version() {
    return numberValue(await this.$data, "version", 1);
  }
  async order() {
    return new OrderResolver(stringValue(await this.$data, "orderId"), this.$ctx);
  }
  async baseOrderVersion() {
    return numberValue(await this.$data, "baseOrderVersion", 1);
  }
  async status() {
    return stringValue(await this.$data, "status");
  }
  async calculatedOrder() {
    const row = await this.$data;
    const currency = stringValue(row, "currencyCode");
    return {
      lines: [],
      cost: {
        subtotalAmount: money(value(row, "subtotalAmount"), currency),
        discountAmount: money(value(row, "discountAmount"), currency),
        shippingAmount: money(value(row, "shippingAmount"), currency),
        taxAmount: money(value(row, "taxAmount"), currency),
        dutyAmount: money(value(row, "dutyAmount"), currency),
        adjustmentAmount: money(value(row, "adjustmentAmount"), currency),
        totalAmount: money(value(row, "totalAmount"), currency),
        paidAmount: money(0, currency),
        refundedAmount: money(0, currency),
        outstandingAmount: money(value(row, "totalAmount"), currency),
      },
      balanceDelta: money(value(row, "adjustmentAmount"), currency),
    };
  }
  async changes() {
    return rowsValue(await this.$data, "changes").map((row) => ({
      id: encodeId(stringValue(row, "id"), GlobalIdEntity.OrderEditChange),
      kind: stringValue(row, "changeType"),
      payload: value(row, "payload") ?? {},
      createdAt: stringValue(row, "createdAt"),
    }));
  }
  async createdBy() {
    const row = await this.$data;
    return {
      type: stringValue(row, "createdByType"),
      id: null,
      displayName: null,
      user: null,
      apiKey: null,
    };
  }
  async createdAt() {
    return stringValue(await this.$data, "createdAt");
  }
  async expiresAt() {
    return stringValue(await this.$data, "expiresAt");
  }
}
