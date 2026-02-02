import { SubgraphReference } from "@shopana/type-resolver";
import type { Description } from "./interfaces/index.js";
import type { Category } from "../../repositories/models/index.js";
import { CatalogType } from "./CatalogType.js";
import { ProductResolver } from "./ProductResolver.js";

interface ProductsArgs {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

/**
 * Category resolver - resolves Category domain interface.
 * Decorated with @SubgraphReference for federation support.
 */
@SubgraphReference()
export class CategoryResolver extends CatalogType<string, Category | null> {
  async $preload() {
    return this.$ctx.loaders.category.load(this.$props);
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

  /**
   * Returns the translated description for this category
   */
  async description(): Promise<Description | null> {
    const translation = await this.$ctx.loaders.categoryTranslation.load(
      this.$props
    );
    if (!translation) return null;

    return {
      text: translation.descriptionText ?? "",
      html: translation.descriptionHtml ?? "",
      json: translation.descriptionJson ?? {},
    };
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
      file: { __typename: "File" as const, id: m.fileId },
      sortIndex: m.sortIndex,
    }));
  }

  /**
   * Returns the count of products in this category
   */
  async productsCount(): Promise<number> {
    return this.$ctx.loaders.categoryProductsCount.load(this.$props);
  }

  /**
   * Returns products in this category with pagination
   */
  async products(args: ProductsArgs) {
    const first = args.first ?? 20;
    const productIds = await this.$ctx.kernel
      .getServices()
      .repository.category.getProductIdsByCategoryId(this.$props, { first: first + 1 });

    const hasNextPage = productIds.length > first;
    const resultIds = hasNextPage ? productIds.slice(0, first) : productIds;

    const edges = resultIds.map((id) => ({
      cursor: Buffer.from(id).toString("base64"),
      node: new ProductResolver(id, this.$ctx),
    }));

    return {
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: false,
        startCursor: edges[0]?.cursor ?? null,
        endCursor: edges[edges.length - 1]?.cursor ?? null,
      },
      totalCount: await this.productsCount(),
    };
  }
}
