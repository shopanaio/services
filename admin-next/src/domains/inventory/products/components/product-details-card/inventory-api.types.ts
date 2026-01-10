/**
 * Method used to calculate low stock threshold
 */
export enum ThresholdType {
  /** Minimum stock level to prevent stockouts */
  SAFETY_STOCK = "SAFETY_STOCK",
  /** Level at which new orders should be placed */
  REORDER_POINT = "REORDER_POINT",
}

/** Unified structure for SKU status metrics */
interface SkuStatusMetric {
  /** Number of SKUs in this status */
  count: number;
  /** Context-dependent average days (until/since out of stock, until arrival) */
  averageDays: number | null;
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
 *   "quantities": {
 *     "availableForSale": 1250,
 *     "onHand": 1500,
 *     "reserved": 250,
 *     "unavailable": 10
 *   },
 *   "skuStatus": {
 *     "total": 24,
 *     "lowStock": { "count": 3, "averageDays": 12 },
 *     "outOfStock": { "count": 1, "averageDays": 3 },
 *     "backorder": { "count": 2, "averageDays": 5 }
 *   },
 *   "salesVelocity": {
 *     "pendingOrders": 15,
 *     "unitsPerDay": 12.5,
 *     "daysUntilOutOfStock": 100,
 *     "weekOverWeekChange": -45
 *   },
 *   "alertThreshold": {
 *     "method": "SAFETY_STOCK",
 *     "minimumStock": 10
 *   }
 * }
 * ```
 */
export interface ProductInventoryWidget {
  /** Physical and logical stock quantities (in units) */
  quantities: {
    /** Units available for immediate sale */
    availableForSale: number;
    /** Total physical units in warehouse */
    onHand: number;
    /** Units allocated to pending orders */
    reserved: number;
    /** Units unavailable (damaged, on hold, etc.) */
    unavailable: number;
  };

  /** SKU/variant status breakdown */
  skuStatus: {
    /** Total number of SKUs for this product */
    total: number;
    /** SKUs below threshold (with avg days until out of stock) */
    lowStock: SkuStatusMetric;
    /** SKUs with zero available (with avg days since out of stock) */
    outOfStock: SkuStatusMetric;
    /** SKUs on backorder (with avg days until arrival) */
    backorder: SkuStatusMetric;
  };

  /** Sales velocity and stock coverage */
  salesVelocity: {
    /** Number of orders awaiting fulfillment */
    pendingOrders: number;
    /** Average units sold per day (last 30 days) */
    unitsPerDay: number;
    /** Estimated days until out of stock at current rate */
    daysUntilOutOfStock: number | null;
    /** Stock level change compared to 7 days ago */
    weekOverWeekChange: number;
  };

  /** Low stock alert configuration */
  alertThreshold: {
    /** Method used to calculate threshold */
    method: ThresholdType;
    /** Threshold value in units */
    minimumStock: number;
  };
}
