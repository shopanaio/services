import type { ProductFeatureValue } from "../../../repositories/models/index.js";
import type { FeatureResultBase } from "./shared.js";

export interface FeatureValueUpdateParams {
  readonly id: string;
  readonly slug?: string;
  readonly name?: string;
}

export interface FeatureValueUpdateResult extends FeatureResultBase {
  featureValue?: ProductFeatureValue;
}
