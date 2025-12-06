import type { TransactionScript } from "../../kernel/types.js";

export interface VariantDeleteParams {
  readonly id: string;
  readonly permanent?: boolean;
}

export interface VariantDeleteResult {
  deletedVariantId?: string;
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const variantDelete: TransactionScript<
  VariantDeleteParams,
  VariantDeleteResult
> = async (params, services) => {
  const { logger, repository } = services;

  try {
    const { id, permanent = false } = params;

    // 1. Check if variant exists
    const existingVariant = await repository.variant.findById(id);
    if (!existingVariant) {
      return {
        deletedVariantId: undefined,
        userErrors: [
          {
            message: "Variant not found",
            field: ["id"],
            code: "NOT_FOUND",
          },
        ],
      };
    }

    // 2. Delete variant (soft or hard)
    let deleted: boolean;
    if (permanent) {
      // Hard delete
      deleted = await repository.variant.hardDelete(id);
    } else {
      // Soft delete - just set deletedAt
      deleted = await repository.variant.softDelete(id);
    }

    if (!deleted) {
      return {
        deletedVariantId: undefined,
        userErrors: [
          {
            message: "Failed to delete variant",
            code: "DELETE_FAILED",
          },
        ],
      };
    }

    logger.info(
      { variantId: id, permanent },
      "Variant deleted successfully"
    );

    return {
      deletedVariantId: id,
      userErrors: [],
    };
  } catch (error) {
    logger.error({ error }, "variantDelete failed");
    return {
      deletedVariantId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};
