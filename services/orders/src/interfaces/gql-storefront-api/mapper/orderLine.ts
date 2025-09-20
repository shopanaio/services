import type { ApiOrderLine } from "@src/interfaces/gql-storefront-api/types";
import type { OrderLineItemReadView } from "@src/application/read/orderLineItemsReadRepository";

export function mapOrderLineReadToApi(
  read: OrderLineItemReadView
): ApiOrderLine {
  return {
    id: read.id,
    quantity: read.quantity,
  };
}
