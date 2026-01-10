/**
 * Type of threshold used for low stock calculation
 */
export enum ThresholdType {
  /** Minimum stock level to prevent stockouts */
  SAFETY_STOCK = "SAFETY_STOCK",
  /** Level at which new orders should be placed */
  REORDER_POINT = "REORDER_POINT",
}

/**
 * API Response: Product Inventory Statistics
 *
 * Aggregated inventory metrics for a product across all variants/SKUs.
 * Used by InventorySection component to display quantity and health KPIs.
 *
 * @example
 * ```json
 * {
 *   "quantity": {
 *     "available": 1250,
 *     "onHand": 1500,
 *     "unavailable": 10
 *   },
 *   "reservations": {
 *     "quantity": 250,
 *     "orders": 15
 *   },
 *   "skuCounts": {
 *     "total": 24,
 *     "lowStock": 3,
 *     "outOfStock": 1,
 *     "backorder": 2
 *   },
 *   "health": {
 *     "lowStockPercent": 12.5,
 *     "outOfStockPercent": 4.2
 *   },
 *   "settings": {
 *     "lowStockMethod": "SAFETY_STOCK",
 *     "lowStockValue": 10
 *   },
 *   "trends": {
 *     "velocityPerDay": 12.5,
 *     "daysOfStock": 100,
 *     "stockChangeVs7d": -45
 *   }
 * }
 * ```
 */
export interface ProductInventoryStatsResponse {
  /** Quantity metrics (in units) */
  quantity: {
    /** Units available for sale (onHand - reserved - unavailable) */
    available: number;
    /** Total physical units in warehouse */
    onHand: number;
    /** Unavailable (damaged, returning etc.) */
    unavailable: number;
    /** Reserved inventory for pending orders */
  };

  reserved: {
    /** Units allocated to pending orders */
    quantity: number;
    /** Number of orders holding reservations */
    orders: number;
  };

  /** SKU counts by stock status */
  skuCounts: {
    /** Total number of SKUs for this product */
    total: number;
    /** SKUs below threshold (safety stock or reorder point) */
    lowStock: number;
    /** SKUs with zero available units */
    outOfStock: number;
    /** SKUs with incoming stock expected */
    backorder: number;
  };

  /** Inventory health indicators */
  health: {
    /** Percentage of SKUs that are low stock */
    lowStockPercent: number;
    /** Percentage of SKUs that are out of stock */
    outOfStockPercent: number;
  };

  /** Inventory tracking settings */
  settings: {
    /** Method used to calculate low stock threshold */
    lowStockMethod: ThresholdType;
    /** Threshold value in units (when below this, SKU is "low stock") */
    lowStockValue: number;
  };

  /** Trend and velocity metrics */
  trends: {
    /** Average units sold per day (last 30 days) */
    velocityPerDay: number;
    /** Estimated days until stockout at current velocity */
    daysOfStock: number | null;
    /** Stock level change vs 7 days ago (+/-) */
    stockChangeVs7d: number;
  };
}

/**
 * Flat inventory stats interface used by components
 */
export interface InventoryStats {
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
  velocityPerDay: number;
  daysOfStock: number | null;
  stockChangeVs7d: number;
  lowStockMethod: ThresholdType;
  lowStockValue: number;
}

/**
 * Transforms API response to component props format
 */
export function mapInventoryResponseToStats(
  response: ProductInventoryStatsResponse
): InventoryStats {
  return {
    availableQty: response.quantity.available,
    onHandQty: response.quantity.onHand,
    reservedQty: response.reservations.quantity,
    totalSKUs: response.skuCounts.total,
    lowStockSKUs: response.skuCounts.lowStock,
    lowStockPercent: response.health.lowStockPercent,
    outOfStockSKUs: response.skuCounts.outOfStock,
    outOfStockPercent: response.health.outOfStockPercent,
    backorderSKUs: response.skuCounts.backorder,
    pendingOrders: response.reservations.orders,
    velocityPerDay: response.trends.velocityPerDay,
    daysOfStock: response.trends.daysOfStock,
    stockChangeVs7d: response.trends.stockChangeVs7d,
    lowStockMethod: response.settings.lowStockMethod,
    lowStockValue: response.settings.lowStockValue,
  };
}
