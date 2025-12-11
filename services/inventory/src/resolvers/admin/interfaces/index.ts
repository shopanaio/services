/**
 * Admin view interfaces
 */

// Simple value types (manual interfaces - no resolvers)
export type { Description } from "./product.js";
export type { CurrencyCode, VariantPrice, VariantCost } from "./pricing.js";
export type { VariantDimensions, VariantWeight } from "./physical.js";
export type { WarehouseStock } from "./stock.js";
export type { VariantMediaItem } from "./media.js";
export type { OptionDisplayType, SwatchType, ProductOptionSwatch, SelectedOption } from "./options.js";

// Derived types from Resolver classes (auto-generated from TypeResult)
export type {
  Product,
  Variant,
  Warehouse,
  Option,
  OptionValue,
  Feature,
  FeatureValue,
  VariantPriceHistory,
} from "./derived.js";
