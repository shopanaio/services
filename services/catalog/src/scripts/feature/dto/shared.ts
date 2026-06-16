import type { UserError } from "../../../kernel/BaseScript.js";

/**
 * Input for creating a feature value
 */
export interface FeatureValueInput {
  readonly name: string;
  readonly slug: string;
}

/**
 * Input for updating an existing feature value
 */
export interface FeatureValueUpdateInput {
  readonly id: string;
  readonly name?: string;
  readonly slug?: string;
}

/**
 * Input for batch operations on feature values
 */
export interface FeatureValuesInput {
  readonly create?: FeatureValueInput[];
  readonly update?: FeatureValueUpdateInput[];
  readonly delete?: string[];
}

/**
 * Base result interface for feature scripts
 */
export interface FeatureResultBase {
  userErrors: UserError[];
}
