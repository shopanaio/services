import type { ApiOrderLine } from "@src/interfaces/gql-storefront-api/types";
import { moneyToApi } from "@src/interfaces/gql-storefront-api/mapper/money";
import type { OrderLineItemReadView } from "@src/application/read/orderLineItemsReadRepository";
import { Money } from "@shopana/shared-money";

export function mapOrderLineReadToApi(
  read: OrderLineItemReadView,
): ApiOrderLine {
  return {
    id: read.id,
    quantity: read.quantity,
    children: [],
    imageSrc: read.unit.imageUrl,
    sku: read.unit.sku,
    title: read.unit.title,
    purchasableId: read.unit.id,
    purchasableSnapshot: read.unit.snapshot,
    cost: {
      compareAtUnitPrice: moneyToApi(read.unit.compareAtPrice ?? Money.zero()),
      unitPrice: moneyToApi(read.unit.price),
      subtotalAmount: moneyToApi(read.subtotalAmount),
      discountAmount: moneyToApi(read.discountAmount),
      taxAmount: moneyToApi(read.taxAmount),
      totalAmount: moneyToApi(read.totalAmount),
    },
  };
}
