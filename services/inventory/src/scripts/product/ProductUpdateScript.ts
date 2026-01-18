import { BaseScript } from "../../kernel/BaseScript.js";
import type { ProductUpdateParams, ProductUpdateResult } from "./dto/index.js";

export class ProductUpdateScript extends BaseScript<ProductUpdateParams, ProductUpdateResult> {
  protected async execute(params: ProductUpdateParams): Promise<ProductUpdateResult> {
    const { id, handle, title, description, excerpt, seo } = params;

    // 1. Check if product exists
    const existingProduct = await this.repository.product.findById(id);
    if (!existingProduct) {
      return {
        product: undefined,
        userErrors: [{ message: "Product not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    const locale = this.getLocale();
    const projectId = this.getProjectId();

    // 2. Update translation if any translation fields provided
    const hasTranslationUpdate =
      title !== undefined ||
      description !== undefined ||
      excerpt !== undefined;

    if (hasTranslationUpdate) {
      const existingTranslation = await this.repository.translation.getProductTranslation(id, locale);

      await this.repository.translation.upsertProductTranslation({
        projectId,
        productId: id,
        locale,
        title: title ?? existingTranslation?.title ?? "",
        descriptionText: description?.text ?? existingTranslation?.descriptionText ?? null,
        descriptionHtml: description?.html ?? existingTranslation?.descriptionHtml ?? null,
        descriptionJson: description?.json ?? existingTranslation?.descriptionJson ?? null,
        excerpt: excerpt ?? existingTranslation?.excerpt ?? null,
      });
    }

    // 3. Update SEO if provided
    if (seo !== undefined) {
      const existingSeo = await this.repository.translation.getProductSeo(id, locale);

      await this.repository.translation.upsertProductSeo({
        projectId,
        productId: id,
        locale,
        seoTitle: seo.seoTitle ?? existingSeo?.seoTitle ?? null,
        seoDescription: seo.seoDescription ?? existingSeo?.seoDescription ?? null,
        ogTitle: seo.ogTitle ?? existingSeo?.ogTitle ?? null,
        ogDescription: seo.ogDescription ?? existingSeo?.ogDescription ?? null,
        ogImageId: seo.ogImageId ?? existingSeo?.ogImageId ?? null,
      });
    }

    // 4. Update product handle or touch to update updatedAt
    if (handle !== undefined) {
      await this.repository.product.update(id, { handle });
    } else {
      await this.repository.product.touch(id);
    }

    // 5. Fetch updated product
    const product = await this.repository.product.findById(id);

    this.logger.info({ productId: id }, "Product updated");

    return { product: product ?? undefined, userErrors: [] };
  }

  protected handleError(_error: unknown): ProductUpdateResult {
    return {
      product: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
