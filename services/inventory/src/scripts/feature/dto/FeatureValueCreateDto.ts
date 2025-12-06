import type { ProductFeatureValue } from "../../../repositories/models/index.js";
import type { FeatureResultBase } from "./shared.js";

export interface FeatureValueCreateParams {
  readonly featureId: string;
  readonly slug: string;
  readonly name: string;
  readonly sortIndex?: number;
}

export interface FeatureValueCreateResult extends FeatureResultBase {
  featureValue?: ProductFeatureValue;
}
