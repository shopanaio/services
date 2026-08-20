import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError, SubgraphReference } from "@shopana/type-resolver";
import type { Collection } from "../../repositories/models/index.js";
import { toRichTextValue } from "../shared/richText.js";
import { CatalogType } from "./CatalogType.js";
import { emptySeo } from "./SeoResolver.js";
import { mediaReference } from "./MediaConnectionResolver.js";

@SubgraphReference()
export class CollectionResolver extends CatalogType<string, Collection> {
  async $preload() {
    const collection = await this.$ctx.kernel.repository.collection.findVisibleById(this.$props);
    if (!collection) {
      throw new PreloadNotFoundError("Collection not found");
    }
    return collection;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.Collection);
  }

  handle() {
    return this.$get("handle");
  }

  listingRevision() {
    return this.$get("listingRevision");
  }

  async type() {
    return (await this.$get("type")).toUpperCase();
  }

  async name() {
    const translation = await this.$ctx.loaders.collectionTranslation.load(this.$props);
    return translation?.name ?? "";
  }

  async description() {
    const translation = await this.$ctx.loaders.collectionTranslation.load(this.$props);
    return toRichTextValue(
      translation && {
        text: translation.descriptionText,
        html: translation.descriptionHtml,
        json: translation.descriptionJson,
      },
    );
  }

  async excerpt() {
    const translation = await this.$ctx.loaders.collectionTranslation.load(this.$props);
    return toRichTextValue(
      translation && {
        text: translation.excerptText,
        html: translation.excerptHtml,
        json: translation.excerptJson,
      },
    );
  }

  async seo() {
    const value = await this.$ctx.loaders.collectionSeo.load(this.$props);
    return this.resolvers.seo(value ?? emptySeo());
  }

  media(args: {
    first?: number | null;
    after?: string | null;
    last?: number | null;
    before?: string | null;
  }) {
    return this.resolvers.mediaConnection({
      ...args,
      ownerId: this.$props,
      ownerType: "collection",
    });
  }

  async featuredMedia() {
    const rows = await this.$ctx.loaders.collectionMedia.load(this.$props);
    return rows[0] ? mediaReference(rows[0].fileId) : null;
  }

  async defaultSort() {
    return (await this.$get("defaultSort")).toUpperCase();
  }

  async defaultSortDirection() {
    return (await this.$get("defaultSortDirection")).toUpperCase();
  }

  activeFrom() {
    return this.$get("effectiveFrom");
  }

  activeTo() {
    return this.$get("effectiveTo");
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
