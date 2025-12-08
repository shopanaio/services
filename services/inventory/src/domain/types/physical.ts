/**
 * Physical domain types - matches GraphQL schema
 */

/**
 * Physical dimensions of a variant (stored in millimeters)
 */
export interface VariantDimensions {
  /** Width in millimeters */
  width: number;
  /** Length in millimeters */
  length: number;
  /** Height in millimeters */
  height: number;
}

/**
 * Physical weight of a variant (stored in grams)
 */
export interface VariantWeight {
  /** Weight in grams */
  value: number;
}
