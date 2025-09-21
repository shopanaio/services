import type {
  ApiOrder,
  ApiOrderStatus,
} from "@src/interfaces/gql-storefront-api/types";
import type { OrderReadView } from "@src/application/read/orderReadRepository";
import { moneyToApi } from "@src/interfaces/gql-storefront-api/mapper/money";
import { mapOrderLineReadToApi } from "@src/interfaces/gql-storefront-api/mapper/orderLine";

/**
 * Maps Order read-model snapshot to GraphQL ApiOrder type.
 */
export function mapOrderReadToApi(read: OrderReadView): ApiOrder {
  return {
    id: read.id,
    status: read.status as ApiOrderStatus,
    number: read.number,
    cost: {
      subtotalAmount: moneyToApi(read.subtotal),
      totalAmount: moneyToApi(read.grandTotal),
      totalDiscountAmount: moneyToApi(read.discountTotal),
      totalShippingAmount: moneyToApi(read.shippingTotal),
      totalTaxAmount: moneyToApi(read.taxTotal),
    },
    lines: read.lineItems.map(mapOrderLineReadToApi),
  };
}
