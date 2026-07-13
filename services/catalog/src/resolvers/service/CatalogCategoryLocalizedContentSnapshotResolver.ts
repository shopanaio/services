import type { CatalogCategoryLocalizedContentSnapshot } from "@shopana/broker-types";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import { ServiceType } from "./ServiceType.js";

export interface CatalogCategoryLocalizedContentSnapshotInput {
  categoryId: string;
  locale: string;
}

export class CatalogCategoryLocalizedContentSnapshotResolver extends ServiceType<
  CatalogCategoryLocalizedContentSnapshotInput,
  CatalogCategoryLocalizedContentSnapshot
> {
  protected async $preload(): Promise<CatalogCategoryLocalizedContentSnapshot> {
    const translations = await this.$ctx.loaders.categoryTranslations.load(
      this.$props.categoryId
    );
    const translation = translations.find(
      (candidate) => candidate.locale === this.$props.locale
    );
    if (!translation) {
      throw new PreloadNotFoundError(
        `Category translation ${this.$props.categoryId}:${this.$props.locale} not found`
      );
    }

    return {
      locale: translation.locale,
      name: translation.name,
    };
  }

  async locale(): Promise<string> {
    return this.$get("locale");
  }

  async name(): Promise<string> {
    return this.$get("name");
  }

  async $snapshot(): Promise<CatalogCategoryLocalizedContentSnapshot> {
    return this.$data;
  }
}
