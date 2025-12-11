/**
 * Stock interface types - simple value types only
 * Main Warehouse type is derived from WarehouseResolver in derived.ts
 */

import type { Timestamps } from "./common.js";

/**
 * Represents stock level for a variant in a specific warehouse
 */
export interface WarehouseStock extends Timestamps {
  /** UUID of the stock record */
  id: string;
  /** UUID of the warehouse where this stock is located */
  warehouseId: string;
  /** UUID of the variant this stock record is for */
  variantId: string;
  /** The quantity currently on hand */
  quantityOnHand: number;
}
