import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { CatalogType } from "./CatalogType.js";
import type { Collection } from "../../repositories/models/index.js";
import { SeoResolver } from "./SeoResolver.js";

export class CollectionResolver extends CatalogType<string, Collection> {
  async $preload() {
    const collection = await this.$ctx.loaders.collection.load(this.$props);
    if (!collection) {
      throw new Error(`Collection with ID ${this.$props} not found`);
    }
    return collection;
  }

  id() {
    return encodeGlobalIdByType(this.$props, GlobalIdEntity.Collection);
  }

  async handle() {
    return this.$get("handle");
  }

  async type() {
    return ((await this.$get("type")) ?? "manual").toUpperCase();
  }

  async name() {
    const translation = await this.$ctx.loaders.collectionTranslation.load(this.$props);
    return translation?.name ?? "";
  }

  async description() {
    const translation = await this.$ctx.loaders.collectionTranslation.load(this.$props);
    if (!translation) return null;
    return {
      text: translation.descriptionText ?? "",
      html: translation.descriptionHtml ?? "",
      json: translation.descriptionJson ?? {},
    };
  }

  async media() {
    const rows = await this.$ctx.loaders.collectionMedia.load(this.$props);
    return rows.map((row) => ({
      file: { __typename: "File" as const, id: row.fileId },
      sortIndex: row.sortIndex,
    }));
  }

  async seo() {
    const seo = await this.$ctx.loaders.collectionSeo.load(this.$props);
    if (!seo) return null;
    return new SeoResolver(seo, this.$ctx);
  }

  async defaultSort() {
    return ((await this.$get("defaultSort")) ?? "newest").toUpperCase();
  }

  async defaultSortDirection() {
    return (await this.$get("defaultSortDirection")) ?? "asc";
  }

  async activeFrom() {
    return this.$get("effectiveFrom");
  }

  async activeTo() {
    return this.$get("effectiveTo");
  }

  async isActive() {
    const now = new Date();
    const from = await this.$get("effectiveFrom");
    const to = await this.$get("effectiveTo");
    if (from && new Date(from) > now) return false;
    if (to && new Date(to) <= now) return false;
    return true;
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

  async rules() {
    const rows = await this.$ctx.kernel.repository.collectionRule.findByCollectionId(
      this.$props
    );
    return rows.map((row) => ({
      id: row.id,
      field: row.field,
      operator: row.operator,
      value: row.value,
      sortIndex: row.sortIndex,
    }));
  }

  // TODO: Implement products() with keyset pagination

  // TODO: Implement productsCount() with COUNT(*)
}
