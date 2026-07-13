import type { CatalogVariantLocalizedContentSnapshot } from "@shopana/broker-types";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import { ServiceType } from "./ServiceType.js";

export interface CatalogVariantLocalizedContentSnapshotInput {
  variantId: string;
  locale: string;
}

export class CatalogVariantLocalizedContentSnapshotResolver extends ServiceType<
  CatalogVariantLocalizedContentSnapshotInput,
  CatalogVariantLocalizedContentSnapshot
> {
  protected async $preload(): Promise<CatalogVariantLocalizedContentSnapshot> {
    const translations = await this.$ctx.loaders.variantTranslations.load(
      this.$props.variantId
    );
    const translation = translations.find(
      (candidate) => candidate.locale === this.$props.locale
    );
    if (!translation?.title) {
      throw new PreloadNotFoundError(
        `Variant translation ${this.$props.variantId}:${this.$props.locale} not found`
      );
    }

    return {
      locale: translation.locale,
      title: translation.title,
    };
  }

  async locale(): Promise<string> {
    return this.$get("locale");
  }

  async title(): Promise<string> {
    return this.$get("title");
  }

  async $snapshot(): Promise<CatalogVariantLocalizedContentSnapshot> {
    return this.$data;
  }
}
