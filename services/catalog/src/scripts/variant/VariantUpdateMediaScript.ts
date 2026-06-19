import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { Variant } from "../../repositories/models/index.js";
import { ProductMediaRegistrationError } from "../../repositories/media/MediaRepository.js";
import {
  type ScriptResult,
  successResult,
  unchangedResult,
  singleError,
} from "../types/ScriptResult.js";
import type { MediaChanges } from "../types/ProductChanges.js";

export interface VariantUpdateMediaParams {
  readonly variantId: string;
  readonly fileIds: string[];
}

export type VariantUpdateMediaResult = ScriptResult<Variant, MediaChanges>;

export class VariantUpdateMediaScript extends BaseScript<
  VariantUpdateMediaParams,
  VariantUpdateMediaResult
> {
  @Transactional()
  protected async execute(
    params: VariantUpdateMediaParams
  ): Promise<VariantUpdateMediaResult> {
    const { variantId, fileIds } = params;
    const uniqueNextFileIds = Array.from(new Set(fileIds));

    const variant = await this.repository.variant.findById(variantId);
    if (!variant) {
      return singleError("Variant not found", "NOT_FOUND", ["variantId"]);
    }

    const registeredMedia = await this.repository.media.getProductMediaByFileIds(
      variant.productId,
      uniqueNextFileIds
    );
    const registeredFileIds = new Set(
      registeredMedia.map((media) => media.fileId)
    );
    const missingFileIds = uniqueNextFileIds.filter(
      (fileId) => !registeredFileIds.has(fileId)
    );

    if (missingFileIds.length > 0) {
      return singleError(
        "Variant media must be registered on the product before it can be attached",
        "PRODUCT_MEDIA_NOT_REGISTERED",
        ["fileIds"]
      );
    }

    const existingMedia = await this.repository.media.getVariantMedia(variantId);
    const previousFileIds = existingMedia.map((media) => media.fileId);

    const hasChanges =
      previousFileIds.length !== uniqueNextFileIds.length ||
      previousFileIds.some(
        (fileId, index) => fileId !== uniqueNextFileIds[index]
      );

    if (!hasChanges) {
      this.logger.debug({ variantId }, "No variant media changes detected");
      return unchangedResult(variant);
    }

    await this.repository.media.setVariantMedia(variantId, uniqueNextFileIds);

    this.logger.info(
      { variantId, productId: variant.productId, fileCount: uniqueNextFileIds.length },
      "Variant media updated successfully"
    );

    const changes: MediaChanges = {
      fileIds: uniqueNextFileIds,
    };

    return successResult(variant, changes);
  }

  protected handleError(error: unknown): VariantUpdateMediaResult {
    if (error instanceof ProductMediaRegistrationError) {
      return {
        result: null,
        changes: null,
        userErrors: [
          {
            message:
              "Variant media must be registered on the product before it can be attached",
            field: ["fileIds"],
            code: "PRODUCT_MEDIA_NOT_REGISTERED",
          },
        ],
      };
    }

    return {
      result: null,
      changes: null,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
