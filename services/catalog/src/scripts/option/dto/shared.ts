import type { UserError } from "../../../kernel/BaseScript.js";

/**
 * Input for swatch (color/image) configuration
 */
export interface OptionSwatchInput {
  readonly swatchType: string;
  readonly colorOne?: string;
  readonly colorTwo?: string;
  readonly fileId?: string;
  readonly metadata?: unknown;
}

/**
 * Input for creating/updating an option value
 */
export interface OptionValueInput {
  readonly slug: string;
  readonly name: string;
  readonly swatch?: OptionSwatchInput;
}

/**
 * Input for updating an existing option value
 */
export interface OptionValueUpdateInput {
  readonly id: string;
  readonly slug?: string;
  readonly name?: string;
  readonly swatch?: OptionSwatchInput | null;
}

/**
 * Input for batch operations on option values
 */
export interface OptionValuesInput {
  readonly create?: OptionValueInput[];
  readonly update?: OptionValueUpdateInput[];
  readonly delete?: string[];
}

/**
 * Base result interface for option scripts
 */
export interface OptionResultBase {
  userErrors: UserError[];
}
