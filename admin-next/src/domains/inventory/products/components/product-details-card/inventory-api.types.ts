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
 *   "reserved": {
 *     "quantity": 250,
 *     "orders": 15
 *   },
 *   "skuCounts": {
 *     "total": 24
 *   },
 *   "lowStock": {
 *     "count": 3,
 *     "avgDaysUntilStockout": 12
 *   },
 *   "outOfStock": {
 *     "count": 1,
 *     "avgDaysSinceStockout": 3
 *   },
 *   "backorder": {
 *     "count": 2,
 *     "avgArrivalDays": 5
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
export interface ProductInventoryWidget {
  /** Quantity metrics (in units) */
  quantity: {
    /** Units available for sale (onHand - reserved - unavailable) */
    available: number;
    /** Total physical units in warehouse */
    onHand: number;
  };

  /** Reserved inventory for pending orders */
  reserved: {
    /** Units allocated to pending orders */
    quantity: number;
    /** Number of orders holding reservations */
    orders: number;
  };

  /** Total SKU count */
  totalSKU: number;

  /** Low stock SKUs (below threshold) */
  lowStock: {
    /** Number of SKUs below threshold */
    count: number;
    /** Average days until these SKUs run out (null if no low stock) */
    avgDaysUntilStockout: number | null;
  };

  /** Out of stock SKUs (zero available) */
  outOfStock: {
    /** Number of SKUs with zero available units */
    count: number;
    /** Average days since stockout occurred (null if none out of stock) */
    avgDaysSinceStockout: number | null;
  };

  /** Backorder SKUs (incoming stock expected) */
  backorder: {
    /** Number of SKUs with incoming stock */
    count: number;
    /** Average days until backorder arrives (null if no backorders) */
    avgArrivalDays: number | null;
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
  lowStockAvgDaysUntilStockout: number | null;
  outOfStockSKUs: number;
  outOfStockAvgDaysSince: number | null;
  backorderSKUs: number;
  backorderAvgArrivalDays: number | null;
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
  response: ProductInventoryWidget
): InventoryStats {
  return {
    availableQty: response.quantity.available,
    onHandQty: response.quantity.onHand,
    reservedQty: response.reserved.quantity,
    totalSKUs: response.totalSKU,
    lowStockSKUs: response.lowStock.count,
    lowStockAvgDaysUntilStockout: response.lowStock.avgDaysUntilStockout,
    outOfStockSKUs: response.outOfStock.count,
    outOfStockAvgDaysSince: response.outOfStock.avgDaysSinceStockout,
    backorderSKUs: response.backorder.count,
    backorderAvgArrivalDays: response.backorder.avgArrivalDays,
    pendingOrders: response.reserved.orders,
    velocityPerDay: response.trends.velocityPerDay,
    daysOfStock: response.trends.daysOfStock,
    stockChangeVs7d: response.trends.stockChangeVs7d,
    lowStockMethod: response.settings.lowStockMethod,
    lowStockValue: response.settings.lowStockValue,
  };
}
