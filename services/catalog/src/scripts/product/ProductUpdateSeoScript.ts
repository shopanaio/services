import { BaseScript } from "../../kernel/BaseScript.js";
import type { ProductUpdateSeoParams, ProductUpdateSeoResult } from "./dto/ProductUpdateSeoDto.js";
import type { SeoChanges } from "../types/index.js";
import { singleError } from "../types/index.js";

/**
 * ProductUpdateSeoScript handles product SEO and Open Graph metadata.
 */
export class ProductUpdateSeoScript extends BaseScript<ProductUpdateSeoParams, ProductUpdateSeoResult> {
  protected async execute(params: ProductUpdateSeoParams): Promise<ProductUpdateSeoResult> {
    const { id, title, description, ogTitle, ogDescription, ogImageId } = params;

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

    const newOgTitle = ogTitle ?? null;
    const currentOgTitle = existingSeo?.ogTitle ?? null;
    if (ogTitle !== undefined && newOgTitle !== currentOgTitle) {
      changes.ogTitle = newOgTitle;
    }

    const newOgDescription = ogDescription ?? null;
    const currentOgDescription = existingSeo?.ogDescription ?? null;
    if (ogDescription !== undefined && newOgDescription !== currentOgDescription) {
      changes.ogDescription = newOgDescription;
    }

    const newOgImageId = ogImageId ?? null;
    const currentOgImageId = existingSeo?.ogImageId ?? null;
    if (ogImageId !== undefined && newOgImageId !== currentOgImageId) {
      changes.ogImageId = newOgImageId;
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
        ogTitle: ogTitle !== undefined ? ogTitle : existingSeo?.ogTitle ?? null,
        ogDescription: ogDescription !== undefined ? ogDescription : existingSeo?.ogDescription ?? null,
        ogImageId: ogImageId !== undefined ? ogImageId : existingSeo?.ogImageId ?? null,
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

  protected handleError(_error: unknown): ProductUpdateSeoResult {
    return {
      result: null,
      changes: null,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
