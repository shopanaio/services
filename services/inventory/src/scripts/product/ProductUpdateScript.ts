import { BaseScript } from "../../kernel/BaseScript.js";
import type { ProductUpdateParams, ProductUpdateResult } from "./dto/index.js";

export class ProductUpdateScript extends BaseScript<ProductUpdateParams, ProductUpdateResult> {
  protected async execute(params: ProductUpdateParams): Promise<ProductUpdateResult> {
    const { id, title, description, excerpt, seoTitle, seoDescription } = params;

    // 1. Check if product exists
    const existingProduct = await this.repository.product.findById(id);
    if (!existingProduct) {
      return {
        product: undefined,
        userErrors: [{ message: "Product not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    // 2. Update translation if any translation fields provided
    const hasTranslationUpdate =
      title !== undefined ||
      description !== undefined ||
      excerpt !== undefined ||
      seoTitle !== undefined ||
      seoDescription !== undefined;

    if (hasTranslationUpdate) {
      const locale = this.getLocale();
      const existingTranslation = await this.repository.translation.getProductTranslation(id, locale);

      await this.repository.translation.upsertProductTranslation({
        projectId: this.getProjectId(),
        productId: id,
        locale,
        title: title ?? existingTranslation?.title ?? "",
        descriptionText: description?.text ?? existingTranslation?.descriptionText ?? null,
        descriptionHtml: description?.html ?? existingTranslation?.descriptionHtml ?? null,
        descriptionJson: description?.json ?? existingTranslation?.descriptionJson ?? null,
        excerpt: excerpt ?? existingTranslation?.excerpt ?? null,
        seoTitle: seoTitle ?? existingTranslation?.seoTitle ?? null,
        seoDescription: seoDescription ?? existingTranslation?.seoDescription ?? null,
      });
    }

    // 3. Touch product to update updatedAt
    await this.repository.product.touch(id);

    // 4. Fetch updated product
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
