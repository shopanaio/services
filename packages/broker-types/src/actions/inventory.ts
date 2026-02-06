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
