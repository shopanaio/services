import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import { conflict, internalError, notFound } from "./errors.js";
import type { ProductQuestionDeleteParams, ProductQuestionDeleteResult } from "./types.js";

export class ProductQuestionDeleteScript extends BaseScript<
  ProductQuestionDeleteParams,
  ProductQuestionDeleteResult
> {
  @Transactional()
  protected async execute(
    params: ProductQuestionDeleteParams,
  ): Promise<ProductQuestionDeleteResult> {
    const aggregate = await this.repository.productQuestion.findById(params.id);
    if (!aggregate) return { userErrors: notFound("Product question") };
    const result = await this.repository.content.delete({
      id: params.id,
      expectedRevision: params.expectedRevision,
      permanent: params.permanent ?? false,
    });
    if (result.status === "not_found") return { userErrors: notFound("Product question") };
    if (result.status === "conflict") return { userErrors: conflict("expectedRevision") };
    this.logger.info(
      { productQuestionId: params.id, permanent: params.permanent ?? false },
      "Product question deleted",
    );
    return {
      deletedProductQuestionId: params.id,
      productId: aggregate.question.productId,
      permanent: params.permanent ?? false,
      userErrors: [],
    };
  }

  protected handleError(): ProductQuestionDeleteResult {
    return { userErrors: internalError() };
  }
}
