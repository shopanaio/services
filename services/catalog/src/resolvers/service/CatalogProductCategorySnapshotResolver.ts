import type {
  CatalogCategoryLocalizedContentSnapshot,
  CatalogProductCategorySnapshot,
} from "@shopana/broker-types";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import { CatalogCategoryLocalizedContentSnapshotResolver } from "./CatalogCategoryLocalizedContentSnapshotResolver.js";
import { ServiceType } from "./ServiceType.js";

export class CatalogProductCategorySnapshotResolver extends ServiceType<
  string,
  { id: string }
> {
  protected async $preload(): Promise<{ id: string }> {
    const category = await this.$ctx.loaders.category.load(this.$props);
    if (!category) {
      throw new PreloadNotFoundError(
        `Category with ID ${this.$props} not found`
      );
    }
    return { id: category.id };
  }

  async id(): Promise<string> {
    return this.$get("id");
  }

  async content(): Promise<CatalogCategoryLocalizedContentSnapshotResolver[]> {
    const translations = await this.$ctx.loaders.categoryTranslations.load(
      this.$props
    );
    return [...translations]
      .sort((left, right) => left.locale.localeCompare(right.locale))
      .map(
        (translation) =>
          new CatalogCategoryLocalizedContentSnapshotResolver(
            { categoryId: this.$props, locale: translation.locale },
            this.$ctx
          )
      );
  }

  async $snapshot(): Promise<CatalogProductCategorySnapshot> {
    return {
      id: await this.id(),
      content: await this.contentSnapshots(),
    };
  }

  private async contentSnapshots(): Promise<
    CatalogCategoryLocalizedContentSnapshot[]
  > {
    const resolvers = await this.content();
    return Promise.all(resolvers.map((resolver) => resolver.$snapshot()));
  }
}
