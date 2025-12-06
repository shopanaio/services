import type { Product } from "../../../repositories/models/index.js";
import type { FeatureValueInput, FeatureValuesInput } from "../../feature/dto/index.js";
import type { OptionValueInput, OptionValuesInput } from "../../option/dto/index.js";
import type { DescriptionInput, ProductResultBase } from "./shared.js";

/**
 * Input for creating a feature during product update
 */
export interface FeatureInput {
  readonly slug: string;
  readonly name: string;
  readonly values: FeatureValueInput[];
}

/**
 * Input for updating an existing feature
 */
export interface FeatureUpdateInput {
  readonly id: string;
  readonly slug?: string;
  readonly name?: string;
  readonly values?: FeatureValuesInput;
}

/**
 * Input for batch operations on features
 */
export interface FeaturesInput {
  readonly create?: FeatureInput[];
  readonly update?: FeatureUpdateInput[];
  readonly delete?: string[];
}

/**
 * Input for creating an option during product update
 */
export interface OptionInput {
  readonly slug: string;
  readonly name: string;
  readonly displayType: string;
  readonly values: OptionValueInput[];
}

/**
 * Input for updating an existing option
 */
export interface OptionUpdateInput {
  readonly id: string;
  readonly slug?: string;
  readonly name?: string;
  readonly displayType?: string;
  readonly values?: OptionValuesInput;
}

/**
 * Input for batch operations on options
 */
export interface OptionsInput {
  readonly create?: OptionInput[];
  readonly update?: OptionUpdateInput[];
  readonly delete?: string[];
}

export interface ProductUpdateParams {
  readonly id: string;
  readonly title?: string;
  readonly description?: DescriptionInput;
  readonly excerpt?: string;
  readonly seoTitle?: string;
  readonly seoDescription?: string;
  readonly features?: FeaturesInput;
  readonly options?: OptionsInput;
}

export interface ProductUpdateResult extends ProductResultBase {
  product?: Product;
}
