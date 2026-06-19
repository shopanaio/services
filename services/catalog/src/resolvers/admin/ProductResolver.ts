import { SubgraphReference } from "@shopana/type-resolver";
import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import type { Description } from "./interfaces/index.js";
import type { Product } from "../../repositories/models/index.js";
import type { VariantRelayInput } from "../../repositories/variant/VariantRepository.js";
import { CatalogType } from "./CatalogType.js";
import { CategoryResolver } from "./CategoryResolver.js";
import { FeatureResolver } from "./FeatureResolver.js";
import { OptionResolver } from "./OptionResolver.js";
import { ProductSeoResolver } from "./ProductSeoResolver.js";
import { TagResolver } from "./TagResolver.js";
import { VariantConnectionResolver } from "./VariantConnectionResolver.js";

/**
 * Product resolver - resolves Product domain interface.
 * Decorated with @SubgraphReference for federation support.
 */
@SubgraphReference()
export class ProductResolver extends CatalogType<string, Product> {
  async $preload() {
    const product = await this.$ctx.loaders.product.load(this.$props);
    if (!product) {
      throw new Error(`Product with ID ${this.$props} not found`);
    }
    return product;
  }

  id() {
    return encodeGlobalIdByType(this.$props, GlobalIdEntity.Product);
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
    return new Date(publishedAt) <= new Date();
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

  async revision() {
    return this.$get("revision");
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
      json: translation.descriptionJson ?? {},
    };
  }

  async excerpt(): Promise<Description> {
    // TODO: Store excerpt text/html/json separately and resolve it from product translations.
    return {
      text: "",
      html: "",
      json: {},
    };
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

  /**
   * Returns categories for this product
   */
  async categories(): Promise<CategoryResolver[]> {
    const ids = await this.$ctx.loaders.productCategoryIds.load(this.$props);
    return ids.map((id) => new CategoryResolver(id, this.$ctx));
  }

  /**
   * Returns tags for this product
   */
  async tags(): Promise<TagResolver[]> {
    const ids = await this.$ctx.loaders.productTagIds.load(this.$props);
    return ids.map((id) => new TagResolver(id, this.$ctx));
  }
}
