import type {
  CatalogCategoryLocalizedContentSnapshot,
  CatalogProductCategorySnapshot,
} from "@shopana/broker-types";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import { CatalogCategoryLocalizedContentSnapshotResolver } from "./CatalogCategoryLocalizedContentSnapshotResolver.js";
import { ServiceType } from "./ServiceType.js";

export type CatalogProductCategorySnapshotInput =
  | string
  | {
      categoryId: string;
      primary: boolean;
      manualRank: string;
    };

export class CatalogProductCategorySnapshotResolver extends ServiceType<
  CatalogProductCategorySnapshotInput,
  { id: string; primary: boolean; manualRank: string | null }
> {
  protected async $preload(): Promise<{
    id: string;
    primary: boolean;
    manualRank: string | null;
  }> {
    const categoryId = this.categoryId();
    const category = await this.$ctx.loaders.category.load(categoryId);
    if (!category) {
      throw new PreloadNotFoundError(
        `Category with ID ${categoryId} not found`
      );
    }
    return {
      id: category.id,
      primary: typeof this.$props === "string" ? false : this.$props.primary,
      manualRank:
        typeof this.$props === "string" ? null : this.$props.manualRank,
    };
  }

  async id(): Promise<string> {
    return this.$get("id");
  }

  async primary(): Promise<boolean> {
    return this.$get("primary");
  }

  async manualRank(): Promise<string | null> {
    return this.$get("manualRank");
  }

  async content(): Promise<CatalogCategoryLocalizedContentSnapshotResolver[]> {
    const translations = await this.$ctx.loaders.categoryTranslations.load(
      this.categoryId()
    );
    return [...translations]
      .sort((left, right) => left.locale.localeCompare(right.locale))
      .map(
        (translation) =>
          new CatalogCategoryLocalizedContentSnapshotResolver(
            { categoryId: this.categoryId(), locale: translation.locale },
            this.$ctx
          )
      );
  }

  async $snapshot(): Promise<CatalogProductCategorySnapshot> {
    return {
      id: await this.id(),
      primary: await this.primary(),
      manualRank: await this.manualRank(),
      content: await this.contentSnapshots(),
    };
  }

  private categoryId(): string {
    return typeof this.$props === "string"
      ? this.$props
      : this.$props.categoryId;
  }

  private async contentSnapshots(): Promise<
    CatalogCategoryLocalizedContentSnapshot[]
  > {
    const resolvers = await this.content();
    return Promise.all(resolvers.map((resolver) => resolver.$snapshot()));
  }
}
