import { BaseScript } from "../../kernel/BaseScript.js";

export interface SyncProductIndexParams {
  productId: string;
}

export interface SyncProductIndexResult {
  productId: string;
  synced: boolean;
}

export class SyncProductIndexScript extends BaseScript<
  SyncProductIndexParams,
  SyncProductIndexResult
> {
  protected async execute(
    params: SyncProductIndexParams
  ): Promise<SyncProductIndexResult> {
    const { productId } = params;

    const product = await this.repository.product.findById(productId);
    if (!product) {
      await this.repository.searchIndex.delete(productId);
      return { productId, synced: false };
    }

    const [categoryLinks, tagLinks, features] = await Promise.all([
      this.repository.category.getProductCategoriesByProductIds([productId]),
      this.repository.tag.getProductTagLinks([productId]),
      this.repository.feature.findByProductId(productId),
    ]);

    const categoryIds = categoryLinks.map((link) => link.categoryId);
    const tagIds = tagLinks.map((link) => link.tagId);
    const featureIds = features.map((feature) => feature.id);

    const [categories, tags, featureValuesByFeatureId] = await Promise.all([
      this.repository.category.getByIds(categoryIds),
      this.repository.tag.getByIds(tagIds),
      this.repository.feature.findValuesByFeatureIds(featureIds),
    ]);

    const categoryHandles = categories.map((item) => item.handle);
    const tagHandles = tags.map((item) => item.handle);

    const featureSlugs: string[] = [];
    for (const feature of features) {
      const values = featureValuesByFeatureId.get(feature.id) ?? [];
      for (const value of values) {
        featureSlugs.push(`${feature.slug}:${value.slug}`);
      }
    }

    await this.repository.searchIndex.upsert({
      productId,
      status: product.publishedAt ? "published" : "draft",
      tagHandles,
      featureSlugs,
      categoryHandles,
      createdAt: product.createdAt,
    });

    return { productId, synced: true };
  }

  protected handleError(_error: unknown): SyncProductIndexResult {
    return {
      productId: "",
      synced: false,
    };
  }
}
