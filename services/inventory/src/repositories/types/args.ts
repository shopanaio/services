/**
 * Common argument types for type-executor resolvers
 */

/**
 * Relay-style pagination arguments
 */
export interface PaginationArgs {
  first?: number;
  last?: number;
  after?: string;
  before?: string;
}

/**
 * Arguments for Product.variants resolver
 */
export type ProductVariantsArgs = PaginationArgs;

/**
 * Arguments for Variant.priceHistory resolver
 */
export type VariantPriceHistoryArgs = PaginationArgs;

/**
 * Arguments for Variant.costHistory resolver
 */
export type VariantCostHistoryArgs = PaginationArgs;
