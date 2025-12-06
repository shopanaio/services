import type { UserError } from "../../../kernel/BaseScript.js";

/**
 * Input for creating/updating a feature value
 */
export interface FeatureValueInput {
  readonly slug: string;
  readonly name: string;
}

/**
 * Input for updating an existing feature value
 */
export interface FeatureValueUpdateInput {
  readonly id: string;
  readonly slug?: string;
  readonly name?: string;
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
