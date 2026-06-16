import type { ApiCheckoutLine, ApiCheckoutLinePriceConfig, ApiChildPriceType, ApiMoney } from "@src/interfaces/gql-storefront-api/types";
import { moneyToApi } from "@src/interfaces/gql-storefront-api/mapper/money";
import type { CheckoutLineItemReadView, CheckoutLinePriceConfigView } from "@src/application/read/checkoutLineItemsReadRepository";
import { Money } from "@shopana/shared-money";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { encodeGlobalIdByType } from "@src/interfaces/gql-storefront-api/idCodec";

/**
 * Extended ApiCheckoutLine with new fields (will be merged by codegen)
 */
export type ApiCheckoutLineExtended = ApiCheckoutLine & {
  originalPrice: ApiMoney;
};

/**
 * Maps price config from read view to API format
 */
function mapPriceConfigToApi(
  config: CheckoutLinePriceConfigView | null
): ApiCheckoutLinePriceConfig | null {
  if (!config) return null;
  return {
    type: config.type as unknown as ApiChildPriceType,
    amount: config.amount,
    percent: config.percent,
  };
}

export function mapCheckoutLineReadToApi(
  read: CheckoutLineItemReadView
): ApiCheckoutLineExtended {
  return {
    id: encodeGlobalIdByType(read.id, GlobalIdEntity.CheckoutLine),
    quantity: read.quantity,
    children: read.children.map(mapCheckoutLineReadToApi),
    imageSrc: read.unit.imageUrl,
    sku: read.unit.sku,
    title: read.unit.title,
    purchasableId: encodeGlobalIdByType(
      read.unit.id,
      GlobalIdEntity.ProductVariant
    ),
    purchasableSnapshot: read.unit.snapshot,
    originalPrice: moneyToApi(read.unit.originalPrice),
    priceConfig: mapPriceConfigToApi(read.priceConfig),
    tag: read.tag
      ? {
          __typename: "CheckoutTag" as const,
          id: encodeGlobalIdByType(read.tag.id, GlobalIdEntity.CheckoutTag),
          slug: read.tag.slug,
          unique: read.tag.isUnique,
          createdAt: read.tag.createdAt.toISOString(),
          updatedAt: read.tag.updatedAt.toISOString(),
        }
      : null,
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
