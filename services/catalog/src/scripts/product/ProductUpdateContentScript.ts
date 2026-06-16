import { BaseScript } from "../../kernel/BaseScript.js";
import type { ProductUpdateContentParams, ProductUpdateContentResult } from "./dto/ProductUpdateContentDto.js";
import type { ContentChanges } from "../types/index.js";
import { singleError } from "../types/index.js";

/**
 * ProductUpdateContentScript handles product content: description and excerpt.
 */
export class ProductUpdateContentScript extends BaseScript<ProductUpdateContentParams, ProductUpdateContentResult> {
  protected async execute(params: ProductUpdateContentParams): Promise<ProductUpdateContentResult> {
    const { id, description, excerpt } = params;

    // 1. Check if product exists
    const existingProduct = await this.repository.product.findById(id);
    if (!existingProduct) {
      return singleError("Product not found", "NOT_FOUND", ["id"]);
    }

    const locale = this.getLocale();
    const projectId = this.getProjectId();

    // 2. Get existing translation
    const existingTranslation = await this.repository.translation.getProductTranslation(id, locale);

    // Track what actually changed
    const changes: ContentChanges = {};

    // Compare description (using text representation for comparison)
    const newDescriptionText = description?.text ?? null;
    const currentDescriptionText = existingTranslation?.descriptionText ?? null;
    if (description !== undefined && newDescriptionText !== currentDescriptionText) {
      changes.description = newDescriptionText;
    }

    // Compare excerpt
    const newExcerpt = excerpt ?? null;
    const currentExcerpt = existingTranslation?.excerpt ?? null;
    if (excerpt !== undefined && newExcerpt !== currentExcerpt) {
      changes.excerpt = newExcerpt;
    }

    // 3. Update if changes detected
    const hasChanges = Object.keys(changes).length > 0;
    if (hasChanges) {
      await this.repository.translation.upsertProductTranslation({
        projectId,
        productId: id,
        locale,
        title: existingTranslation?.title ?? "",
        descriptionText: description?.text ?? existingTranslation?.descriptionText ?? null,
        descriptionHtml: description?.html ?? existingTranslation?.descriptionHtml ?? null,
        descriptionJson: description?.json ?? existingTranslation?.descriptionJson ?? null,
        excerpt: excerpt ?? existingTranslation?.excerpt ?? null,
      });

      await this.repository.product.touch(id);
    }

    // 4. Fetch updated product
    const product = await this.repository.product.findById(id);
    if (!product) {
      return singleError("Product not found after update", "INTERNAL_ERROR");
    }

    this.logger.info({ productId: id, changes }, "Product content updated");

    return {
      result: product,
      changes: hasChanges ? changes : null,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): ProductUpdateContentResult {
    return {
      result: null,
      changes: null,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
