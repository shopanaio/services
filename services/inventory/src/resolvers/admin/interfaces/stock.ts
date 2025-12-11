/**
 * Stock interface types - simple value types only
 * Main Warehouse type is derived from WarehouseResolver in derived.ts
 */

/**
 * Represents stock level for a variant in a specific warehouse
 */
export interface WarehouseStock {
  /** UUID of the stock record */
  id: string;
  /** UUID of the warehouse where this stock is located */
  warehouseId: string;
  /** UUID of the variant this stock record is for */
  variantId: string;
  /** The quantity currently on hand */
  quantityOnHand: number;
  /** The date and time when the entity was created */
  createdAt: Date;
  /** The date and time when the entity was last updated */
  updatedAt: Date;
}
