import { createOrderMockSeed } from "./order-mock-seed";
import {
  OrderFulfillmentStatus,
  OrderOrderField,
  OrderPaymentStatus,
  OrderStatus,
  type ApiOrder,
  type ApiOrderItem,
  type OrderConnection,
  type OrderCreateInput,
  type OrderMutationPayload,
  type OrderOrderByInput,
  type OrdersQueryVariables,
  type OrderUpdateInput,
  type OrderUserError,
  type OrderWhereInput,
  type VersionedOrderInput,
} from "../graphql/operation-types";

const clone = <T>(value: T): T => structuredClone(value);
const delay = () => new Promise((resolve) => setTimeout(resolve, 90 + Math.random() * 110));
const cursor = (index: number) => btoa(`order:${index}`);
const cursorIndex = (value?: string | null) => {
  if (!value) return null;
  try {
    return Number(atob(value).split(":")[1]);
  } catch {
    return null;
  }
};
let orders = createOrderMockSeed();

function field(order: ApiOrder, key: string): unknown {
  const fulfillment = order.fulfillments[0];
  const map: Record<string, unknown> = {
    paymentStatus: order.paymentItem?.status ?? OrderPaymentStatus.Pending,
    fulfillmentStatus: fulfillment?.status ?? OrderFulfillmentStatus.Pending,
    customerId: order.customer?.id,
    customerName: `${order.customerDetails.firstName} ${order.customerDetails.lastName}`,
    customerEmail: order.customerDetails.email,
    customerPhone: order.customerDetails.phone,
    totalAmount: order.paymentSummary.totalAmount,
    shippingCountry: order.shippingAddress?.countryCode,
    shippingMethodId: order.shippingMethod?.id,
    paymentMethodId: order.paymentMethod?.id,
    tag: order.tags.map((tag) => tag.name),
    trackingCode: order.fulfillments.map((item) => item.shippingItem?.trackingCode).filter(Boolean),
    hasTracking: order.fulfillments.some((item) => Boolean(item.shippingItem?.trackingCode)),
  };
  return key in map ? map[key] : order[key as keyof ApiOrder];
}
function matchesValue(value: unknown, condition: Record<string, unknown>): boolean {
  const values = Array.isArray(value) ? value : [value];
  return Object.entries(condition).every(([op, expected]) => {
    if (op === "_containsi")
      return values.some((v) =>
        String(v ?? "")
          .toLowerCase()
          .includes(String(expected).toLowerCase()),
      );
    if (op === "_notContainsi")
      return values.every(
        (v) =>
          !String(v ?? "")
            .toLowerCase()
            .includes(String(expected).toLowerCase()),
      );
    if (op === "_eq" || op === "_is") return values.includes(expected);
    if (op === "_neq" || op === "_isNot") return !values.includes(expected);
    if (op === "_in") return Array.isArray(expected) && values.some((v) => expected.includes(v));
    if (op === "_notIn")
      return Array.isArray(expected) && values.every((v) => !expected.includes(v));
    if (op === "_gte")
      return Number.isFinite(Number(value)) && Number.isFinite(Number(expected))
        ? Number(value) >= Number(expected)
        : String(value) >= String(expected);
    if (op === "_lte")
      return Number.isFinite(Number(value)) && Number.isFinite(Number(expected))
        ? Number(value) <= Number(expected)
        : String(value) <= String(expected);
    if (op === "_gt") return Number(value) > Number(expected);
    if (op === "_lt") return Number(value) < Number(expected);
    return true;
  });
}
function matches(order: ApiOrder, where?: OrderWhereInput | null): boolean {
  if (!where) return true;
  if (where._and && !where._and.every((condition) => matches(order, condition))) return false;
  if (where._or && !where._or.some((condition) => matches(order, condition))) return false;
  return Object.entries(where).every(
    ([key, condition]) =>
      key === "_and" ||
      key === "_or" ||
      !condition ||
      matchesValue(field(order, key), condition as Record<string, unknown>),
  );
}
const sortAccessors: Record<OrderOrderField, (order: ApiOrder) => string | number> = {
  [OrderOrderField.OrderNumber]: (o) => o.orderNumber,
  [OrderOrderField.CustomerName]: (o) =>
    `${o.customerDetails.firstName} ${o.customerDetails.lastName}`.toLowerCase(),
  [OrderOrderField.TotalAmount]: (o) => o.paymentSummary.totalAmount,
  [OrderOrderField.Status]: (o) => o.status,
  [OrderOrderField.PaymentStatus]: (o) => o.paymentItem?.status ?? "",
  [OrderOrderField.FulfillmentStatus]: (o) => o.fulfillments[0]?.status ?? "",
  [OrderOrderField.CreatedAt]: (o) => o.createdAt,
  [OrderOrderField.UpdatedAt]: (o) => o.updatedAt,
};
function sorted(input: ApiOrder[], orderBy?: OrderOrderByInput[] | null) {
  const result = [...input];
  result.sort((a, b) => {
    for (const sort of orderBy ?? []) {
      const av = sortAccessors[sort.field](a);
      const bv = sortAccessors[sort.field](b);
      const value =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      if (value) return sort.direction === "ASC" ? value : -value;
    }
    return b.orderNumber - a.orderNumber;
  });
  return result;
}
function error(code: string, message: string, fieldName?: string): OrderMutationPayload {
  return { order: null, userErrors: [{ code, message, field: fieldName ?? null }] };
}
function locate(input: VersionedOrderInput): ApiOrder | OrderMutationPayload {
  const order = orders.find((item) => item.id === input.id);
  if (!order) return error("NOT_FOUND", "Order not found");
  return order;
}
function event(order: ApiOrder, message: string, type: "SYSTEM" | "COMMENT" = "SYSTEM") {
  order.version += 1;
  order.updatedAt = new Date().toISOString();
  order.events.push({
    id: crypto.randomUUID(),
    type,
    message,
    actorName: "Admin operator",
    createdAt: order.updatedAt,
  });
  return { order: clone(order), userErrors: [] };
}
function createItem(input: OrderCreateInput["items"][number], orderId: string): ApiOrderItem {
  return {
    id: input.id ?? crypto.randomUUID(),
    price: input.price,
    quantity: input.quantity,
    originalQuantity: input.quantity,
    fulfillmentQuantity: null,
    totalAmount: input.price * input.quantity,
    subtotalAmount: input.price * input.quantity,
    taxAmount: null,
    discountAmount: null,
    productCostPrice: input.costPrice ?? null,
    weight: input.weight == null ? null : { value: input.weight, unit: "g" },
    product: {
      id: input.productId,
      title: input.title,
      sku: input.sku ?? null,
      thumbnailUrl: null,
    },
    createdAt: new Date().toISOString(),
  };
}
function totals(order: ApiOrder) {
  const subtotal = order.orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  order.orderItems.forEach((item) => {
    item.subtotalAmount = item.price * item.quantity;
    item.totalAmount = item.subtotalAmount;
  });
  order.paymentSummary.subtotalAmount = subtotal;
  order.paymentSummary.totalAmount =
    subtotal -
    order.paymentSummary.discountAmount +
    order.paymentSummary.shippingAmount +
    order.paymentSummary.taxAmount;
  if (order.paymentItem) order.paymentItem.amount = order.paymentSummary.totalAmount;
}

export const orderMockRepository = {
  snapshot(): ApiOrder[] {
    return clone(orders);
  },
  async list(variables: OrdersQueryVariables): Promise<OrderConnection> {
    await delay();
    const all = sorted(
      orders.filter((order) => matches(order, variables.where)),
      variables.orderBy,
    );
    const totalCount = all.length;
    const after = cursorIndex(variables.after);
    const before = cursorIndex(variables.before);
    let start = after === null ? 0 : after + 1;
    let end = before === null ? all.length : before;
    if (variables.last != null) start = Math.max(0, end - variables.last);
    else end = Math.min(end, start + (variables.first ?? 20));
    const slice = all.slice(start, end);
    return clone({
      edges: slice.map((node, offset) => ({ cursor: cursor(start + offset), node })),
      pageInfo: {
        startCursor: slice.length ? cursor(start) : null,
        endCursor: slice.length ? cursor(start + slice.length - 1) : null,
        hasPreviousPage: start > 0,
        hasNextPage: end < all.length,
      },
      totalCount,
    });
  },
  async get(id: string) {
    await delay();
    return clone(orders.find((order) => order.id === id) ?? null);
  },
  async create(input: OrderCreateInput): Promise<OrderMutationPayload> {
    await delay();
    if (!input.items.length) return error("REQUIRED", "Add at least one item", "items");
    const now = new Date().toISOString();
    const orderItems = input.items.map((item) => createItem(item, input.clientMutationId));
    const subtotal = orderItems.reduce((sum, item) => sum + item.totalAmount, 0);
    const orderNumber = Math.max(...orders.map((order) => order.orderNumber)) + 1;
    const order: ApiOrder = {
      id: crypto.randomUUID(),
      version: 1,
      orderNumber,
      status: OrderStatus.Draft,
      createdAt: now,
      updatedAt: now,
      adminNote: input.adminNote ?? null,
      externalSystemId: input.externalSystemId ?? null,
      currencyCode: input.currencyCode,
      displayCurrencyCode: null,
      displayExchangeRate: null,
      customer: input.customerId
        ? {
            id: input.customerId,
            displayName:
              `${input.customerDetails.firstName} ${input.customerDetails.lastName}`.trim(),
            email: input.customerDetails.email,
            phone: input.customerDetails.phone,
          }
        : null,
      customerDetails: clone(input.customerDetails),
      customerStatistic: null,
      billingAddress: input.billingAddress
        ? {
            ...input.billingAddress,
            id: crypto.randomUUID(),
            company: input.billingAddress.company ?? null,
            address2: input.billingAddress.address2 ?? null,
            province: input.billingAddress.province ?? null,
            phone: input.billingAddress.phone ?? null,
          }
        : null,
      shippingAddress: input.shippingAddress
        ? {
            ...input.shippingAddress,
            id: crypto.randomUUID(),
            company: input.shippingAddress.company ?? null,
            address2: input.shippingAddress.address2 ?? null,
            province: input.shippingAddress.province ?? null,
            phone: input.shippingAddress.phone ?? null,
          }
        : null,
      paymentMethod: input.paymentMethodId
        ? {
            id: input.paymentMethodId,
            name: input.paymentMethodId === "card" ? "Credit card" : "Cash on delivery",
          }
        : null,
      shippingMethod: input.shippingMethodId
        ? {
            id: input.shippingMethodId,
            name: input.shippingMethodId === "express" ? "Express" : "Standard",
            price: 9,
          }
        : null,
      orderItems,
      productsInfo: orderItems.map((item) => item.product),
      fulfillments: [],
      paymentItem: input.paymentMethodId
        ? {
            id: crypto.randomUUID(),
            status: OrderPaymentStatus.Pending,
            amount: subtotal,
            method: { id: input.paymentMethodId, name: input.paymentMethodId },
          }
        : null,
      paymentSummary: {
        subtotalAmount: subtotal,
        discountAmount: 0,
        shippingAmount: input.shippingMethodId ? 9 : 0,
        taxAmount: 0,
        totalAmount: subtotal + (input.shippingMethodId ? 9 : 0),
        paidAmount: 0,
      },
      events: [
        {
          id: crypto.randomUUID(),
          type: "SYSTEM",
          message: "Order created",
          actorName: "Admin operator",
          createdAt: now,
        },
      ],
      tags: input.tags.map((name) => ({ id: name, name })),
    };
    orders.push(order);
    return { order: clone(order), userErrors: [] };
  },
  async update(input: OrderUpdateInput) {
    await delay();
    const found = locate(input);
    if (!("id" in found)) return found;
    if (!input.items.length) return error("REQUIRED", "Add at least one item", "items");
    found.customerDetails = clone(input.customerDetails);
    found.externalSystemId = input.externalSystemId ?? null;
    found.currencyCode = input.currencyCode;
    found.adminNote = input.adminNote ?? null;
    found.tags = input.tags.map((name) => ({ id: name, name }));
    found.orderItems = input.items.map((item) => createItem(item, found.id));
    found.productsInfo = found.orderItems.map((item) => item.product);
    totals(found);
    return event(found, "Order details updated");
  },
  async remove(input: VersionedOrderInput) {
    await delay();
    const found = locate(input);
    if (!("id" in found)) return found;
    orders = orders.filter((order) => order.id !== input.id);
    return { order: clone(found), userErrors: [] };
  },
  async mutate(
    input: VersionedOrderInput,
    message: string,
    change: (order: ApiOrder) => OrderUserError[] | void,
  ) {
    await delay();
    const found = locate(input);
    if (!("id" in found)) return found;
    const errors = change(found);
    if (errors?.length) return { order: null, userErrors: errors };
    totals(found);
    return event(found, message);
  },
};

export const allowedOrderTransitions: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.Draft]: [OrderStatus.Active, OrderStatus.Cancelled],
  [OrderStatus.Active]: [OrderStatus.Completed, OrderStatus.Cancelled],
  [OrderStatus.Completed]: [OrderStatus.Archived],
  [OrderStatus.Cancelled]: [OrderStatus.Archived],
  [OrderStatus.Archived]: [],
};
export const allowedFulfillmentTransitions: Record<
  OrderFulfillmentStatus,
  OrderFulfillmentStatus[]
> = {
  [OrderFulfillmentStatus.Pending]: [
    OrderFulfillmentStatus.Processing,
    OrderFulfillmentStatus.OnHold,
    OrderFulfillmentStatus.Fulfilled,
    OrderFulfillmentStatus.Cancelled,
  ],
  [OrderFulfillmentStatus.Processing]: [
    OrderFulfillmentStatus.OnHold,
    OrderFulfillmentStatus.Shipped,
    OrderFulfillmentStatus.Delivered,
    OrderFulfillmentStatus.Fulfilled,
    OrderFulfillmentStatus.Cancelled,
  ],
  [OrderFulfillmentStatus.OnHold]: [
    OrderFulfillmentStatus.Pending,
    OrderFulfillmentStatus.Processing,
    OrderFulfillmentStatus.Cancelled,
  ],
  [OrderFulfillmentStatus.Shipped]: [
    OrderFulfillmentStatus.Delivered,
    OrderFulfillmentStatus.Returned,
    OrderFulfillmentStatus.Fulfilled,
    OrderFulfillmentStatus.Cancelled,
  ],
  [OrderFulfillmentStatus.Delivered]: [
    OrderFulfillmentStatus.Returned,
    OrderFulfillmentStatus.Fulfilled,
  ],
  [OrderFulfillmentStatus.Returned]: [OrderFulfillmentStatus.Fulfilled],
  [OrderFulfillmentStatus.Cancelled]: [],
  [OrderFulfillmentStatus.Fulfilled]: [],
};
