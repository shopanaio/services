import type { ApiOrderLine } from "@src/interfaces/gql-admin-api/types";
import type { OrderLineItemReadView } from "@src/application/read/orderLineItemsReadRepository";

export function mapOrderLineReadToApi(
  read: OrderLineItemReadView
): ApiOrderLine {
  return {
    id: read.id,
    quantity: read.quantity,
    createdAt: read.createdAt,
    updatedAt: read.updatedAt,
    purchasableId: read.unit.id,
    purchasable: {
      id: read.unit.id,
      title: read.unit.title,
      sku: read.unit.sku,
    } as any,
    unitPrice: Number(read.unit.price.amountMinor()),
    unitComparePrice: read.unit.compareAtPrice ? Number(read.unit.compareAtPrice.amountMinor()) : 0,
    subtotalAmount: Number(read.subtotalAmount.amountMinor()),
    discountAmount: Number(read.discountAmount.amountMinor()),
    taxAmount: Number(read.taxAmount.amountMinor()),
    totalAmount: Number(read.totalAmount.amountMinor()),
  };
}
