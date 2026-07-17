import { BaseScript, Transactional } from "../../kernel/BaseScript.js";

export interface ProductQuestionSummaryRefreshParams {
  productId: string;
}

export class ProductQuestionSummaryRefreshScript extends BaseScript<
  ProductQuestionSummaryRefreshParams,
  void
> {
  @Transactional()
  protected async execute(
    params: ProductQuestionSummaryRefreshParams
  ): Promise<void> {
    await this.repository.summary.refreshProductQuestionSummary(
      params.productId
    );
  }

  protected handleError(error: unknown): never {
    throw error;
  }
}
