import {
  allowedFulfillmentTransitions,
  allowedOrderTransitions,
  orderMockRepository,
} from "./order-mock-repository";
import {
  OrderFulfillmentStatus,
  OrderPaymentStatus,
  OrderStatus,
  type ApiOrderAddress,
  type OrderAdminNoteUpdateInput,
  type OrderCancelInput,
  type OrderCommentAddInput,
  type OrderCreateInput,
  type OrderCustomerUpdateInput,
  type OrderFulfillmentSplitInput,
  type OrderFulfillmentStatusUpdateInput,
  type OrderFulfillmentUndoSplitInput,
  type OrderItemAddInput,
  type OrderItemDeleteInput,
  type OrderItemUpdateInput,
  type OrderPaymentDetailsUpdateInput,
  type OrderPaymentStatusUpdateInput,
  type OrdersQueryData,
  type OrdersQueryVariables,
  type OrderShippingDetailsUpdateInput,
  type OrderShippingItemCreateInput,
  type OrderShippingItemUpdateInput,
  type OrderStatusUpdateInput,
  type OrderTagsUpdateInput,
  type OrderUpdateInput,
  type VersionedOrderInput,
} from "../graphql/operation-types";

const method = (id: string) => ({
  id,
  name:
    id === "express"
      ? "Express"
      : id === "standard"
        ? "Standard"
        : id === "card"
          ? "Credit card"
          : "Cash on delivery",
  price: id === "express" ? 18 : 9,
});
const apiAddress = (
  input:
    | OrderShippingDetailsUpdateInput["shippingAddress"]
    | OrderPaymentDetailsUpdateInput["billingAddress"],
): ApiOrderAddress | null =>
  input
    ? {
        ...input,
        id: crypto.randomUUID(),
        company: input.company ?? null,
        address2: input.address2 ?? null,
        province: input.province ?? null,
        phone: input.phone ?? null,
      }
    : null;
export async function requestOrders(variables: OrdersQueryVariables): Promise<OrdersQueryData> {
  return { ordersQuery: { orders: await orderMockRepository.list(variables) } };
}
export async function requestOrder(id: string) {
  return { ordersQuery: { order: await orderMockRepository.get(id) } };
}
export const requestCreateOrder = (input: OrderCreateInput) => orderMockRepository.create(input);
export const requestUpdateOrder = (input: OrderUpdateInput) => orderMockRepository.update(input);
export const requestDeleteOrder = (input: VersionedOrderInput) => orderMockRepository.remove(input);
export const requestCancelOrder = (input: OrderCancelInput) =>
  requestUpdateOrderStatus({ ...input, nextStatus: OrderStatus.Cancelled });
export const requestUpdateOrderStatus = (input: OrderStatusUpdateInput) =>
  orderMockRepository.mutate(
    input,
    `Order status changed to ${input.nextStatus}${input.comment ? `: ${input.comment}` : ""}`,
    (order) => {
      if (!allowedOrderTransitions[order.status].includes(input.nextStatus))
        return [
          {
            code: "INVALID_TRANSITION",
            field: null,
            message: `Cannot change ${order.status} to ${input.nextStatus}`,
          },
        ];
      order.status = input.nextStatus;
    },
  );
export const requestUpdatePaymentStatus = (input: OrderPaymentStatusUpdateInput) =>
  orderMockRepository.mutate(input, `Payment status changed to ${input.nextStatus}`, (order) => {
    if (!order.paymentItem || order.paymentItem.id !== input.paymentItemId)
      return [{ code: "NOT_FOUND", field: null, message: "Payment item not found" }];
    if (order.paymentItem.status === input.nextStatus)
      return [{ code: "NO_CHANGE", field: null, message: "Payment already has this status" }];
    order.paymentItem.status = input.nextStatus;
    order.paymentSummary.paidAmount =
      input.nextStatus === OrderPaymentStatus.Paid ? order.paymentSummary.totalAmount : 0;
  });
export const requestUpdateFulfillmentStatus = (input: OrderFulfillmentStatusUpdateInput) =>
  orderMockRepository.mutate(
    input,
    `Fulfillment status changed to ${input.nextStatus}`,
    (order) => {
      const fulfillment = order.fulfillments.find((item) => item.id === input.fulfillmentId);
      if (!fulfillment)
        return [{ code: "NOT_FOUND", field: null, message: "Fulfillment not found" }];
      if (!allowedFulfillmentTransitions[fulfillment.status].includes(input.nextStatus))
        return [
          {
            code: "INVALID_TRANSITION",
            field: null,
            message: `Cannot change ${fulfillment.status} to ${input.nextStatus}`,
          },
        ];
      fulfillment.status = input.nextStatus;
      fulfillment.updatedAt = new Date().toISOString();
    },
  );
export const requestUpdateOrderCustomer = (input: OrderCustomerUpdateInput) =>
  orderMockRepository.mutate(
    input,
    input.customerId ? "Customer attached" : "Customer detached",
    (order) => {
      order.customer = input.customerId
        ? {
            id: input.customerId,
            displayName:
              `${order.customerDetails.firstName} ${order.customerDetails.lastName}`.trim(),
            email: order.customerDetails.email,
            phone: order.customerDetails.phone,
          }
        : null;
    },
  );
export const requestUpdateOrderTags = (input: OrderTagsUpdateInput) =>
  orderMockRepository.mutate(input, "Order tags updated", (order) => {
    order.tags = input.tags.map((name) => ({ id: name, name }));
  });
export const requestUpdateAdminNote = (input: OrderAdminNoteUpdateInput) =>
  orderMockRepository.mutate(input, "Admin note updated", (order) => {
    order.adminNote = input.adminNote;
  });
export const requestAddOrderComment = (input: OrderCommentAddInput) =>
  orderMockRepository.mutate(input, input.comment, (order) => {
    if (!input.comment.trim())
      return [{ code: "REQUIRED", field: "comment", message: "Comment is required" }];
  });
export const requestAddOrderItem = (input: OrderItemAddInput) =>
  orderMockRepository.mutate(input, "Order item added", (order) => {
    if (order.status !== OrderStatus.Draft)
      return [{ code: "READ_ONLY", field: null, message: "Only draft orders can be edited" }];
    order.orderItems.push({
      id: crypto.randomUUID(),
      price: input.item.price,
      quantity: input.item.quantity,
      originalQuantity: input.item.quantity,
      fulfillmentQuantity: null,
      totalAmount: input.item.price * input.item.quantity,
      subtotalAmount: input.item.price * input.item.quantity,
      taxAmount: null,
      discountAmount: null,
      productCostPrice: input.item.costPrice ?? null,
      weight: input.item.weight == null ? null : { value: input.item.weight, unit: "g" },
      product: {
        id: input.item.productId,
        title: input.item.title,
        sku: input.item.sku ?? null,
        thumbnailUrl: null,
      },
      createdAt: new Date().toISOString(),
    });
  });
export const requestUpdateOrderItem = (input: OrderItemUpdateInput) =>
  orderMockRepository.mutate(input, "Order item updated", (order) => {
    const item = order.orderItems.find((value) => value.id === input.itemId);
    if (!item) return [{ code: "NOT_FOUND", field: null, message: "Order item not found" }];
    if (input.quantity != null && order.status !== OrderStatus.Draft)
      return [
        {
          code: "READ_ONLY",
          field: null,
          message: "Quantity can only be changed for draft orders",
        },
      ];
    if (input.quantity != null && input.quantity < 1)
      return [{ code: "INVALID", field: "items.quantity", message: "Quantity must be at least 1" }];
    if (input.quantity != null) item.quantity = input.quantity;
    if (input.weight !== undefined)
      item.weight = input.weight == null ? null : { value: input.weight, unit: "g" };
    if (input.costPrice !== undefined) item.productCostPrice = input.costPrice;
  });
export const requestDeleteOrderItem = (input: OrderItemDeleteInput) =>
  orderMockRepository.mutate(input, "Order item removed", (order) => {
    if (order.status !== OrderStatus.Draft)
      return [{ code: "READ_ONLY", field: null, message: "Only draft orders can be edited" }];
    if (order.orderItems.length === 1)
      return [
        { code: "REQUIRED", field: "items", message: "An order must contain at least one item" },
      ];
    order.orderItems = order.orderItems.filter((item) => item.id !== input.itemId);
  });
export const requestSplitFulfillment = (input: OrderFulfillmentSplitInput) =>
  orderMockRepository.mutate(input, "Fulfillment split", (order) => {
    const source = order.fulfillments.find((item) => item.id === input.fulfillmentId);
    if (!source) return [{ code: "NOT_FOUND", field: null, message: "Fulfillment not found" }];
    const selected = source.orderItems.filter((item) =>
      input.items.some((selectedItem) => selectedItem.orderItemId === item.id),
    );
    if (!selected.length)
      return [{ code: "INVALID", field: null, message: "Select fulfillment items" }];
    const splitItems = selected.map((item) => {
      const requested = input.items.find((value) => value.orderItemId === item.id)!.quantity;
      const available = item.fulfillmentQuantity ?? item.quantity;
      if (requested < 1 || requested > available) return null;
      return { ...structuredClone(item), fulfillmentQuantity: requested };
    });
    if (splitItems.some((item) => !item))
      return [
        {
          code: "INVALID_QUANTITY",
          field: null,
          message: "Split quantity exceeds the fulfillment quantity",
        },
      ];
    const movesAll =
      selected.length === source.orderItems.length &&
      splitItems.every(
        (item, index) =>
          item!.fulfillmentQuantity ===
          (selected[index]!.fulfillmentQuantity ?? selected[index]!.quantity),
      );
    if (movesAll)
      return [
        {
          code: "INVALID",
          field: null,
          message: "Keep at least one item in the original fulfillment",
        },
      ];
    for (const splitItem of splitItems) {
      const sourceItem = source.orderItems.find((item) => item.id === splitItem!.id)!;
      const available = sourceItem.fulfillmentQuantity ?? sourceItem.quantity;
      if (splitItem!.fulfillmentQuantity === available)
        source.orderItems = source.orderItems.filter((item) => item.id !== sourceItem.id);
      else sourceItem.fulfillmentQuantity = available - splitItem!.fulfillmentQuantity!;
    }
    order.fulfillments.push({
      ...structuredClone(source),
      id: crypto.randomUUID(),
      parentId: source.id,
      status: OrderFulfillmentStatus.Pending,
      orderItems: splitItems as typeof selected,
      shippingItem: null,
    });
  });
export const requestUndoFulfillmentSplit = (input: OrderFulfillmentUndoSplitInput) =>
  orderMockRepository.mutate(input, "Fulfillment split undone", (order) => {
    const child = order.fulfillments.find(
      (item) => item.id === input.fulfillmentId && item.parentId,
    );
    const parent = child ? order.fulfillments.find((item) => item.id === child.parentId) : null;
    if (!child || !parent)
      return [{ code: "INVALID", field: null, message: "This fulfillment is not a split" }];
    parent.orderItems.push(...child.orderItems);
    order.fulfillments = order.fulfillments.filter((item) => item.id !== child.id);
  });
export const requestCreateShippingItem = (input: OrderShippingItemCreateInput) =>
  orderMockRepository.mutate(input, "Shipping item created", (order) => {
    const fulfillment = order.fulfillments.find((item) => item.id === input.fulfillmentId);
    if (!fulfillment) return [{ code: "NOT_FOUND", field: null, message: "Fulfillment not found" }];
    if (fulfillment.shippingItem)
      return [{ code: "ALREADY_EXISTS", field: null, message: "Shipping item already exists" }];
    fulfillment.shippingItem = {
      id: crypto.randomUUID(),
      shippingMethod: method(input.shippingMethodId),
      trackingCode: input.trackingCode ?? null,
      trackingUrl: input.trackingCode ? `https://tracking.example/${input.trackingCode}` : null,
      estimatedDeliveryAt: null,
    };
    fulfillment.status = OrderFulfillmentStatus.Processing;
  });
export const requestUpdateShippingItem = (input: OrderShippingItemUpdateInput) =>
  orderMockRepository.mutate(input, "Shipping item updated", (order) => {
    const fulfillment = order.fulfillments.find((item) => item.id === input.fulfillmentId);
    if (!fulfillment?.shippingItem || fulfillment.shippingItem.id !== input.shippingItemId)
      return [{ code: "NOT_FOUND", field: null, message: "Shipping item not found" }];
    fulfillment.shippingItem.shippingMethod = method(input.shippingMethodId);
    fulfillment.shippingItem.trackingCode = input.trackingCode ?? null;
    fulfillment.shippingItem.trackingUrl = input.trackingCode
      ? `https://tracking.example/${input.trackingCode}`
      : null;
  });
export const requestUpdateShippingDetails = (input: OrderShippingDetailsUpdateInput) =>
  orderMockRepository.mutate(input, "Shipping details updated", (order) => {
    if (order.status !== OrderStatus.Draft)
      return [{ code: "READ_ONLY", field: null, message: "Only draft orders can be edited" }];
    order.shippingMethod = input.shippingMethodId ? method(input.shippingMethodId) : null;
    order.shippingAddress = apiAddress(input.shippingAddress);
  });
export const requestUpdatePaymentDetails = (input: OrderPaymentDetailsUpdateInput) =>
  orderMockRepository.mutate(input, "Payment details updated", (order) => {
    if (order.status !== OrderStatus.Draft)
      return [{ code: "READ_ONLY", field: null, message: "Only draft orders can be edited" }];
    order.paymentMethod = input.paymentMethodId ? method(input.paymentMethodId) : null;
    order.billingAddress = apiAddress(input.billingAddress);
  });
