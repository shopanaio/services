import type { ApiOrderLine } from "@src/interfaces/gql-storefront-api/types";
import type { OrderLineItemReadView } from "@src/application/read/orderLineItemsReadRepository";
import { Money } from "@shopana/shared-money";
import { moneyToApi } from "@src/interfaces/gql-storefront-api/mapper/money";
import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@src/interfaces/gql-storefront-api/idCodec";

/**
 * Maps Order line read model to GraphQL representation.
 */
export function mapOrderLineReadToApi(
  read: OrderLineItemReadView
): ApiOrderLine {
  const compareAt =
    read.unit.compareAtPrice ?? Money.zero(read.unit.price.currency().code);

  return {
    __typename: "OrderLine" as const,
    id: encodeGlobalIdByType(read.id, GlobalIdEntity.OrderLine),
    quantity: read.quantity,
    createdAt: read.createdAt.toISOString(),
    updatedAt: read.updatedAt.toISOString(),
    purchasableId: encodeGlobalIdByType(
      read.unit.id,
      GlobalIdEntity.ProductVariant
    ),
    purchasableSnapshot: read.unit.snapshot,
    cost: {
      __typename: "OrderLineCost" as const,
      unitCompareAtPrice: moneyToApi(compareAt),
      unitPrice: moneyToApi(read.unit.price),
      discountAmount: moneyToApi(read.discountAmount),
      subtotalAmount: moneyToApi(read.subtotalAmount),
      taxAmount: moneyToApi(read.taxAmount),
      totalAmount: moneyToApi(read.totalAmount),
    },
  };
}
