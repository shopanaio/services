import { BaseScript } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";
import type { ProductUpdateParams, ProductUpdateResult } from "./dto/index.js";
import type { ProductIdentityChanges } from "../types/index.js";
import { singleError } from "../types/index.js";

/**
 * ProductUpdateScript handles product identity fields: handle, title, and vendor.
 *
 * For content (description/excerpt), use ProductSetContentScript.
 * For SEO, use ProductSetSeoScript.
 * For media, use ProductSetMediaScript.
 * For status, use ProductSetStatusScript.
 */
export class ProductUpdateScript extends BaseScript<ProductUpdateParams, ProductUpdateResult> {
  protected async execute(params: ProductUpdateParams): Promise<ProductUpdateResult> {
    const { id, handle, title, vendorId } = params;

    // 1. Check if product exists
    const existingProduct = await this.repository.product.findById(id);
    if (!existingProduct) {
      return singleError("Product not found", "NOT_FOUND", ["id"]);
    }

    if (vendorId !== undefined && vendorId !== null) {
      const vendor = await this.repository.vendor.findById(vendorId);
      if (!vendor) {
        return singleError(
          "Vendor not found",
          "MISSING_VENDOR",
          ["vendorId"]
        );
      }
    }

    const locale = this.getLocale();
    const projectId = this.getProjectId();

    // Track what actually changed
    const changes: ProductIdentityChanges = {};

    // 2. Update title if provided and different
    if (title !== undefined) {
      const existingTranslation = await this.repository.translation.getProductTranslation(id, locale);
      const currentTitle = existingTranslation?.name ?? "";

      if (title !== currentTitle) {
        await this.repository.translation.upsertProductTranslation({
          projectId,
          productId: id,
          locale,
          name: title,
          descriptionText: existingTranslation?.descriptionText ?? null,
          descriptionHtml: existingTranslation?.descriptionHtml ?? null,
          descriptionJson: existingTranslation?.descriptionJson ?? null,
          excerptText: existingTranslation?.excerptText ?? null,
          excerptHtml: existingTranslation?.excerptHtml ?? null,
          excerptJson: existingTranslation?.excerptJson ?? null,
        });
        changes.title = title;
      }
    }

    // 3. Update handle if provided and different
    if (handle !== undefined && handle !== existingProduct.handle) {
      try {
        await this.repository.product.update(id, { handle });
        changes.handle = handle;
      } catch (error) {
        if (isUniqueViolation(error, "product_project_id_handle_key")) {
          return singleError(
            "Product with this handle already exists",
            "DUPLICATE_HANDLE",
            ["handle"]
          );
        }
        throw error;
      }
    }

    // 4. Update vendor if explicitly provided and different
    if (vendorId !== undefined && vendorId !== existingProduct.vendorId) {
      await this.repository.product.update(id, { vendorId });
      changes.vendorId = vendorId;
    }

    // 5. Touch product if anything changed
    const hasChanges = Object.keys(changes).length > 0;
    if (hasChanges) {
      await this.repository.product.touch(id);
    }

    // 6. Fetch updated product
    const product = await this.repository.product.findById(id);
    if (!product) {
      return singleError("Product not found after update", "INTERNAL_ERROR");
    }

    this.logger.info({ productId: id, changes }, "Product updated");

    return {
      result: product,
      changes: hasChanges ? changes : null,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): ProductUpdateResult {
    return {
      result: null,
      changes: null,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
