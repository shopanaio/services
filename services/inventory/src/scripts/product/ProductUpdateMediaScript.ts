import { BaseScript } from "../../kernel/BaseScript.js";
import type { ProductUpdateMediaParams, ProductUpdateMediaResult } from "./dto/ProductUpdateMediaDto.js";
import type { MediaChanges } from "../types/index.js";
import type { BackRefNotifyInput } from "../../sagas/index.js";
import { singleError } from "../types/index.js";

/**
 * ProductUpdateMediaScript handles product media by updating it on the default variant.
 * In Shopana, product media is stored on variants, so product-level media
 * is attached to the default variant.
 */
export class ProductUpdateMediaScript extends BaseScript<ProductUpdateMediaParams, ProductUpdateMediaResult> {
  protected async execute(params: ProductUpdateMediaParams): Promise<ProductUpdateMediaResult> {
    const { id, fileIds } = params;

    // 1. Check if product exists
    const existingProduct = await this.repository.product.findById(id);
    if (!existingProduct) {
      return singleError("Product not found", "NOT_FOUND", ["id"]);
    }

    // 2. Find default variant
    const variants = await this.repository.variant.findByProductId(id);
    const defaultVariant = variants.find((v) => v.isDefault);
    if (!defaultVariant) {
      return singleError("Default variant not found", "DEFAULT_VARIANT_NOT_FOUND");
    }

    // 3. Get existing media to compare
    const existingMedia = await this.repository.media.getVariantMedia(defaultVariant.id);
    const previousFileIds = existingMedia.map((media) => media.fileId);

    // 4. Check if there are actual changes
    const uniqueFileIds = Array.from(new Set(fileIds));
    const previousSet = new Set(previousFileIds);
    const nextSet = new Set(uniqueFileIds);
    const hasChanges =
      previousFileIds.length !== uniqueFileIds.length ||
      previousFileIds.some((fileId) => !nextSet.has(fileId)) ||
      uniqueFileIds.some((fileId) => !previousSet.has(fileId));

    if (!hasChanges) {
      return {
        result: existingProduct,
        changes: null,
        userErrors: [],
      };
    }

    // 5. Set media on default variant
    await this.repository.media.setVariantMedia(defaultVariant.id, fileIds);
    await this.notifyBackRefs(defaultVariant.id, uniqueFileIds, previousFileIds);

    // 6. Touch product to update updatedAt
    await this.repository.product.touch(id);

    // 7. Fetch updated product
    const product = await this.repository.product.findById(id);
    if (!product) {
      return singleError("Product not found after update", "INTERNAL_ERROR");
    }

    const changes: MediaChanges = { fileIds: uniqueFileIds };

    this.logger.info(
      { productId: id, variantId: defaultVariant.id, fileCount: fileIds.length },
      "Product media updated"
    );

    return {
      result: product,
      changes,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): ProductUpdateMediaResult {
    return {
      result: null,
      changes: null,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }

  private async notifyBackRefs(
    variantId: string,
    nextFileIds: string[],
    previousFileIds: string[]
  ): Promise<void> {
    try {
      await this.services.broker.runSaga<unknown, BackRefNotifyInput>(
        "backRefNotify",
        {
          entityRef: {
            service: "inventory",
            entityType: "variant",
            entityId: variantId,
          },
          fileIds: nextFileIds,
        },
        {
          source: "workflow",
          workflowId: `productUpdateMedia:${variantId}`,
          stepId: "notifyBackRefs",
        }
      );
    } catch (error) {
      this.logger.error(
        { variantId, error, fileCount: nextFileIds.length },
        "Failed to start backref sync saga"
      );
    }
  }
}
