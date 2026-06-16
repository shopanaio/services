import type { ProductFeature } from "../../../repositories/models/index.js";
import type { FeatureValueInput, FeatureResultBase } from "./shared.js";

export interface FeatureCreateParams {
  readonly productId: string;
  readonly slug: string;
  readonly name: string;
  readonly values: FeatureValueInput[];
}

export interface FeatureCreateResult extends FeatureResultBase {
  feature?: ProductFeature;
}
