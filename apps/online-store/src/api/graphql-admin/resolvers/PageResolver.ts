import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import type { PageRecord } from "../../../content/repositories/index.js";
import { OnlineStoreType } from "./OnlineStoreType.js";

export class PageResolver extends OnlineStoreType<string, PageRecord> {
  readonly __typename = "OnlineStorePage";

  async $preload() {
    const page = await this.$ctx.loaders.page.load(this.$props);
    if (!page) {
      throw new PreloadNotFoundError(
        `Online Store page with ID ${this.$props} not found`,
      );
    }
    return page;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.OnlineStorePage);
  }

  async handle() {
    return this.$get("handle");
  }

  async title() {
    const translation = await this.$ctx.loaders.pageTranslation.load(
      this.$props,
    );
    return translation?.title ?? "";
  }

  async body() {
    const translation = await this.$ctx.loaders.pageTranslation.load(
      this.$props,
    );
    if (!translation) return null;
    if (
      translation.bodyText === null &&
      translation.bodyHtml === null &&
      translation.bodyJson === null
    ) {
      return null;
    }
    return {
      text: translation.bodyText ?? "",
      html: translation.bodyHtml ?? "",
      json: translation.bodyJson ?? {},
    };
  }

  async seo() {
    const translation = await this.$ctx.loaders.pageTranslation.load(
      this.$props,
    );
    if (!translation) return null;
    if (
      translation.seoTitle === null &&
      translation.seoDescription === null &&
      translation.ogTitle === null &&
      translation.ogDescription === null &&
      translation.ogImageId === null
    ) {
      return null;
    }
    return {
      seoTitle: translation.seoTitle,
      seoDescription: translation.seoDescription,
      ogTitle: translation.ogTitle,
      ogDescription: translation.ogDescription,
      ogImage: translation.ogImageId
        ? {
            __typename: "File" as const,
            id: this.encodeId(translation.ogImageId, GlobalIdEntity.File),
          }
        : null,
    };
  }

  async templateSuffix() {
    return this.$get("templateSuffix");
  }

  async publishedAt() {
    return this.$get("publishedAt");
  }

  async isPublished() {
    const [publishedAt, deletedAt] = await Promise.all([
      this.$get("publishedAt"),
      this.$get("deletedAt"),
    ]);
    if (deletedAt || !publishedAt) return false;
    return new Date(publishedAt) <= new Date();
  }

  async revision() {
    return this.$get("revision");
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
}
