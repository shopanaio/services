import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError, SubgraphReference } from "@shopana/type-resolver";
import type { Category } from "../../repositories/models/index.js";
import { toRichTextValue } from "../shared/richText.js";
import { CatalogType } from "./CatalogType.js";
import type { CategoryChildrenArgs, CategoryMediaArgs } from "./generated/types.js";
import { isPublishedAt } from "./helpers.js";
import { mediaReference } from "./MediaConnectionResolver.js";
import { emptySeo } from "./SeoResolver.js";

@SubgraphReference()
export class CategoryResolver extends CatalogType<string, Category> {
  async $preload() {
    const value = await this.$ctx.loaders.category.load(this.$props);
    if (!value || !isPublishedAt(value.publishedAt)) {
      throw new PreloadNotFoundError("Published category not found");
    }
    return value;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.Category);
  }

  handle() {
    return this.$get("handle");
  }

  async name() {
    const translation = await this.$ctx.loaders.categoryTranslation.load(this.$props);
    return translation?.name ?? "";
  }

  async description() {
    const translation = await this.$ctx.loaders.categoryTranslation.load(this.$props);
    return toRichTextValue(
      translation && {
        text: translation.descriptionText,
        html: translation.descriptionHtml,
        json: translation.descriptionJson,
      },
    );
  }

  async excerpt() {
    const translation = await this.$ctx.loaders.categoryTranslation.load(this.$props);
    return toRichTextValue(
      translation && {
        text: translation.excerptText,
        html: translation.excerptHtml,
        json: translation.excerptJson,
      },
    );
  }

  async seo() {
    const value = await this.$ctx.loaders.categorySeo.load(this.$props);
    return this.resolvers.seo(value ?? emptySeo());
  }

  async parent() {
    const parentId = await this.$get("parentId");
    if (!parentId) return null;
    const parent = await this.$ctx.loaders.category.load(parentId);
    return parent && isPublishedAt(parent.publishedAt) ? this.resolvers.category(parentId) : null;
  }

  async ancestors() {
    const ids = await this.$ctx.loaders.categoryAncestorIds.load(this.$props);
    const values = await this.$ctx.loaders.category.loadMany(ids);
    return Promise.all(
      ids.flatMap((id, index) => {
        const value = values[index];
        return value instanceof Error || !isPublishedAt(value?.publishedAt)
          ? []
          : [this.resolvers.category(id)];
      }),
    );
  }

  children(args: CategoryChildrenArgs) {
    return this.resolvers.categoryConnection({
      ...args,
      parentId: this.$props,
    });
  }

  media(args: CategoryMediaArgs) {
    return this.resolvers.mediaConnection({
      ...args,
      ownerId: this.$props,
      ownerType: "category",
    });
  }

  async featuredMedia() {
    const rows = await this.$ctx.loaders.categoryMedia.load(this.$props);
    return rows[0] ? mediaReference(rows[0].fileId) : null;
  }

  publishedAt() {
    return this.$get("publishedAt");
  }

  createdAt() {
    return this.$get("createdAt");
  }

  updatedAt() {
    return this.$get("updatedAt");
  }
}
