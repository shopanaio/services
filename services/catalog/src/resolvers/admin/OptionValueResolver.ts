import type { ProductOptionValue } from "../../repositories/models/index.js";
import { CatalogType } from "./CatalogType.js";

/**
 * Option value view - resolves ProductOptionValue domain interface
 * Accepts option value ID, loads data lazily via loaders
 */
export class OptionValueResolver extends CatalogType<
  string,
  ProductOptionValue
> {
  async $preload() {
    const value = await this.$ctx.loaders.optionValue.load(this.$props);
    if (!value) {
      throw new Error(`OptionValue with ID ${this.$props} not found`);
    }
    return value;
  }

  id() {
    return this.$props;
  }

  async slug() {
    return (await this.$get("slug")) ?? "";
  }

  async name() {
    const translation = await this.$ctx.loaders.optionValueTranslation.load(
      this.$props
    );
    if (translation?.name) return translation.name;
    return (await this.$get("slug")) ?? "";
  }

  async swatch(): Promise<{
    id: string;
    swatchType: string;
    colorOne: string | null;
    colorTwo: string | null;
    file: { __typename: "File"; id: string } | null;
    metadata: unknown;
  } | null> {
    const swatchId = await this.$get("swatchId");
    if (!swatchId) return null;

    const swatch = await this.$ctx.loaders.swatch.load(swatchId);
    if (!swatch) return null;

    return {
      id: swatch.id,
      swatchType: swatch.swatchType,
      colorOne: swatch.colorOne,
      colorTwo: swatch.colorTwo,
      file: swatch.imageId
        ? { __typename: "File" as const, id: swatch.imageId }
        : null,
      metadata: swatch.metadata,
    };
  }
}
