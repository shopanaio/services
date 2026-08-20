import type { CatalogRichTextSnapshot } from "@shopana/broker-types";
import { toRichTextValue, type RichTextLike } from "../shared/richText.js";
import { ServiceType } from "./ServiceType.js";

export type CatalogRichTextSnapshotInput = {
  productId: string;
  locale: string;
  field: "excerpt" | "description";
};

export type CatalogRichTextSnapshotLike = RichTextLike;

export function toCatalogRichTextSnapshot(
  value: CatalogRichTextSnapshotLike | null | undefined,
): CatalogRichTextSnapshot | null {
  return toRichTextValue(value);
}

export class CatalogRichTextSnapshotResolver extends ServiceType<
  CatalogRichTextSnapshotInput,
  CatalogRichTextSnapshot
> {
  protected async $preload(): Promise<CatalogRichTextSnapshot> {
    const translations = await this.$ctx.loaders.productTranslations.load(this.$props.productId);
    const translation = translations.find((item) => item.locale === this.$props.locale);
    const prefix = this.$props.field === "excerpt" ? "excerpt" : "description";
    const text = translation?.[`${prefix}Text`];
    const html = translation?.[`${prefix}Html`];
    const json = translation?.[`${prefix}Json`];
    return (
      toCatalogRichTextSnapshot({ text, html, json }) ?? {
        text: "",
        html: "",
        json: {},
      }
    );
  }

  async text(): Promise<string> {
    return this.$get("text");
  }

  async html(): Promise<string> {
    return this.$get("html");
  }

  async json(): Promise<unknown> {
    return this.$get("json");
  }

  async $snapshot() {
    return this.$data;
  }
}
