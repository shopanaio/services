import type { Product, ProductFeature } from "../../../repositories/models/index.js";
import type { FeatureResultBase } from "./shared.js";

export interface FeatureValueSyncInput {
  readonly id?: string;
  readonly index: number;
  readonly name: string;
}

export interface FeatureSyncItemInput {
  readonly id?: string;
  readonly index: number[];
  readonly isGroup: boolean;
  readonly name: string;
  readonly values?: FeatureValueSyncInput[];
}

export interface FeatureSyncParams {
  readonly productId: string;
  readonly features: FeatureSyncItemInput[];
}

export interface FeatureSyncResult extends FeatureResultBase {
  product?: Product;
  features: ProductFeature[];
}
