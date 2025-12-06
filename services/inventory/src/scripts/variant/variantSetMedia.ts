import type { TransactionScript } from "../../kernel/types.js";
import type { Variant } from "../../repositories/models/index.js";

export interface VariantSetMediaParams {
  readonly variantId: string;
  readonly fileIds: string[];
}

export interface VariantSetMediaResult {
  variant?: Variant;
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const variantSetMedia: TransactionScript<
  VariantSetMediaParams,
  VariantSetMediaResult
> = async (params, services) => {
  const { logger, repository } = services;

  try {
    const { variantId, fileIds } = params;

    // 1. Check if variant exists
    const variant = await repository.variant.findById(variantId);
    if (!variant) {
      return {
        variant: undefined,
        userErrors: [
          {
            message: "Variant not found",
            field: ["variantId"],
            code: "NOT_FOUND",
          },
        ],
      };
    }

    // 2. Set media (replaces all existing media)
    // Empty array clears all media
    await repository.media.setVariantMedia(variantId, fileIds);

    logger.info(
      { variantId, fileCount: fileIds.length },
      "Variant media set successfully"
    );

    return {
      variant,
      userErrors: [],
    };
  } catch (error) {
    logger.error({ error }, "variantSetMedia failed");
    return {
      variant: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};
