import { SubgraphReference } from "@shopana/type-resolver";
import type { Description } from "./interfaces/index.js";
import type { Product } from "../../repositories/models/index.js";
import type { VariantRelayInput } from "../../repositories/variant/VariantRepository.js";
import { InventoryType } from "./InventoryType.js";
import { FeatureResolver } from "./FeatureResolver.js";
import { OptionResolver } from "./OptionResolver.js";
import { VariantConnectionResolver } from "./VariantConnectionResolver.js";

/**
 * Product resolver - resolves Product domain interface.
 * Decorated with @SubgraphReference for federation support.
 */
@SubgraphReference()
export class ProductResolver extends InventoryType<string, Product | null> {
  async $preload() {
    return this.ctx.loaders.product.load(this.value);
  }

  id() {
    return this.value;
  }

  async handle() {
    return this.$get("handle");
  }

  async publishedAt() {
    return this.$get("publishedAt");
  }

  async isPublished() {
    const publishedAt = await this.$get("publishedAt");
    if (!publishedAt) return false;
    return publishedAt <= new Date();
  }

  async createdAt() {
    return this.$get("createdAt");
  }

  async updatedAt() {
    return this.$get("updatedAt");
  }

  async deletedAt() {
    return this.$get("deletedAt");
  }

  async title() {
    const translation = await this.ctx.loaders.productTranslation.load(
      this.value
    );
    return translation?.title ?? "";
  }

  async description(): Promise<Description | null> {
    const translation = await this.ctx.loaders.productTranslation.load(
      this.value
    );
    if (!translation) return null;

    return {
      text: translation.descriptionText ?? "",
      html: translation.descriptionHtml ?? "",
      json: translation.descriptionJson,
    };
  }

  async excerpt() {
    const translation = await this.ctx.loaders.productTranslation.load(
      this.value
    );
    return translation?.excerpt ?? null;
  }

  async seoTitle() {
    const translation = await this.ctx.loaders.productTranslation.load(
      this.value
    );
    return translation?.seoTitle ?? null;
  }

  async seoDescription() {
    const translation = await this.ctx.loaders.productTranslation.load(
      this.value
    );
    return translation?.seoDescription ?? null;
  }

  /**
   * Returns variant connection for this product
   * @param args - Pagination arguments (first, last, after, before)
   */
  variants(args: VariantRelayInput) {
    return new VariantConnectionResolver(
      {
        ...args,
        productId: this.value,
      },
      this.ctx
    );
  }

  /**
   * Returns options for this product
   */
  async options() {
    const ids = await this.ctx.loaders.productOptionIds.load(this.value);
    return ids.map((id) => new OptionResolver(id, this.ctx));
  }

  /**
   * Returns features for this product
   */
  async features() {
    const ids = await this.ctx.loaders.productFeatureIds.load(this.value);
    return ids.map((id) => new FeatureResolver(id, this.ctx));
  }

  /**
   * Returns the count of variants for this product
   */
  async variantsCount(): Promise<number> {
    const variantIds = await this.ctx.loaders.variantIds.load(this.value);
    return variantIds.length;
  }
}
