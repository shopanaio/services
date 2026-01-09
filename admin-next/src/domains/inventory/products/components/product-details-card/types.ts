import type { ReactNode } from "react";

// ============================================================================
// Inventory Types
// ============================================================================

export type SyncStatus = "synced" | "stale" | "error" | "syncing";

export interface IWarehouseStock {
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  isDefault: boolean;
  onHandQty: number;
  reservedQty: number;
  availableQty: number;
  totalSKUs: number;
  lowStockSKUs: number;
  outOfStockSKUs: number;
  backorderSKUs: number;
  lastSyncAt: Date;
  syncStatus: SyncStatus;
}

export interface IInventoryStats {
  availableQty: number;
  onHandQty: number;
  reservedQty: number;
  totalSKUs: number;
  lowStockSKUs: number;
  lowStockPercent: number;
  outOfStockSKUs: number;
  outOfStockPercent: number;
  backorderSKUs: number;
  pendingOrders: number;
  lastSyncAt: Date;
  syncStatus: SyncStatus;
  changeVs7d: number;
  thresholdType: "safety_stock" | "reorder_point";
}

// ============================================================================
// Review Types
// ============================================================================

export interface IReviewBreakdown {
  stars: number;
  count: number;
  percent: number;
}

export interface IReviewsData {
  rating: number;
  reviewsCount: number;
  breakdown: IReviewBreakdown[];
}

// ============================================================================
// Section Props
// ============================================================================

export interface ISectionProps {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  extra?: ReactNode;
}

// ============================================================================
// Variant Types for Table
// ============================================================================

export interface IVariantOption {
  title: string;
  group: {
    slug: string;
    title: string;
  };
}

export interface IVariantForTable {
  id: string;
  title?: string | null;
  sku?: string | null;
  price: number;
  oldPrice?: number | null;
  costPrice?: number | null;
  stockStatus: string;
  weight?: number | null;
  weightUnit?: string;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  dimensionUnit?: string;
  options?: IVariantOption[];
  gallery?: Array<{ id: string; url: string; name?: string | null }>;
}
