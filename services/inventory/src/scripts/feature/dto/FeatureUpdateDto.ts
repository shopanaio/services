import type { ProductFeature } from "../../../repositories/models/index.js";
import type { FeatureValuesInput, FeatureResultBase } from "./shared.js";

export interface FeatureUpdateParams {
  readonly id: string;
  readonly slug?: string;
  readonly name?: string;
  readonly values?: FeatureValuesInput;
}

export interface FeatureUpdateResult extends FeatureResultBase {
  feature?: ProductFeature;
}
