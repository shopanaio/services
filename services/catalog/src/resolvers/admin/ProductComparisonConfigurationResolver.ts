import { CatalogType } from "./CatalogType.js";
import { ComparisonFieldResolver, ComparisonFieldOptionResolver, ComparisonProfileResolver } from "./ComparisonProfileResolver.js";
import type { ComparisonField, ComparisonFieldOption } from "../../repositories/models/comparison.js";

export class ProductComparisonConfigurationResolver extends CatalogType<string> {
  private async data() {
    const effective = await this.$ctx.loaders.effectiveComparisonProfileByProduct.load(this.$props);
    const profileId = effective?.profileId ?? null;
    const fields: ComparisonField[] = profileId ? await this.$ctx.loaders.comparisonFieldsByProfile.load(profileId) : [];
    const config = await this.$ctx.loaders.comparisonConfigurationByProduct.load(this.$props);
    const features = await this.$ctx.kernel.repository.feature.findByProductId(this.$props);
    const options = await this.$ctx.kernel.repository.option.findByProductId(this.$props);
    return { effective, profileId, fields, config, features, options };
  }
  product() { return this.resolvers.product(this.$props); }
  async effectiveProfile() { const { profileId } = await this.data(); return profileId ? new ComparisonProfileResolver(profileId, this.$ctx) : null; }
  async compatibilityStatus() { const { effective } = await this.data(); return !effective?.profileId ? "NO_PROFILE" : effective.enabled ? "FULL" : "PROFILE_DISABLED"; }
  async entries() { const data = await this.data(); return data.fields.map((field) => new ProductComparisonConfigurationEntryResolver({ productId: this.$props, profileId: data.profileId!, field, config: data.config }, this.$ctx)); }
  async unmappedFeatures() { const data = await this.data(); const mapped = new Set(data.config.featureBindings.map((row: any) => row.featureId)); return Promise.all(data.features.filter((row) => !row.isGroup && !mapped.has(row.id)).map((row) => this.resolvers.feature(row.id))); }
  async unmappedOptions() { const data = await this.data(); const mapped = new Set(data.config.optionBindings.map((row: any) => row.optionId)); return Promise.all(data.options.filter((row) => !mapped.has(row.id)).map((row) => this.resolvers.option(row.id))); }
}

class ProductComparisonConfigurationEntryResolver extends CatalogType<{ productId: string; profileId: string; field: ComparisonField; config: any }> {
  field() { return new ComparisonFieldResolver(this.$props.field, this.$ctx); }
  private featureBinding() { return this.$props.config.featureBindings.find((row: any) => row.fieldId === this.$props.field.id); }
  private optionBinding() { return this.$props.config.optionBindings.find((row: any) => row.fieldId === this.$props.field.id); }
  private na() { return this.$props.config.notApplicable.find((row: any) => row.fieldId === this.$props.field.id); }
  sourceKind() { return this.featureBinding() ? "FEATURE" : this.optionBinding() ? "OPTION" : this.na() ? "NOT_APPLICABLE" : "MISSING"; }
  async feature() { const row = this.featureBinding(); return row ? this.resolvers.feature(row.featureId) : null; }
  async option() { const row = this.optionBinding(); return row ? this.resolvers.option(row.optionId) : null; }
  notApplicableReason() { return this.na()?.reason ?? null; }
  featureValues() { const row = this.featureBinding(); return row ? this.$props.config.featureValues.filter((value: any) => value.featureId === row.featureId).map((value: any) => new NormalizedFeatureValueResolver({ value, profileId: this.$props.profileId }, this.$ctx)) : []; }
  optionValues() { const row = this.optionBinding(); return row ? this.$props.config.optionValues.filter((value: any) => value.optionId === row.optionId).map((value: any) => new NormalizedOptionValueResolver({ value, profileId: this.$props.profileId }, this.$ctx)) : []; }
}

class NormalizedFeatureValueResolver extends CatalogType<{ value: any; profileId: string }> {
  value() { return this.resolvers.featureValue(this.$props.value.featureValueId); }
  booleanValue() { return this.$props.value.booleanValue; } decimalValue() { return this.$props.value.decimalValue; } integerValue() { return this.$props.value.integerValue?.toString() ?? null; } textValue() { return this.$props.value.textValue; }
  async fieldOption() { return optionResolver(this.$props.value.fieldOptionId, this.$props.profileId, this.$ctx); }
}
class NormalizedOptionValueResolver extends CatalogType<{ value: any; profileId: string }> {
  value() { return this.resolvers.optionValue(this.$props.value.optionValueId); }
  booleanValue() { return this.$props.value.booleanValue; } decimalValue() { return this.$props.value.decimalValue; } integerValue() { return this.$props.value.integerValue?.toString() ?? null; } textValue() { return this.$props.value.textValue; }
  async fieldOption() { return optionResolver(this.$props.value.fieldOptionId, this.$props.profileId, this.$ctx); }
}
async function optionResolver(id: string | null, profileId: string, ctx: any) { if (!id) return null; const fields = await ctx.loaders.comparisonFieldsByProfile.load(profileId); const options: ComparisonFieldOption[] = await ctx.kernel.repository.comparisonRead.getOptionsByFieldIds(fields.map((row: ComparisonField) => row.id)); const row = options.find((item) => item.id === id); return row ? new ComparisonFieldOptionResolver({ row, profileId }, ctx) : null; }
