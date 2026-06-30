import { BaseScript, Transactional } from "../../kernel/BaseScript.js";

export interface CategoryProductsCountRefreshParams {
  categoryIds: readonly string[];
}

export interface CategoryProductsCountRefreshResult {
  success: boolean;
  refreshedCategoryIds: string[];
}

export class CategoryProductsCountRefreshScript extends BaseScript<
  CategoryProductsCountRefreshParams,
  CategoryProductsCountRefreshResult
> {
  @Transactional()
  protected async execute(
    params: CategoryProductsCountRefreshParams,
  ): Promise<CategoryProductsCountRefreshResult> {
    const categoryIds = [...new Set(params.categoryIds)];
    if (categoryIds.length === 0) {
      return { success: true, refreshedCategoryIds: [] };
    }

    await this.repository.category.refreshProductsCountByCategoryIds(
      categoryIds,
    );

    return { success: true, refreshedCategoryIds: categoryIds };
  }

  protected handleError(_error: unknown): CategoryProductsCountRefreshResult {
    return { success: false, refreshedCategoryIds: [] };
  }
}
