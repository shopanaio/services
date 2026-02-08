import { BaseScript } from "../../kernel/BaseScript.js";
import {
  midpointRank,
} from "../shared/rank.js";
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
    const { categoryId, productId, afterProductId, beforeProductId } = params;

    const category = await this.repository.category.findById(categoryId);
    if (!category) {
      return {
        category: undefined,
        userErrors: [{ message: "Category not found", field: ["categoryId"], code: "NOT_FOUND" }],
      };
    }

    const link = await this.repository.category.getProductCategory(categoryId, productId);
    if (!link) {
      return {
        category: undefined,
        userErrors: [{ message: "Product is not in category", field: ["productId"], code: "NOT_FOUND" }],
      };
    }

    const [afterLink, beforeLink] = await Promise.all([
      afterProductId
        ? this.repository.category.getProductCategory(categoryId, afterProductId)
        : Promise.resolve(null),
      beforeProductId
        ? this.repository.category.getProductCategory(categoryId, beforeProductId)
        : Promise.resolve(null),
    ]);

    if (afterProductId && !afterLink) {
      return {
        category: undefined,
        userErrors: [{ message: "afterProductId is not in category", field: ["afterProductId"], code: "NOT_FOUND" }],
      };
    }

    if (beforeProductId && !beforeLink) {
      return {
        category: undefined,
        userErrors: [{ message: "beforeProductId is not in category", field: ["beforeProductId"], code: "NOT_FOUND" }],
      };
    }

    let newRank = midpointRank(afterLink?.lexoRank ?? null, beforeLink?.lexoRank ?? null);
    if (!newRank) {
      await this.repository.category.rebalanceCategoryProductRanks(categoryId);
      const [afterRebalanced, beforeRebalanced] = await Promise.all([
        afterProductId
          ? this.repository.category.getProductCategory(categoryId, afterProductId)
          : Promise.resolve(null),
        beforeProductId
          ? this.repository.category.getProductCategory(categoryId, beforeProductId)
          : Promise.resolve(null),
      ]);
      newRank = midpointRank(
        afterRebalanced?.lexoRank ?? null,
        beforeRebalanced?.lexoRank ?? null
      );
    }

    if (!newRank) {
      return {
        category: undefined,
        userErrors: [{ message: "Unable to move product", code: "RANK_SPACE_EXHAUSTED" }],
      };
    }

    await this.repository.category.updateProductCategoryRank(
      categoryId,
      productId,
      newRank
    );

    const refreshedCategory = await this.repository.category.findById(categoryId);
    return { category: refreshedCategory ?? undefined, userErrors: [] };
  }

  protected handleError(_error: unknown): CategoryMoveProductResult {
    return {
      category: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
