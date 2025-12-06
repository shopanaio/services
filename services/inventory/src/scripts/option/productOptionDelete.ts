import type { TransactionScript } from "../../kernel/types.js";

export interface ProductOptionDeleteParams {
  readonly id: string;
}

export interface ProductOptionDeleteResult {
  deletedOptionId?: string;
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const productOptionDelete: TransactionScript<
  ProductOptionDeleteParams,
  ProductOptionDeleteResult
> = async (params, services) => {
  const { logger, repository } = services;

  try {
    const { id } = params;

    // 1. Check if option exists
    const existingOption = await repository.option.findById(id);
    if (!existingOption) {
      return {
        deletedOptionId: undefined,
        userErrors: [
          {
            message: "Option not found",
            field: ["id"],
            code: "NOT_FOUND",
          },
        ],
      };
    }

    // 2. Delete option (CASCADE will delete values, swatches, variant links, translations)
    const deleted = await repository.option.delete(id);
    if (!deleted) {
      return {
        deletedOptionId: undefined,
        userErrors: [
          {
            message: "Failed to delete option",
            code: "DELETE_FAILED",
          },
        ],
      };
    }

    logger.info({ optionId: id }, "Product option deleted successfully");

    return {
      deletedOptionId: id,
      userErrors: [],
    };
  } catch (error) {
    logger.error({ error }, "productOptionDelete failed");
    return {
      deletedOptionId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};
