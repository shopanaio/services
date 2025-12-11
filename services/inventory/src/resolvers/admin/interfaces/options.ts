/**
 * Options interface types - simple value types only
 * Main Option and OptionValue types are derived from resolvers in derived.ts
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
 * Represents a selected option for a variant
 */
export interface SelectedOption {
  /** UUID of the option */
  optionId: string;
  /** UUID of the selected value */
  optionValueId: string;
}
