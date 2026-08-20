import { createOrderMockSeed } from "@/domains/sales/all-orders/api/order-mock-seed";
import type { ApiOrder } from "@/domains/sales/all-orders/graphql/operation-types";
import {
  FulfillmentOrderStatus,
  FulfillmentPaymentStatus,
  FulfillmentStatus,
  type ApiFulfillmentStage,
  type ApiFulfillmentTicket,
} from "../graphql/operation-types";

const EMPTY_PAGE_INFO = {
  startCursor: null,
  endCursor: null,
  hasNextPage: false,
  hasPreviousPage: false,
};

const statusMap: Record<string, FulfillmentStatus> = {
  PENDING: FulfillmentStatus.Pending,
  PROCESSING: FulfillmentStatus.Processing,
  ON_HOLD: FulfillmentStatus.OnHold,
  SHIPPED: FulfillmentStatus.Shipped,
  DELIVERED: FulfillmentStatus.Delivered,
  RETURNED: FulfillmentStatus.Returned,
  CANCELLED: FulfillmentStatus.Cancelled,
  FULFILLED: FulfillmentStatus.Fulfilled,
};

const orderStatusMap: Record<string, FulfillmentOrderStatus> = {
  DRAFT: FulfillmentOrderStatus.Draft,
  ACTIVE: FulfillmentOrderStatus.Active,
  COMPLETED: FulfillmentOrderStatus.Completed,
  CANCELLED: FulfillmentOrderStatus.Cancelled,
  ARCHIVED: FulfillmentOrderStatus.Archived,
};

const paymentStatusMap: Record<string, FulfillmentPaymentStatus> = {
  PENDING: FulfillmentPaymentStatus.Pending,
  PAID: FulfillmentPaymentStatus.Paid,
  CANCELLED: FulfillmentPaymentStatus.Cancelled,
};

const colors = ["blue", "orange", "purple", "green"] as const;

export function mapOrderToFulfillmentTicket(
  order: ApiOrder,
  index: number,
  stageId: string,
  sortIndex: number,
): ApiFulfillmentTicket {
  return {
    id: `ticket-${order.id}`,
    version: 1,
    stageId,
    sortIndex,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    order: {
      id: order.id,
      version: order.version,
      number: String(order.orderNumber),
      status: orderStatusMap[order.status] ?? FulfillmentOrderStatus.Active,
      createdAt: order.createdAt,
      totalAmount: {
        amount: String(order.paymentSummary.totalAmount),
        currencyCode: order.currencyCode,
      },
      customer: order.customer
        ? {
            id: order.customer.id,
            firstName: order.customerDetails.firstName,
            lastName: order.customerDetails.lastName,
            email: order.customerDetails.email,
            phone: order.customerDetails.phone,
          }
        : null,
      shippingAddress: order.shippingAddress
        ? {
            address1: order.shippingAddress.address1,
            address2: order.shippingAddress.address2,
            city: order.shippingAddress.city,
            countryCode: order.shippingAddress.countryCode,
          }
        : null,
      paymentSummary: order.paymentItem
        ? {
            status: paymentStatusMap[order.paymentItem.status] ?? FulfillmentPaymentStatus.Pending,
            methodName: order.paymentItem.method?.name ?? null,
          }
        : null,
      fulfillmentSummary: order.fulfillments.map((fulfillment) => ({
        id: fulfillment.id,
        status: statusMap[fulfillment.status] ?? FulfillmentStatus.Pending,
      })),
      lineItemsSummary: order.orderItems.map((item) => ({
        id: item.id,
        title: item.product.title,
        thumbnailUrl: item.product.thumbnailUrl,
        quantity: item.quantity,
      })),
      tags: order.tags.map((tag, tagIndex) => ({
        id: tag.id,
        name: tag.name,
        color: tagIndex === 0 ? colors[index % colors.length]! : "default",
      })),
    },
  };
}

export function createFulfillmentBoardFixture(): {
  stages: ApiFulfillmentStage[];
  tickets: ApiFulfillmentTicket[];
} {
  const now = new Date().toISOString();
  const definitions = [
    ["stage-new", "New", "new"],
    ["stage-processing", "Processing", "processing"],
    ["stage-shipping", "Ready to ship", "ready-to-ship"],
    ["stage-complete", "Completed", "completed"],
  ] as const;
  const stages = definitions.map(([id, title, handle], sortIndex) => ({
    id,
    version: 1,
    title,
    handle,
    sortIndex,
    createdAt: now,
    updatedAt: now,
    ticketConnection: { edges: [], pageInfo: EMPTY_PAGE_INFO, totalCount: 0 },
  }));
  const tickets = createOrderMockSeed().map((order, index) => {
    const stage = stages[index % stages.length]!;
    return mapOrderToFulfillmentTicket(order, index, stage.id, Math.floor(index / stages.length));
  });
  return { stages, tickets };
}
