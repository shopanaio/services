/**
 * Stock domain types - matches GraphQL schema
 */

import type { Timestamps } from "./common.js";

/**
 * A warehouse represents a physical location where inventory is stored
 */
export interface Warehouse extends Timestamps {
  /** UUID of the warehouse */
  id: string;
  /** The unique code identifying this warehouse */
  code: string;
  /** The display name of the warehouse */
  name: string;
  /** Whether this is the default warehouse for the project */
  isDefault: boolean;
}

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
