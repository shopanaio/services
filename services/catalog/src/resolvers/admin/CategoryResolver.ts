import { SubgraphReference } from "@shopana/type-resolver";
import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import type { RichText } from "./interfaces/index.js";
import type { Category } from "../../repositories/models/index.js";
import { CatalogType } from "./CatalogType.js";
import { SeoResolver } from "./SeoResolver.js";
import { toRichText } from "./helpers/richText.js";
import {
  CategoryProductConnectionResolver,
  type CategoryProductConnectionInput,
} from "./CategoryProductConnectionResolver.js";

/**
 * Category resolver - resolves Category domain interface.
 * Decorated with @SubgraphReference for federation support.
 */
@SubgraphReference()
export class CategoryResolver extends CatalogType<string, Category> {
  async $preload() {
    const category = await this.$ctx.loaders.category.load(this.$props);
    if (!category) {
      throw new Error(`Category with ID ${this.$props} not found`);
    }
    return category;
  }

  id() {
    return encodeGlobalIdByType(this.$props, GlobalIdEntity.Category);
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

  async depth() {
    return this.$get("depth");
  }

  async path() {
    return this.$get("path");
  }

  /**
   * Returns the translated name for this category
   */
  async name() {
    const translation = await this.$ctx.loaders.categoryTranslation.load(
      this.$props
    );
    return translation?.name ?? "";
  }

  async defaultSort() {
    const value = (await this.$get("defaultSort")) ?? "manual";
    return value.toUpperCase();
  }

  async defaultSortDirection() {
    const value = (await this.$get("defaultSortDirection")) ?? "asc";
    return value;
  }

  /**
   * Returns the translated description for this category
   */
  async description(): Promise<RichText | null> {
    const translation = await this.$ctx.loaders.categoryTranslation.load(
      this.$props
    );
    return toRichText(translation && {
      text: translation.descriptionText,
      html: translation.descriptionHtml,
      json: translation.descriptionJson,
    });
  }

  async excerpt(): Promise<RichText | null> {
    const translation = await this.$ctx.loaders.categoryTranslation.load(
      this.$props
    );
    return toRichText(translation && {
      text: translation.excerptText,
      html: translation.excerptHtml,
      json: translation.excerptJson,
    });
  }

  /**
   * Returns the parent category, if any
   */
  async parent(): Promise<CategoryResolver | null> {
    const parentId = await this.$get("parentId");
    if (!parentId) return null;
    return new CategoryResolver(parentId, this.$ctx);
  }

  /**
   * Returns direct child categories
   */
  async children(): Promise<CategoryResolver[]> {
    const ids = await this.$ctx.loaders.categoryChildrenIds.load(this.$props);
    return ids.map((id) => new CategoryResolver(id, this.$ctx));
  }

  /**
   * Returns all ancestor categories (from root to parent)
   */
  async ancestors(): Promise<CategoryResolver[]> {
    const ids = await this.$ctx.loaders.categoryAncestorIds.load(this.$props);
    return ids.map((id) => new CategoryResolver(id, this.$ctx));
  }

  /**
   * Returns media files associated with this category
   */
  async media() {
    const mediaItems = await this.$ctx.loaders.categoryMedia.load(this.$props);
    return mediaItems.map((m) => ({
      file: {
        __typename: "File" as const,
        id: encodeGlobalIdByType(m.fileId, GlobalIdEntity.File),
      },
      sortIndex: m.sortIndex,
    }));
  }

  async seo() {
    const seoData = await this.$ctx.loaders.categorySeo.load(this.$props);
    if (!seoData) return null;
    return new SeoResolver(seoData, this.$ctx);
  }

  /**
   * Returns the count of products in this category
   */
  async productsCount(): Promise<number> {
    return (await this.$get("productsCount")) ?? 0;
  }

  /**
   * Returns paginated products in this category
   */
  products(args: Omit<CategoryProductConnectionInput, "categoryId">) {
    return new CategoryProductConnectionResolver(
      { categoryId: this.$props, ...args },
      this.$ctx
    );
  }
}
