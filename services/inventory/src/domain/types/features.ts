/**
 * Features domain types - matches GraphQL schema
 */

/**
 * A value for a product feature
 */
export interface ProductFeatureValue {
  /** UUID of the feature value */
  id: string;
  /** The URL-friendly identifier for this value */
  slug: string;
  /** Display name */
  name: string;
}

/**
 * A product feature represents a searchable attribute of a product (e.g., Material, Brand)
 */
export interface Feature {
  /** UUID of the feature */
  id: string;
  /** The URL-friendly identifier for this feature */
  slug: string;
  /** Display name */
  name: string;
  /** The available values for this feature */
  values: ProductFeatureValue[];
}
