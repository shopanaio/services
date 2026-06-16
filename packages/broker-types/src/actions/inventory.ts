/**
 * Inventory service broker action types
 */

// ============================================================================
// File Hard Deleted Action
// ============================================================================

export interface FileHardDeletedParams {
  fileId: string;
}

export interface FileHardDeletedResult {
  deletedCount: number;
}

// ============================================================================
// Get Offers Action
// ============================================================================

export interface GetOffersParams {
  storeId: string;
  variantIds: string[];
}

export interface OfferItem {
  variantId: string;
  available: boolean;
  quantity?: number;
  price?: {
    amount: string;
    currencyCode: string;
  };
}

export interface GetOffersResult {
  offers: OfferItem[];
}

// ============================================================================
// Create Item Action
// ============================================================================

export interface CreateItemParams {
  storeId: string;
  variantId: string;
  trackInventory: boolean;
  sku?: string | null;
  continueSellingWhenOutOfStock?: boolean;
}

export interface CreateItemResult {
  inventoryItemId: string;
}

// ============================================================================
// Delete Item By Variant ID Action (for saga compensation)
// ============================================================================

export interface DeleteItemByVariantIdParams {
  storeId: string;
  variantId: string;
}

export interface DeleteItemByVariantIdResult {
  success: boolean;
}

// ============================================================================
// Update Item Action (stock, SKU, weight, cost)
// ============================================================================

export interface UpdateItemParams {
  storeId: string;
  variantId: string;
  warehouseId: string;
  onHand: number;
  unavailable?: number;
  sku?: string | null;
  weight?: number | null;
  unitCostMinor?: number | null;
  costCurrency?: string | null;
}

export interface UpdateItemResult {
  success: boolean;
  userErrors: Array<{ message: string; code: string; field?: string[] }>;
}

// ============================================================================
// Update Item Dimensions Action
// ============================================================================

export interface UpdateItemDimensionsParams {
  storeId: string;
  variantId: string;
  width: number;
  height: number;
  length: number;
}

export interface UpdateItemDimensionsResult {
  success: boolean;
  userErrors: Array<{ message: string; code: string; field?: string[] }>;
}
