import { SubgraphReference } from "@shopana/type-resolver";
import type { Description } from "./interfaces/index.js";
import type { Product } from "../../repositories/models/index.js";
import type { VariantRelayInput } from "../../repositories/variant/VariantRepository.js";
import { InventoryType } from "./InventoryType.js";
import { FeatureResolver } from "./FeatureResolver.js";
import { OptionResolver } from "./OptionResolver.js";
import { ProductSeoResolver } from "./ProductSeoResolver.js";
import { VariantConnectionResolver } from "./VariantConnectionResolver.js";

/**
 * Product resolver - resolves Product domain interface.
 * Decorated with @SubgraphReference for federation support.
 */
@SubgraphReference()
export class ProductResolver extends InventoryType<string, Product | null> {
  async $preload() {
    return this.$ctx.loaders.product.load(this.$props);
  }

  id() {
    return this.$props;
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
    const translation = await this.$ctx.loaders.productTranslation.load(
      this.$props
    );
    return translation?.title ?? "";
  }

  async description(): Promise<Description | null> {
    const translation = await this.$ctx.loaders.productTranslation.load(
      this.$props
    );
    if (!translation) return null;

    return {
      text: translation.descriptionText ?? "",
      html: translation.descriptionHtml ?? "",
      json: translation.descriptionJson,
    };
  }

  async excerpt() {
    const translation = await this.$ctx.loaders.productTranslation.load(
      this.$props
    );
    return translation?.excerpt ?? null;
  }

  /**
   * Returns SEO and Open Graph metadata for this product
   */
  async seo() {
    const seoData = await this.$ctx.loaders.productSeo.load(this.$props);
    if (!seoData) return null;
    return new ProductSeoResolver(seoData, this.$ctx);
  }

  /**
   * Returns variant connection for this product
   * @param args - Pagination arguments (first, last, after, before)
   */
  variants(args: VariantRelayInput) {
    return new VariantConnectionResolver(
      {
        ...args,
        productId: this.$props,
      },
      this.$ctx
    );
  }

  /**
   * Returns options for this product
   */
  async options() {
    const ids = await this.$ctx.loaders.productOptionIds.load(this.$props);
    return ids.map((id) => new OptionResolver(id, this.$ctx));
  }

  /**
   * Returns features for this product
   */
  async features() {
    const ids = await this.$ctx.loaders.productFeatureIds.load(this.$props);
    return ids.map((id) => new FeatureResolver(id, this.$ctx));
  }

  /**
   * Returns root-level features for this product
   */
  async rootFeatures() {
    const ids = await this.$ctx.loaders.productRootFeatureIds.load(this.$props);
    return ids.map((id) => new FeatureResolver(id, this.$ctx));
  }

  /**
   * Returns the count of variants for this product
   */
  async variantsCount(): Promise<number> {
    const variantIds = await this.$ctx.loaders.variantIds.load(this.$props);
    return variantIds.length;
  }
}
