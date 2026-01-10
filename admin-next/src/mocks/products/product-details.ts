import { mockCategories, mockTags } from "./data";
import { MOCK_OPTION_GROUPS } from "./options";
import { mockGroups, getProductById, getVariantById } from "./components";
import { createMockData as createAttributesMockData } from "./attributes";
import type { IProductDetailsMockData } from "@/domains/inventory/products/components/product-details-card/types";
import {
  type ProductInventoryWidget,
  ThresholdType,
} from "@/domains/inventory/products/components/product-details-card/inventory-widget.types";

const getMockInventoryWidget = (): ProductInventoryWidget => ({
  quantities: {
    availableForSale: 1250,
    onHand: 1500,
    reserved: 250,
    unavailable: 10,
  },
  skuStatus: {
    total: 24,
    lowStock: { count: 3, averageDays: 12 },
    outOfStock: { count: 1, averageDays: 3 },
    backorder: { count: 2, averageDays: 5 },
  },
  salesVelocity: {
    pendingOrders: 15,
    unitsPerDay: 12.5,
    daysUntilOutOfStock: 100,
    weekOverWeekChange: -45,
  },
  alertThreshold: {
    method: ThresholdType.SAFETY_STOCK,
    minimumStock: 10,
  },
});

const defaultReviewsData = {
  rating: 4.2,
  reviewsCount: 128,
  breakdown: [
    { stars: 5, count: 89, percent: 70 },
    { stars: 4, count: 24, percent: 19 },
    { stars: 3, count: 8, percent: 6 },
    { stars: 2, count: 4, percent: 3 },
    { stars: 1, count: 3, percent: 2 },
  ],
};

const getComponentItemImage = (
  productId: string,
  variantId?: string | null
): string | null => {
  if (variantId) {
    const variant = getVariantById(productId, variantId);
    if (variant?.imageUrl) return variant.imageUrl;
  }
  const product = getProductById(productId);
  return product?.imageUrl ?? null;
};

export const productDetailsMockData: IProductDetailsMockData = {
  categories: {
    primary: mockCategories[0],
    list: mockCategories.slice(1, 4),
  },
  tags: mockTags.slice(0, 5),
  reviews: defaultReviewsData,
  attributes: createAttributesMockData(),
  options: MOCK_OPTION_GROUPS,
  components: mockGroups,
  inventory: getMockInventoryWidget(),
  getComponentItemImage,
};
