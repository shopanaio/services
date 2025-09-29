import type { ApiCheckoutLine } from "@src/interfaces/gql-storefront-api/types";
import { moneyToApi } from "@src/interfaces/gql-storefront-api/mapper/money";
import type { CheckoutLineItemReadView } from "@src/application/read/checkoutLineItemsReadRepository";
import { Money } from "@shopana/shared-money";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { encodeGlobalIdByType } from "@src/interfaces/gql-storefront-api/idCodec";

export function mapCheckoutLineReadToApi(
  read: CheckoutLineItemReadView
): ApiCheckoutLine {
  return {
    id: encodeGlobalIdByType(read.id, GlobalIdEntity.CheckoutLine),
    quantity: read.quantity,
    children: [],
    imageSrc: read.unit.imageUrl,
    sku: read.unit.sku,
    title: read.unit.title,
    purchasableId: encodeGlobalIdByType(
      read.unit.id,
      GlobalIdEntity.ProductVariant
    ),
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
