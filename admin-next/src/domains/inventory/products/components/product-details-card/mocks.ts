import { mockCategories } from "../../modals/edit-categories-modal/mocks";
import { mockTags } from "../../modals/edit-tags-modal/mocks";
import { MOCK_OPTION_GROUPS } from "../../modals/edit-options-modal/mocks";
import { mockGroups } from "../../modals/edit-components-modal/mocks/mock-data";
import { createMockData as createAttributesMockData } from "../../modals/edit-attributes-modal/mocks";
import type { IProductDetailsMockData, IInventoryStats } from "./types";

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
};
