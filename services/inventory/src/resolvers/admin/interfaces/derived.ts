/**
 * Derived types from Resolver classes using TypeResult helper
 * These types are automatically inferred from the resolver method signatures
 */

import type { TypeResult } from "@shopana/type-resolver";
import type { ProductResolver } from "../ProductResolver.js";
import type { VariantResolver } from "../VariantResolver.js";
import type { WarehouseResolver } from "../WarehouseResolver.js";
import type { OptionResolver } from "../OptionResolver.js";
import type { OptionValueResolver } from "../OptionValueResolver.js";
import type { FeatureResolver } from "../FeatureResolver.js";
import type { FeatureValueResolver } from "../FeatureValueResolver.js";
import type { VariantPriceResolver } from "../VariantPriceResolver.js";

/** Product type derived from ProductResolver */
export type Product = TypeResult<typeof ProductResolver>;

/** Variant type derived from VariantResolver */
export type Variant = TypeResult<typeof VariantResolver>;

/** Warehouse type derived from WarehouseResolver */
export type Warehouse = TypeResult<typeof WarehouseResolver>;

/** Option type derived from OptionResolver */
export type Option = TypeResult<typeof OptionResolver>;

/** OptionValue type derived from OptionValueResolver */
export type OptionValue = TypeResult<typeof OptionValueResolver>;

/** Feature type derived from FeatureResolver */
export type Feature = TypeResult<typeof FeatureResolver>;

/** FeatureValue type derived from FeatureValueResolver */
export type FeatureValue = TypeResult<typeof FeatureValueResolver>;

/** VariantPrice type derived from VariantPriceResolver */
export type VariantPriceHistory = TypeResult<typeof VariantPriceResolver>;
