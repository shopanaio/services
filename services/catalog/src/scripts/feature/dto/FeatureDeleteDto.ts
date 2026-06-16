import type { FeatureResultBase } from "./shared.js";

export interface FeatureDeleteParams {
  readonly id: string;
}

export interface FeatureDeleteResult extends FeatureResultBase {
  deletedFeatureId?: string;
}
