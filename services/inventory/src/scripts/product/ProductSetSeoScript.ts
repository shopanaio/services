import { BaseScript } from "../../kernel/BaseScript.js";
import type { ProductSetSeoParams, ProductSetSeoResult } from "./dto/ProductSetSeoDto.js";
import type { SeoChanges } from "../types/index.js";
import { singleError } from "../types/index.js";

/**
 * ProductSetSeoScript handles product SEO metadata: title and description.
 */
export class ProductSetSeoScript extends BaseScript<ProductSetSeoParams, ProductSetSeoResult> {
  protected async execute(params: ProductSetSeoParams): Promise<ProductSetSeoResult> {
    const { id, title, description } = params;

    // 1. Check if product exists
    const existingProduct = await this.repository.product.findById(id);
    if (!existingProduct) {
      return singleError("Product not found", "NOT_FOUND", ["id"]);
    }

    const locale = this.getLocale();
    const projectId = this.getProjectId();

    // 2. Get existing SEO
    const existingSeo = await this.repository.translation.getProductSeo(id, locale);

    // Track what actually changed
    const changes: SeoChanges = {};

    // Compare title
    const newTitle = title ?? null;
    const currentTitle = existingSeo?.seoTitle ?? null;
    if (title !== undefined && newTitle !== currentTitle) {
      changes.title = newTitle;
    }

    // Compare description
    const newDescription = description ?? null;
    const currentDescription = existingSeo?.seoDescription ?? null;
    if (description !== undefined && newDescription !== currentDescription) {
      changes.description = newDescription;
    }

    // 3. Update if changes detected
    const hasChanges = Object.keys(changes).length > 0;
    if (hasChanges) {
      await this.repository.translation.upsertProductSeo({
        projectId,
        productId: id,
        locale,
        seoTitle: title !== undefined ? title : existingSeo?.seoTitle ?? null,
        seoDescription: description !== undefined ? description : existingSeo?.seoDescription ?? null,
        ogTitle: existingSeo?.ogTitle ?? null,
        ogDescription: existingSeo?.ogDescription ?? null,
        ogImageId: existingSeo?.ogImageId ?? null,
      });

      await this.repository.product.touch(id);
    }

    // 4. Fetch updated product
    const product = await this.repository.product.findById(id);
    if (!product) {
      return singleError("Product not found after update", "INTERNAL_ERROR");
    }

    this.logger.info({ productId: id, changes }, "Product SEO updated");

    return {
      result: product,
      changes: hasChanges ? changes : null,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): ProductSetSeoResult {
    return {
      result: null,
      changes: null,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
