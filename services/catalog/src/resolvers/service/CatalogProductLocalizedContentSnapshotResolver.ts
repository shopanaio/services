import type { CatalogProductLocalizedContentSnapshot } from "@shopana/broker-types";
import {
  CatalogRichTextSnapshotResolver,
  toCatalogRichTextSnapshot,
} from "./CatalogRichTextSnapshotResolver.js";
import { ServiceType } from "./ServiceType.js";

export type CatalogProductLocalizedContentSnapshotInput = {
  productId: string;
  locale: string;
};

export type CatalogProductLocalizedContentSnapshotData =
  CatalogProductLocalizedContentSnapshot & {
    locale: string;
  };

export class CatalogProductLocalizedContentSnapshotResolver extends ServiceType<
  CatalogProductLocalizedContentSnapshotInput,
  CatalogProductLocalizedContentSnapshotData
> {
  protected async $preload(): Promise<CatalogProductLocalizedContentSnapshotData> {
    const translations = await this.$ctx.loaders.productTranslations.load(
      this.$props.productId
    );
    const translation = translations.find(
      (item) => item.locale === this.$props.locale
    );

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
      ? new CatalogRichTextSnapshotResolver(
          {
            productId: this.$props.productId,
            locale: this.$props.locale,
            field: "excerpt",
          },
          this.$ctx
        )
      : null;
  }

  async description(): Promise<CatalogRichTextSnapshotResolver | null> {
    return (await this.$get("description"))
      ? new CatalogRichTextSnapshotResolver(
          {
            productId: this.$props.productId,
            locale: this.$props.locale,
            field: "description",
          },
          this.$ctx
        )
      : null;
  }

  async $snapshot() {
    return this.$data;
  }

  private async createRichTextSnapshot(
    field: "excerpt" | "description"
  ): Promise<Awaited<ReturnType<CatalogRichTextSnapshotResolver["$snapshot"]>> | null> {
    const translations = await this.$ctx.loaders.productTranslations.load(
      this.$props.productId
    );
    const translation = translations.find(
      (item) => item.locale === this.$props.locale
    );
    const prefix = field === "excerpt" ? "excerpt" : "description";

    return toCatalogRichTextSnapshot({
      text: translation?.[`${prefix}Text`],
      html: translation?.[`${prefix}Html`],
      json: translation?.[`${prefix}Json`],
    });
  }
}
