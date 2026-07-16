import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";
import { internalError, mapContentCreate } from "./content.js";
import type {
  ProductQuestionCreateParams,
  ProductQuestionCreateResult,
} from "./types.js";

export class ProductQuestionCreateScript extends BaseScript<
  ProductQuestionCreateParams,
  ProductQuestionCreateResult
> {
  @Transactional()
  protected async execute(
    params: ProductQuestionCreateParams
  ): Promise<ProductQuestionCreateResult> {
    const mapped = mapContentCreate(
      params.content,
      "PRODUCT_QUESTION",
      this.context.hasUser ? this.context.user.id : undefined
    );
    if (mapped.errors.length > 0 || !mapped.values) {
      return { userErrors: mapped.errors };
    }

    try {
      const aggregate = await this.repository.productQuestion.create({
        content: mapped.values,
        question: {
          productId: params.productId,
          variantId: params.variantId ?? null,
        },
      });
      this.logger.info(
        { productQuestionId: aggregate.question.id },
        "Product question created"
      );
      return {
        productQuestion: {
          id: aggregate.question.id,
          productId: aggregate.question.productId,
        },
        userErrors: [],
      };
    } catch (error) {
      if (isUniqueViolation(error, "content_item_store_idempotency_unique")) {
        return {
          userErrors: [
            {
              message: "Content with this idempotency key already exists",
              code: "DUPLICATE_IDEMPOTENCY_KEY",
              field: ["content", "source", "idempotencyKey"],
            },
          ],
        };
      }
      throw error;
    }
  }

  protected handleError(): ProductQuestionCreateResult {
    return { userErrors: internalError() };
  }
}
