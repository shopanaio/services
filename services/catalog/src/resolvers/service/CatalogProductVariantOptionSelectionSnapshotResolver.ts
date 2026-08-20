import type { CatalogProductOptionValueRef } from "@shopana/broker-types";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import type { CatalogProductOptionValueRefResolver } from "./CatalogProductOptionValueRefResolver.js";
import { ServiceType } from "./ServiceType.js";

export type CatalogProductVariantOptionSelectionSnapshotInput = {
  variantId: string;
  optionId: string;
};

type CatalogProductVariantOptionSelectionSnapshotData = {
  id?: string;
  handle: string;
  values: CatalogProductOptionValueRef[];
};

export class CatalogProductVariantOptionSelectionSnapshotResolver extends ServiceType<
  CatalogProductVariantOptionSelectionSnapshotInput,
  CatalogProductVariantOptionSelectionSnapshotData
> {
  protected async $preload(): Promise<CatalogProductVariantOptionSelectionSnapshotData> {
    const option = await this.$ctx.loaders.productOption.load(this.$props.optionId);
    if (!option) {
      throw new PreloadNotFoundError(`Product option with ID ${this.$props.optionId} not found`);
    }

    const valueIds = await this.getSelectedValueIds();
    const values = await Promise.all(
      valueIds.map(async (valueId) => {
        const resolver = await this.resolvers.catalogProductOptionValueRef(valueId);
        return resolver.$snapshot();
      }),
    );

    return {
      id: option.id,
      handle: option.slug,
      values,
    };
  }

  async id(): Promise<string | null> {
    return (await this.$get("id")) ?? null;
  }

  async handle(): Promise<string> {
    return this.$get("handle");
  }

  async values(): Promise<CatalogProductOptionValueRefResolver[]> {
    const valueIds = await this.getSelectedValueIds();
    return Promise.all(
      valueIds.map((valueId) => this.resolvers.catalogProductOptionValueRef(valueId)),
    );
  }

  async $snapshot() {
    return this.$data;
  }

  private async getSelectedValueIds(): Promise<string[]> {
    const links = await this.$ctx.loaders.variantSelectedOptions.load(this.$props.variantId);
    return links
      .filter((link) => link.optionId === this.$props.optionId && link.optionValueId !== null)
      .map((link) => link.optionValueId!);
  }
}
