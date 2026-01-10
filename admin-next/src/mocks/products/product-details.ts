import { mockCategories, mockTags } from "./data";
import { MOCK_OPTION_GROUPS } from "./options";
import { mockGroups, getProductById, getVariantById } from "./components";
import { createMockData as createAttributesMockData } from "./attributes";
import type {
  IProductDetailsMockData,
  IInventoryStats,
} from "@/domains/inventory/products/components/product-details-card/types";

const getMockInventoryStats = (): IInventoryStats => ({
  availableQty: 967,
  onHandQty: 1032,
  reservedQty: 65,
  totalSKUs: 45,
  lowStockSKUs: 8,
  lowStockPercent: 18,
  outOfStockSKUs: 4,
  outOfStockPercent: 9,
  backorderSKUs: 2,
  pendingOrders: 13,
  lastSyncAt: new Date(),
  syncStatus: "synced",
  changeVs7d: -12,
  thresholdType: "safety_stock",
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
  inventory: getMockInventoryStats(),
  getComponentItemImage,
};
