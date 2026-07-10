import type { CatalogProductFeatureValueRef } from "@shopana/broker-types";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import { CatalogProductFeatureValueRefResolver } from "./CatalogProductFeatureValueRefResolver.js";
import { ServiceType } from "./ServiceType.js";

type CatalogProductFeatureSelectionSnapshotData = {
  id?: string;
  handle: string;
  values: CatalogProductFeatureValueRef[];
};

export class CatalogProductFeatureSelectionSnapshotResolver extends ServiceType<
  string,
  CatalogProductFeatureSelectionSnapshotData
> {
  protected async $preload(): Promise<CatalogProductFeatureSelectionSnapshotData> {
    const feature = await this.$ctx.loaders.productFeature.load(this.$props);
    if (!feature) {
      throw new PreloadNotFoundError(
        `Product feature with ID ${this.$props} not found`
      );
    }

    const valueIds = await this.$ctx.loaders.featureValueIds.load(feature.id);
    const values = await Promise.all(
      valueIds.map(async (valueId) =>
        new CatalogProductFeatureValueRefResolver(valueId, this.$ctx).$snapshot()
      )
    );

    return {
      id: feature.id,
      handle: feature.slug,
      values,
    };
  }

  async id(): Promise<string | null> {
    return (await this.$get("id")) ?? null;
  }

  async handle(): Promise<string> {
    return this.$get("handle");
  }

  async values(): Promise<CatalogProductFeatureValueRefResolver[]> {
    const valueIds = await this.$ctx.loaders.featureValueIds.load(this.$props);
    return valueIds.map(
      (valueId) => new CatalogProductFeatureValueRefResolver(valueId, this.$ctx)
    );
  }

  async $snapshot() {
    return this.$data;
  }
}
