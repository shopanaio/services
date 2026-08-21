import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { Money } from "@shopana/shared-money";
import { PreloadNotFoundError, TypePolicy } from "@shopana/type-resolver";
import { OrderResolver } from "./OrderResolver.js";
import { OrdersType } from "./OrdersType.js";
import { mapLine } from "./entityMappers.js";
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
    if (!row) throw new PreloadNotFoundError(`Order edit session with ID ${this.$props} not found`);
    return row;
  }
  id() {
    return this.encodeId(this.$props, GlobalIdEntity.OrderEditSession);
  }
  async order() {
    return new OrderResolver(stringValue(await this.$data, "orderId"), this.$ctx);
  }
  async status() {
    return stringValue(await this.$data, "status");
  }
  async calculatedOrder() {
    const row = await this.$data;
    const currency = stringValue(row, "currencyCode");
    const order = await this.$ctx.loaders.order.load(stringValue(row, "orderId"));
    if (!order) throw new PreloadNotFoundError("Order for edit session was not found");
    return {
      lines: projectLines(order, rowsValue(row, "changes"), currency),
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
    const storedType = stringValue(row, "createdByType", "SYSTEM");
    const type = storedType === "STAFF" ? "USER" : storedType;
    const rawId = value(row, "createdById");
    const entity =
      type === "API_KEY"
        ? GlobalIdEntity.ApiKey
        : type === "CUSTOMER"
          ? GlobalIdEntity.Customer
          : type === "APP"
            ? GlobalIdEntity.AppInstallation
            : GlobalIdEntity.User;
    const id = rawId == null ? null : encodeId(String(rawId), entity);
    return {
      type,
      id,
      displayName: null,
      user: type === "USER" && id ? { __typename: "User", id } : null,
      apiKey: type === "API_KEY" && id ? { __typename: "ApiKey", id } : null,
    };
  }
  async createdAt() {
    return stringValue(await this.$data, "createdAt");
  }
  async expiresAt() {
    return stringValue(await this.$data, "expiresAt");
  }
}

function projectLines(order: Row, changes: Row[], currencyCode: string) {
  const lines = new Map(
    rowsValue(order, "lines").map((line) => [stringValue(line, "id"), { ...line }] as const),
  );
  for (const change of changes) {
    const kind = stringValue(change, "changeType");
    const payload = asRow(value(change, "payload"));
    if (kind === "orderEditLineAdd") {
      const input = asRow(payload.line);
      const id = stringValue(payload, "changeId");
      const quantity = numberValue(input, "quantity");
      const unitPrice = moneyInputMinor(asRow(input.unitPrice), currencyCode);
      lines.set(id, {
        id,
        purchasableId: value(input, "purchasableId"),
        purchasableType: "Variant",
        purchasableSnapshot: {
          variantId: value(input, "purchasableId"),
          weightValue: value(asRow(input.weight), "value"),
          weightUnit: value(asRow(input.weight), "unit"),
          unitCostAmount:
            input.unitCost == null ? null : moneyInputMinor(asRow(input.unitCost), currencyCode),
        },
        title: stringValue(input, "title"),
        sku: value(input, "sku"),
        quantity,
        cancelledQuantity: 0,
        unitPriceAmount: unitPrice,
        unitCompareAtPriceAmount:
          input.unitCompareAtPrice == null
            ? null
            : moneyInputMinor(asRow(input.unitCompareAtPrice), currencyCode),
        subtotalAmount: unitPrice * BigInt(quantity),
        discountAmount: 0,
        taxAmount: 0,
        dutyAmount: 0,
        totalAmount: unitPrice * BigInt(quantity),
        requiresShipping: value(input, "requiresShipping") !== false,
        taxable: value(input, "taxable") !== false,
        metadata: asRow(input.customFields),
        createdAt: stringValue(change, "createdAt"),
        updatedAt: stringValue(change, "createdAt"),
      });
    } else if (kind === "orderEditLineUpdate") {
      const id = stringValue(payload, "lineId");
      const current = lines.get(id);
      if (!current) continue;
      const quantity =
        payload.quantity == null ? numberValue(current, "quantity") : Number(payload.quantity);
      const unitPrice =
        payload.unitPrice == null
          ? BigInt(String(value(current, "unitPriceAmount") ?? 0))
          : moneyInputMinor(asRow(payload.unitPrice), currencyCode);
      const discount = BigInt(String(value(current, "discountAmount") ?? 0));
      const tax = BigInt(String(value(current, "taxAmount") ?? 0));
      const duty = BigInt(String(value(current, "dutyAmount") ?? 0));
      lines.set(id, {
        ...current,
        quantity,
        unitPriceAmount: unitPrice,
        subtotalAmount: unitPrice * BigInt(quantity),
        totalAmount: unitPrice * BigInt(quantity) - discount + tax + duty,
      });
    } else if (kind === "orderEditLineRemove") {
      lines.delete(stringValue(payload, "lineId"));
    }
  }
  return [...lines.values()].map((line) => mapLine(line, currencyCode));
}

function moneyInputMinor(input: Row, currencyCode: string): bigint {
  if (stringValue(input, "currencyCode") !== currencyCode) {
    throw new Error("ORDER_EDIT_CURRENCY_MISMATCH");
  }
  const amount = String(value(input, "amount") ?? "0");
  const exponent = Number(Money.fromMinor(0n, currencyCode).currency().exponent);
  const pattern = new RegExp(`^-?\\d+(?:\\.\\d{1,${Math.max(exponent, 1)}})?$`);
  if (!pattern.test(amount) || (exponent === 0 && amount.includes("."))) {
    throw new Error("ORDER_EDIT_MONEY_INVALID");
  }
  const negative = amount.startsWith("-");
  const [whole, fraction = ""] = amount.replace("-", "").split(".");
  const factor = 10n ** BigInt(exponent);
  const minor = BigInt(whole) * factor + BigInt(fraction.padEnd(exponent, "0") || "0");
  return negative ? -minor : minor;
}

function asRow(input: unknown): Row {
  return input && typeof input === "object" && !Array.isArray(input) ? (input as Row) : {};
}
