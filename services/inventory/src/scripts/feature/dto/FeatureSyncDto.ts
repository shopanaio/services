import type { Product, ProductFeature } from "../../../repositories/models/index.js";
import type { FeatureResultBase } from "./shared.js";

export interface FeatureValueSyncInput {
  readonly id?: string;
  readonly slug: string;
  readonly name: string;
  readonly sortIndex?: number;
}

export interface FeatureSyncItemInput {
  readonly id?: string;
  readonly clientId?: string;
  readonly isGroup?: boolean;
  readonly parentId?: string;
  readonly parentClientId?: string;
  readonly slug: string;
  readonly name: string;
  readonly sortIndex?: number;
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
