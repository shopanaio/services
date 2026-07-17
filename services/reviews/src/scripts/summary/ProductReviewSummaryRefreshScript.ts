import { BaseScript, Transactional } from "../../kernel/BaseScript.js";

export interface ProductReviewSummaryRefreshParams {
  productId: string;
}

export class ProductReviewSummaryRefreshScript extends BaseScript<
  ProductReviewSummaryRefreshParams,
  void
> {
  @Transactional()
  protected async execute(
    params: ProductReviewSummaryRefreshParams
  ): Promise<void> {
    await this.repository.summary.refreshProductReviewSummary(params.productId);
  }

  protected handleError(error: unknown): never {
    throw error;
  }
}
