/**
 * Inventory service broker action types
 */

export const InventoryCheckoutActionNames = {
  reserve: "reserveCheckoutInventory",
  renew: "renewCheckoutInventory",
  confirm: "confirmCheckoutInventory",
  release: "releaseCheckoutInventory",
} as const;

export const InventoryCheckoutActions = {
  reserve: `inventory.${InventoryCheckoutActionNames.reserve}`,
  renew: `inventory.${InventoryCheckoutActionNames.renew}`,
  confirm: `inventory.${InventoryCheckoutActionNames.confirm}`,
  release: `inventory.${InventoryCheckoutActionNames.release}`,
} as const;

export interface ReserveCheckoutInventoryParams {
  storeId: string;
  orderId: string;
  idempotencyKey: string;
  correlationId: string;
  expiresAt: string;
  lines: readonly Readonly<{
    lineId: string;
    variantId: string;
    quantity: number;
  }>[];
}

export interface CheckoutInventoryReservationAllocation {
  reservationId: string;
  lineId: string;
  variantId: string;
  warehouseId: string;
  quantity: number;
}

export interface ReserveCheckoutInventoryResult {
  revision: string;
  allocations: readonly CheckoutInventoryReservationAllocation[];
}

export interface RenewCheckoutInventoryParams {
  storeId: string;
  orderId: string;
  expiresAt: string;
}

export interface RenewCheckoutInventoryResult {
  renewedReservationIds: readonly string[];
}

export interface ConfirmCheckoutInventoryParams {
  storeId: string;
  orderId: string;
}

export interface ConfirmCheckoutInventoryResult {
  confirmedReservationIds: readonly string[];
}

export interface ReleaseCheckoutInventoryParams {
  storeId: string;
  orderId: string;
  idempotencyKey: string;
  correlationId: string;
}

export interface ReleaseCheckoutInventoryResult {
  releasedReservationIds: readonly string[];
}

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
// Create Item Action
// ============================================================================

export interface CreateItemParams {
  storeId: string;
  variantId: string;
  trackInventory: boolean;
  requiresShipping: boolean;
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
  warehouseId?: string;
  onHand?: number;
  unavailable?: number;
  sku?: string | null;
  trackInventory?: boolean;
  requiresShipping?: boolean;
  continueSellingWhenOutOfStock?: boolean;
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
