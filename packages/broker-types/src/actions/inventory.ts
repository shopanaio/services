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
