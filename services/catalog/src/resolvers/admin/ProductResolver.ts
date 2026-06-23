import { SubgraphReference } from "@shopana/type-resolver";
import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import type { ProductMediaItem, RichText } from "./interfaces/index.js";
import type { Product } from "../../repositories/models/index.js";
import type { VariantRelayInput } from "../../repositories/variant/VariantRepository.js";
import { CatalogType } from "./CatalogType.js";
import { CategoryResolver } from "./CategoryResolver.js";
import { FeatureResolver } from "./FeatureResolver.js";
import { OptionResolver } from "./OptionResolver.js";
import { ProductSeoResolver } from "./ProductSeoResolver.js";
import { TagResolver } from "./TagResolver.js";
import { VendorResolver } from "./VendorResolver.js";
import { VariantConnectionResolver } from "./VariantConnectionResolver.js";
import { toRichText } from "./helpers/richText.js";

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

  async vendor(): Promise<VendorResolver | null> {
    const vendorId = await this.$get("vendorId");
    return vendorId ? new VendorResolver(vendorId, this.$ctx) : null;
  }

  async title() {
    const translation = await this.$ctx.loaders.productTranslation.load(
      this.$props
    );
    return translation?.title ?? "";
  }

  async description(): Promise<RichText | null> {
    const translation = await this.$ctx.loaders.productTranslation.load(
      this.$props
    );
    return toRichText(translation && {
      text: translation.descriptionText,
      html: translation.descriptionHtml,
      json: translation.descriptionJson,
    });
  }

  async excerpt(): Promise<RichText | null> {
    const translation = await this.$ctx.loaders.productTranslation.load(
      this.$props
    );
    return toRichText(translation && {
      text: translation.excerptText,
      html: translation.excerptHtml,
      json: translation.excerptJson,
    });
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

  async media(): Promise<ProductMediaItem[]> {
    const mediaItems = await this.$ctx.loaders.productMedia.load(this.$props);
    return mediaItems.map((media) => ({
      file: {
        __typename: "File" as const,
        id: encodeGlobalIdByType(media.fileId, GlobalIdEntity.File),
      },
      sortIndex: media.sortIndex,
    }));
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

  async primaryCategory(): Promise<CategoryResolver | null> {
    const links = await this.$ctx.loaders.productCategoryLinksByProductId.load(
      this.$props
    );
    const primary = links.find((link) => link.isPrimary);
    return primary ? new CategoryResolver(primary.categoryId, this.$ctx) : null;
  }

  async categoryAssignments() {
    const links = await this.$ctx.loaders.productCategoryLinksByProductId.load(
      this.$props
    );

    return [...links]
      .sort((a, b) => {
        if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
        const rank = a.lexoRank.localeCompare(b.lexoRank);
        if (rank !== 0) return rank;
        return a.categoryId.localeCompare(b.categoryId);
      })
      .map((link) => ({
        category: new CategoryResolver(link.categoryId, this.$ctx),
        isPrimary: link.isPrimary,
      }));
  }

  /**
   * Returns tags for this product
   */
  async tags(): Promise<TagResolver[]> {
    const ids = await this.$ctx.loaders.productTagIds.load(this.$props);
    return ids.map((id) => new TagResolver(id, this.$ctx));
  }
}
