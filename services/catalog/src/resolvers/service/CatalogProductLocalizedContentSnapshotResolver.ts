import type { CatalogProductLocalizedContentSnapshot } from "@shopana/broker-types";
import type { CatalogRichTextSnapshotResolver } from "./CatalogRichTextSnapshotResolver.js";
import { toRichTextValue } from "../shared/richText.js";
import { ServiceType } from "./ServiceType.js";

export type CatalogProductLocalizedContentSnapshotInput = {
  productId: string;
  locale: string;
};

export type CatalogProductLocalizedContentSnapshotData = CatalogProductLocalizedContentSnapshot & {
  locale: string;
};

export class CatalogProductLocalizedContentSnapshotResolver extends ServiceType<
  CatalogProductLocalizedContentSnapshotInput,
  CatalogProductLocalizedContentSnapshotData
> {
  protected async $preload(): Promise<CatalogProductLocalizedContentSnapshotData> {
    const translations = await this.$ctx.loaders.productTranslations.load(this.$props.productId);
    const translation = translations.find((item) => item.locale === this.$props.locale);

    return {
      locale: this.$props.locale,
      title: translation?.name ?? "",
      excerpt: await this.createRichTextSnapshot("excerpt"),
      description: await this.createRichTextSnapshot("description"),
    };
  }

  async locale(): Promise<string> {
    return this.$get("locale");
  }

  async title(): Promise<string> {
    return this.$get("title");
  }

  async excerpt(): Promise<CatalogRichTextSnapshotResolver | null> {
    return (await this.$get("excerpt"))
      ? this.resolvers.catalogRichTextSnapshot({
          productId: this.$props.productId,
          locale: this.$props.locale,
          field: "excerpt",
        })
      : null;
  }

  async description(): Promise<CatalogRichTextSnapshotResolver | null> {
    return (await this.$get("description"))
      ? this.resolvers.catalogRichTextSnapshot({
          productId: this.$props.productId,
          locale: this.$props.locale,
          field: "description",
        })
      : null;
  }

  async $snapshot() {
    return this.$data;
  }

  private async createRichTextSnapshot(
    field: "excerpt" | "description",
  ): Promise<Awaited<ReturnType<CatalogRichTextSnapshotResolver["$snapshot"]>> | null> {
    const translations = await this.$ctx.loaders.productTranslations.load(this.$props.productId);
    const translation = translations.find((item) => item.locale === this.$props.locale);
    const prefix = field === "excerpt" ? "excerpt" : "description";

    return toRichTextValue({
      text: translation?.[`${prefix}Text`],
      html: translation?.[`${prefix}Html`],
      json: translation?.[`${prefix}Json`],
    });
  }
}
