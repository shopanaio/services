import { BaseScript } from "../../kernel/BaseScript.js";

export interface DeleteProductIndexParams {
  productId: string;
}

export interface DeleteProductIndexResult {
  productId: string;
  deleted: boolean;
}

export class DeleteProductIndexScript extends BaseScript<
  DeleteProductIndexParams,
  DeleteProductIndexResult
> {
  protected async execute(
    params: DeleteProductIndexParams
  ): Promise<DeleteProductIndexResult> {
    await Promise.all([
      this.repository.searchIndex.delete(params.productId),
      this.repository.variantSearchIndex.deleteByProductId(params.productId),
    ]);

    return { productId: params.productId, deleted: true };
  }

  protected handleError(_error: unknown): DeleteProductIndexResult {
    return { productId: "", deleted: false };
  }
}
