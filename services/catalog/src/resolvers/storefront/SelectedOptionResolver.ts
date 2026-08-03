import { CatalogType } from "./CatalogType.js";

export interface SelectedOptionResolverInput {
  optionId: string;
  optionValueId: string;
}

export class SelectedOptionResolver extends CatalogType<SelectedOptionResolverInput> {
  option() {
    return this.resolvers.productOption(this.$props.optionId);
  }

  optionValue() {
    return this.resolvers.productOptionValue(this.$props.optionValueId);
  }

  async name() {
    const translation = await this.$ctx.loaders.optionTranslation.load(
      this.$props.optionId,
    );
    if (translation?.name) return translation.name;
    const option = await this.$ctx.loaders.productOption.load(
      this.$props.optionId,
    );
    return option?.slug ?? "";
  }

  async value() {
    const translation = await this.$ctx.loaders.optionValueTranslation.load(
      this.$props.optionValueId,
    );
    if (translation?.name) return translation.name;
    const value = await this.$ctx.loaders.optionValue.load(
      this.$props.optionValueId,
    );
    return value?.slug ?? "";
  }
}
