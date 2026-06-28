import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type {
  ProductUpdateMediaParams,
  ProductUpdateMediaResult,
} from "./dto/ProductUpdateMediaDto.js";
import type { MediaChanges } from "../types/index.js";
import type { BackRefNotifyInput } from "../../sagas/index.js";
import { singleError } from "../types/index.js";

/**
 * Updates the product media registry without touching variant media links for
 * files that remain registered on the product.
 */
export class ProductUpdateMediaScript extends BaseScript<
  ProductUpdateMediaParams,
  ProductUpdateMediaResult
> {
  protected async execute(
    params: ProductUpdateMediaParams
  ): Promise<ProductUpdateMediaResult> {
    const result = await this.updateProductMediaRegistry(params);

    if (result.userErrors.length === 0 && result.changes) {
      await this.notifyBackRefs(params.id, result.changes.fileIds);
    }

    return result;
  }

  @Transactional()
  private async updateProductMediaRegistry(
    params: ProductUpdateMediaParams
  ): Promise<ProductUpdateMediaResult> {
    const { id, fileIds } = params;

    const existingProduct = await this.repository.product.findById(id);
    if (!existingProduct) {
      return singleError("Product not found", "NOT_FOUND", ["id"]);
    }

    const previousMedia = await this.repository.media.getProductMedia(id);
    const previousFileIds = previousMedia.map((media) => media.fileId);
    const uniqueFileIds = Array.from(new Set(fileIds));
    const hasChanges =
      previousFileIds.length !== uniqueFileIds.length ||
      previousFileIds.some((fileId, index) => fileId !== uniqueFileIds[index]);

    if (!hasChanges) {
      return {
        result: existingProduct,
        changes: null,
        userErrors: [],
      };
    }

    const nextMedia = await this.repository.media.setProductMedia(
      id,
      uniqueFileIds
    );
    const nextFileIds = nextMedia.map((media) => media.fileId);

    await this.repository.product.touch(id);

    const product = await this.repository.product.findById(id);
    if (!product) {
      return singleError("Product not found after update", "INTERNAL_ERROR");
    }

    const changes: MediaChanges = { fileIds: nextFileIds };

    this.logger.info(
      { productId: id, fileCount: nextFileIds.length },
      "Product media registry updated"
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
    productId: string,
    fileIds: string[]
  ): Promise<void> {
    try {
      await this.services.broker.runSaga<unknown, BackRefNotifyInput>(
        "catalog.backRefNotify",
        {
          entityRef: {
            service: "catalog",
            entityType: "product",
            entityId: productId,
          },
          fileIds,
        },
        {
          source: "workflow",
          workflowId: `productUpdateMedia:${productId}`,
          stepId: "notifyBackRefs",
        }
      );
    } catch (error) {
      this.logger.error(
        { productId, error, fileCount: fileIds.length },
        "Failed to start product media back-ref sync saga"
      );
    }
  }
}
