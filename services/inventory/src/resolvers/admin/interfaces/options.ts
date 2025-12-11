/**
 * Options interface types
 */

/** Display type for product options in the UI */
export type OptionDisplayType = "DROPDOWN" | "SWATCH" | "BUTTONS";

/** Type of visual swatch for option values */
export type SwatchType = "COLOR" | "GRADIENT" | "IMAGE";

/**
 * A visual swatch for representing an option value
 */
export interface ProductOptionSwatch {
  /** UUID of the swatch */
  id: string;
  /** The type of swatch */
  swatchType: SwatchType;
  /** The primary color (hex code or color name) */
  colorOne: string | null;
  /** The secondary color for gradients */
  colorTwo: string | null;
  /** UUID of the file for image-based swatches */
  fileId: string | null;
  /** Additional metadata for the swatch */
  metadata: Record<string, unknown> | null;
}

/**
 * A value for a product option, such as "Red" for Color or "Large" for Size
 */
export interface ProductOptionValue {
  /** UUID of the option value */
  id: string;
  /** The URL-friendly identifier for this value */
  slug: string;
  /** Display name */
  name: string;
  /** The visual swatch for this value (if applicable) */
  swatch: ProductOptionSwatch | null;
}

/**
 * A product option defines a configurable aspect of a product, such as Size or Color
 */
export interface Option {
  /** UUID of the option */
  id: string;
  /** The URL-friendly identifier for this option */
  slug: string;
  /** Display name */
  name: string;
  /** The display type for UI rendering */
  displayType: OptionDisplayType;
  /** The available values for this option */
  values: ProductOptionValue[];
}

/**
 * Represents a selected option for a variant
 */
export interface SelectedOption {
  /** UUID of the option */
  optionId: string;
  /** UUID of the selected value */
  optionValueId: string;
}
