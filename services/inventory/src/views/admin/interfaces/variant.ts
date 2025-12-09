/**
 * Variant interface types
 */

import type { Timestamps, SoftDeletable } from "./common.js";
import type { VariantPrice, VariantCost } from "./pricing.js";
import type { VariantDimensions, VariantWeight } from "./physical.js";
import type { WarehouseStock } from "./stock.js";
import type { SelectedOption } from "./options.js";
import type { VariantMediaItem } from "./media.js";

/**
 * A variant represents a specific version of a product, such as a size or color
 */
export interface Variant extends Timestamps, SoftDeletable {
  /** UUID of the variant */
  id: string;
  /** UUID of the product this variant belongs to */
  productId: string;
  /** Whether this is the default variant for the product */
  isDefault: boolean;
  /** The URL-friendly handle for the variant (generated from options) */
  handle: string;
  /** The SKU (Stock Keeping Unit) of the variant */
  sku: string | null;
  /** The external system identifier for integration purposes */
  externalSystem: string | null;
  /** The external ID in the external system */
  externalId: string | null;

  /** Variant title */
  title: string | null;

  /** Current price for this variant */
  price: VariantPrice | null;
  /** Current cost for this variant */
  cost: VariantCost | null;

  /** The selected option values for this variant */
  selectedOptions: SelectedOption[];

  /** Physical dimensions of this variant */
  dimensions: VariantDimensions | null;
  /** Physical weight of this variant */
  weight: VariantWeight | null;

  /** Stock levels for this variant across warehouses */
  stock: WarehouseStock[];
  /** Whether the variant is in stock (has quantity > 0 in any warehouse) */
  inStock: boolean;

  /** Media attached to this variant (images, videos) */
  media: VariantMediaItem[];
}
