import { BaseScript } from "../../kernel/BaseScript.js";
import type { ProductUpdateContentParams, ProductUpdateContentResult } from "./dto/ProductUpdateContentDto.js";
import type { ContentChanges, RichTextChange } from "../types/index.js";
import { singleError } from "../types/index.js";
import {
  stableRichTextValue,
  toRichTextStorage,
} from "../shared/richText.js";

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

    const currentDescription = {
      text: existingTranslation?.descriptionText ?? null,
      html: existingTranslation?.descriptionHtml ?? null,
      json: existingTranslation?.descriptionJson ?? null,
    };
    const currentExcerpt = {
      text: existingTranslation?.excerptText ?? null,
      html: existingTranslation?.excerptHtml ?? null,
      json: existingTranslation?.excerptJson ?? null,
    };

    const nextDescription =
      description === undefined ? currentDescription : toRichTextStorage(description);
    const nextExcerpt =
      excerpt === undefined ? currentExcerpt : toRichTextStorage(excerpt);

    if (
      description !== undefined &&
      stableRichTextValue(nextDescription) !== stableRichTextValue(currentDescription)
    ) {
      changes.description = toChangePayload(description);
    }

    if (
      excerpt !== undefined &&
      stableRichTextValue(nextExcerpt) !== stableRichTextValue(currentExcerpt)
    ) {
      changes.excerpt = toChangePayload(excerpt);
    }

    // 3. Update if changes detected
    const hasChanges = Object.keys(changes).length > 0;
    if (hasChanges) {
      await this.repository.translation.upsertProductTranslation({
        projectId,
        productId: id,
        locale,
        title: existingTranslation?.title ?? "",
        descriptionText: nextDescription.text,
        descriptionHtml: nextDescription.html,
        descriptionJson: nextDescription.json,
        excerptText: nextExcerpt.text,
        excerptHtml: nextExcerpt.html,
        excerptJson: nextExcerpt.json,
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

function toChangePayload(
  value: ProductUpdateContentParams["description"]
): RichTextChange | null {
  if (!value) {
    return null;
  }

  return {
    text: value.text,
    html: value.html,
    json: value.json,
  };
}
