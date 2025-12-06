import type { FeatureResultBase } from "./shared.js";

export interface FeatureValueDeleteParams {
  readonly id: string;
}

export interface FeatureValueDeleteResult extends FeatureResultBase {
  deletedId?: string;
}
