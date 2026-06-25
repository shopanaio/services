/**
 * Catalog service broker action types
 */

// ============================================================================
// Inventory Item Projection Snapshot Action
// ============================================================================

export interface GetInventoryItemProjectionSnapshotParams {
  storeId: string;
  organizationId: string;
  productId: string;
  variantIds?: string[];
  locales?: string[];
  locale?: string;
  userId?: string;
  requestId?: string;
}

export interface InventoryItemProjectionSnapshotVariant {
  variantId: string;
  externalSystem: string | null;
  externalId: string | null;
  deletedAt: string | null;
}

export interface InventoryItemProjectionSnapshotTranslation {
  productId: string;
  locale: string;
  name: string;
}

export interface InventoryItemProjectionSnapshot {
  productId: string;
  productHandle: string | null;
  deletedAt: string | null;
  revision: number | null;
  variants: InventoryItemProjectionSnapshotVariant[];
  translations: InventoryItemProjectionSnapshotTranslation[];
}

export type InventoryItemProjectionSnapshotErrorCode =
  | "INVALID_CATALOG_SNAPSHOT_INPUT"
  | "CATALOG_PRODUCT_NOT_FOUND"
  | "CATALOG_SNAPSHOT_QUERY_FAILED";

export type GetInventoryItemProjectionSnapshotResult =
  | {
      ok: true;
      snapshot: InventoryItemProjectionSnapshot;
    }
  | {
      ok: false;
      code: InventoryItemProjectionSnapshotErrorCode;
      message: string;
      retryable: boolean;
    };
