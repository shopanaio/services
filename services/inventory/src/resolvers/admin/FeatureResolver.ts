import type { ProductFeature } from "../../repositories/models/index.js";
import { InventoryType } from "./InventoryType.js";
import { FeatureValueResolver } from "./FeatureValueResolver.js";

/**
 * Feature view - resolves Feature domain interface
 * Accepts feature ID, loads data lazily via loaders
 */
export class FeatureResolver extends InventoryType<string, ProductFeature | null> {
  async $preload() {
    return this.$ctx.loaders.productFeature.load(this.$props);
  }

  id() {
    return this.$props;
  }

  async slug() {
    return (await this.$get("slug")) ?? "";
  }

  async name() {
    const translation = await this.$ctx.loaders.featureTranslation.load(
      this.$props
    );
    if (translation?.name) return translation.name;
    return (await this.$get("slug")) ?? "";
  }

  async isGroup() {
    return (await this.$get("isGroup")) ?? false;
  }

  async sortIndex() {
    return (await this.$get("sortIndex")) ?? 0;
  }

  async parent() {
    const parentId = await this.$get("parentId");
    if (!parentId) return null;
    return new FeatureResolver(parentId, this.$ctx);
  }

  async children() {
    if (!(await this.isGroup())) return [];
    const productId = await this.$get("productId");
    if (!productId) return [];
    const ids = await this.$ctx.loaders.featureChildIds.load({
      productId,
      parentId: this.$props,
    });
    return ids.map((id) => new FeatureResolver(id, this.$ctx));
  }

  /**
   * Returns feature values for this feature
   */
  async values() {
    if (await this.isGroup()) return [];
    const ids = await this.$ctx.loaders.featureValueIds.load(this.$props);
    return ids.map((id) => new FeatureValueResolver(id, this.$ctx));
  }
}
