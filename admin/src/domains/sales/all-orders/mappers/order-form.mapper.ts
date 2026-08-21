import type { ApiOrder, OrderCreateInput, OrderUpdateInput } from "../graphql/operation-types";
import type { OrderFormValues } from "../modals/order-modal/schema";
const empty = (value: string) => value.trim() || null;
export function buildOrderCreateInput(values: OrderFormValues): OrderCreateInput {
  return {
    clientMutationId: crypto.randomUUID(),
    customerId: empty(values.customerId),
    customerDetails: {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      middleName: null,
      email: values.email.trim(),
      phone: empty(values.phone),
      note: null,
      meta: null,
    },
    currencyCode: values.currencyCode,
    externalSystemId: empty(values.externalSystemId),
    shippingMethodId: empty(values.shippingMethodId),
    paymentMethodId: empty(values.paymentMethodId),
    items: values.items.map((item) => ({
      id: item.id || undefined,
      productId: item.productId,
      title: item.title.trim(),
      sku: empty(item.sku),
      price: item.price,
      quantity: item.quantity,
      weight: item.weight,
      costPrice: item.costPrice,
    })),
    tags: values.tags.map((tag) => tag.trim()).filter(Boolean),
    adminNote: empty(values.adminNote),
  };
}
export function buildOrderUpdateInput(values: OrderFormValues, order: ApiOrder): OrderUpdateInput {
  const { clientMutationId: _clientMutationId, ...input } = buildOrderCreateInput(values);
  return { ...input, id: order.id };
}
export function mapOrderToFormValues(order: ApiOrder): OrderFormValues {
  return {
    customerId: order.customer?.id ?? "",
    firstName: order.customerDetails.firstName,
    lastName: order.customerDetails.lastName,
    email: order.customerDetails.email,
    phone: order.customerDetails.phone ?? "",
    currencyCode: order.currencyCode as OrderFormValues["currencyCode"],
    externalSystemId: order.externalSystemId ?? "",
    shippingMethodId: order.shippingMethod?.id ?? "",
    paymentMethodId: order.paymentMethod?.id ?? "",
    items: order.orderItems.map((item) => ({
      id: item.id,
      productId: item.product.id,
      title: item.product.title,
      sku: item.product.sku ?? "",
      price: item.price,
      quantity: item.quantity,
      weight: item.weight?.value ?? null,
      costPrice: item.productCostPrice ?? null,
    })),
    tags: order.tags.map((tag) => tag.name),
    adminNote: order.adminNote ?? "",
  };
}
