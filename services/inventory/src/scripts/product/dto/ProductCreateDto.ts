import type { FeatureValueInput } from "../../feature/dto/index.js";
import type { OptionValueInput } from "../../option/dto/index.js";
import type { DescriptionInput, ProductWithVariants, ProductResultBase } from "./shared.js";

/**
 * Input for creating a feature on a product
 */
export interface FeatureInput {
  readonly slug: string;
  readonly name: string;
  readonly values: FeatureValueInput[];
}

/**
 * Input for creating an option on a product
 */
export interface OptionInput {
  readonly slug: string;
  readonly name: string;
  readonly displayType: string;
  readonly values: OptionValueInput[];
}

export interface ProductCreateParams {
  readonly title?: string;
  readonly description?: DescriptionInput;
  readonly excerpt?: string;
  readonly seoTitle?: string;
  readonly seoDescription?: string;
  readonly features?: FeatureInput[];
  readonly options?: OptionInput[];
  readonly publish?: boolean;
}

export interface ProductCreateResult extends ProductResultBase {
  product?: ProductWithVariants;
}
