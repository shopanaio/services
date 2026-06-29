import { BaseScript } from "../../kernel/BaseScript.js";
import type { LexoRankMoveFailureCode } from "../../repositories/LexoRankRepository.js";
import type {
  CategoryMoveProductParams,
  CategoryMoveProductResult,
} from "./dto/index.js";

export class CategoryMoveProductScript extends BaseScript<
  CategoryMoveProductParams,
  CategoryMoveProductResult
> {
  protected async execute(
    params: CategoryMoveProductParams
  ): Promise<CategoryMoveProductResult> {
    const { categoryId, productId } = params;
    const afterProductId = params.afterProductId ?? undefined;
    const beforeProductId = params.beforeProductId ?? undefined;

    const category = await this.repository.category.findById(categoryId);
    if (!category) {
      return this.notFoundError("Category not found", ["categoryId"]);
    }

    const moveResult = await this.repository.category.moveProductCategoryRank(
      categoryId,
      productId,
      afterProductId,
      beforeProductId,
    );
    if (!moveResult.ok) {
      return this.moveError(moveResult.code);
    }

    const refreshedCategory = await this.repository.category.findById(categoryId);
    return {
      category: refreshedCategory ?? undefined,
      affectedProductIds: [productId],
      userErrors: [],
    };
  }

  private notFoundError(
    message: string,
    field: string[]
  ): CategoryMoveProductResult {
    return {
      category: undefined,
      userErrors: [{ message, field, code: "NOT_FOUND" }],
    };
  }

  private moveError(code: LexoRankMoveFailureCode): CategoryMoveProductResult {
    switch (code) {
      case "INVALID_AFTER_BEFORE":
        return {
          category: undefined,
          userErrors: [
            {
              message: "afterProductId and beforeProductId cannot be the same",
              field: ["afterProductId", "beforeProductId"],
              code: "INVALID_INPUT",
            },
          ],
        };
      case "INVALID_AFTER_SELF":
        return {
          category: undefined,
          userErrors: [
            {
              message: "Cannot move product after itself",
              field: ["afterProductId"],
              code: "INVALID_INPUT",
            },
          ],
        };
      case "INVALID_BEFORE_SELF":
        return {
          category: undefined,
          userErrors: [
            {
              message: "Cannot move product before itself",
              field: ["beforeProductId"],
              code: "INVALID_INPUT",
            },
          ],
        };
      case "ITEM_NOT_FOUND":
        return this.notFoundError("Product is not in category", ["productId"]);
      case "AFTER_ITEM_NOT_FOUND":
        return this.notFoundError("afterProductId is not in category", [
          "afterProductId",
        ]);
      case "BEFORE_ITEM_NOT_FOUND":
        return this.notFoundError("beforeProductId is not in category", [
          "beforeProductId",
        ]);
      case "RANK_SPACE_EXHAUSTED":
        return {
          category: undefined,
          userErrors: [
            { message: "Unable to move product", code: "RANK_SPACE_EXHAUSTED" },
          ],
        };
    }
  }

  protected handleError(error: unknown): CategoryMoveProductResult {
    this.logger.error("CategoryMoveProductScript failed", { error });

    return {
      category: undefined,
      affectedProductIds: [],
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
