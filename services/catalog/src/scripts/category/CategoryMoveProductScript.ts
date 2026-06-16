import { BaseScript } from "../../kernel/BaseScript.js";
import { midpointRank } from "../shared/rank.js";
import type {
  CategoryMoveProductParams,
  CategoryMoveProductResult,
} from "./dto/index.js";
import type { ProductCategory } from "../../repositories/models/index.js";

type EffectiveRanks = {
  afterRank: string | null;
  beforeRank: string | null;
};

export class CategoryMoveProductScript extends BaseScript<
  CategoryMoveProductParams,
  CategoryMoveProductResult
> {
  protected async execute(
    params: CategoryMoveProductParams
  ): Promise<CategoryMoveProductResult> {
    const { categoryId, productId, afterProductId, beforeProductId } = params;

    const validationError = this.validateParams(params);
    if (validationError) {
      return validationError;
    }

    const category = await this.repository.category.findById(categoryId);
    if (!category) {
      return this.notFoundError("Category not found", ["categoryId"]);
    }

    const productCategoryLink = await this.repository.category.getProductCategory(
      categoryId,
      productId
    );
    if (!productCategoryLink) {
      return this.notFoundError("Product is not in category", ["productId"]);
    }

    const [afterLink, beforeLink] = await this.fetchBoundaryLinks(
      categoryId,
      afterProductId,
      beforeProductId
    );

    if (afterProductId && !afterLink) {
      return this.notFoundError("afterProductId is not in category", ["afterProductId"]);
    }

    if (beforeProductId && !beforeLink) {
      return this.notFoundError("beforeProductId is not in category", ["beforeProductId"]);
    }

    const needNeighborLookup =
      (beforeProductId && !afterProductId) || (afterProductId && !beforeProductId);

    let effectiveRanks = await this.resolveEffectiveRanks(
      categoryId,
      productId,
      afterProductId,
      beforeProductId,
      afterLink,
      beforeLink,
      needNeighborLookup
    );

    let newRank = midpointRank(effectiveRanks.afterRank, effectiveRanks.beforeRank);

    if (!newRank) {
      newRank = await this.rebalanceAndRetry(
        categoryId,
        productId,
        afterProductId,
        beforeProductId,
        needNeighborLookup
      );
    }

    if (!newRank) {
      return {
        category: undefined,
        userErrors: [{ message: "Unable to move product", code: "RANK_SPACE_EXHAUSTED" }],
      };
    }

    await this.repository.category.updateProductCategoryRank(categoryId, productId, newRank);

    const refreshedCategory = await this.repository.category.findById(categoryId);
    return { category: refreshedCategory ?? undefined, userErrors: [] };
  }

  private validateParams(
    params: CategoryMoveProductParams
  ): CategoryMoveProductResult | null {
    const { productId, afterProductId, beforeProductId } = params;

    if (afterProductId && afterProductId === beforeProductId) {
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
    }

    if (afterProductId === productId) {
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
    }

    if (beforeProductId === productId) {
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
    }

    return null;
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

  private async fetchBoundaryLinks(
    categoryId: string,
    afterProductId: string | undefined,
    beforeProductId: string | undefined
  ): Promise<[ProductCategory | null, ProductCategory | null]> {
    return Promise.all([
      afterProductId
        ? this.repository.category.getProductCategory(categoryId, afterProductId)
        : Promise.resolve(null),
      beforeProductId
        ? this.repository.category.getProductCategory(categoryId, beforeProductId)
        : Promise.resolve(null),
    ]);
  }

  private async resolveEffectiveRanks(
    categoryId: string,
    productId: string,
    afterProductId: string | undefined,
    beforeProductId: string | undefined,
    afterLink: ProductCategory | null,
    beforeLink: ProductCategory | null,
    needNeighborLookup: boolean
  ): Promise<EffectiveRanks> {
    let afterRank: string | null = afterLink?.lexoRank ?? null;
    let beforeRank: string | null = beforeLink?.lexoRank ?? null;

    if (!needNeighborLookup) {
      return { afterRank, beforeRank };
    }

    const orderedProducts =
      await this.repository.category.getOrderedCategoryProducts(categoryId);

    if (beforeProductId && !afterProductId && beforeLink) {
      const neighborRank = this.findPreviousNeighborRank(
        orderedProducts,
        beforeProductId,
        productId
      );
      if (neighborRank) {
        afterRank = neighborRank;
      }
    }

    if (afterProductId && !beforeProductId && afterLink) {
      const neighborRank = this.findNextNeighborRank(
        orderedProducts,
        afterProductId,
        productId
      );
      if (neighborRank) {
        beforeRank = neighborRank;
      }
    }

    return { afterRank, beforeRank };
  }

  private findPreviousNeighborRank(
    orderedProducts: ProductCategory[],
    beforeProductId: string,
    excludeProductId: string
  ): string | null {
    const index = orderedProducts.findIndex((p) => p.productId === beforeProductId);
    if (index <= 0) {
      return null;
    }

    const previousItem = orderedProducts[index - 1];
    if (previousItem.productId === excludeProductId) {
      return null;
    }

    return previousItem.lexoRank;
  }

  private findNextNeighborRank(
    orderedProducts: ProductCategory[],
    afterProductId: string,
    excludeProductId: string
  ): string | null {
    const index = orderedProducts.findIndex((p) => p.productId === afterProductId);
    if (index < 0 || index >= orderedProducts.length - 1) {
      return null;
    }

    const nextItem = orderedProducts[index + 1];
    if (nextItem.productId === excludeProductId) {
      return null;
    }

    return nextItem.lexoRank;
  }

  private async rebalanceAndRetry(
    categoryId: string,
    productId: string,
    afterProductId: string | undefined,
    beforeProductId: string | undefined,
    needNeighborLookup: boolean
  ): Promise<string | null> {
    await this.repository.category.rebalanceCategoryProductRanks(categoryId);

    const [afterLink, beforeLink] = await this.fetchBoundaryLinks(
      categoryId,
      afterProductId,
      beforeProductId
    );

    const effectiveRanks = await this.resolveEffectiveRanks(
      categoryId,
      productId,
      afterProductId,
      beforeProductId,
      afterLink,
      beforeLink,
      needNeighborLookup
    );

    return midpointRank(effectiveRanks.afterRank, effectiveRanks.beforeRank);
  }

  protected handleError(error: unknown): CategoryMoveProductResult {
    this.logger.error("CategoryMoveProductScript failed", { error });

    return {
      category: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
