import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type {
  ProductTagRemoveParams,
  ProductTagRemoveResult,
} from "./dto/index.js";

export class ProductTagRemoveScript extends BaseScript<
  ProductTagRemoveParams,
  ProductTagRemoveResult
> {
  @Transactional()
  protected async execute(
    params: ProductTagRemoveParams
  ): Promise<ProductTagRemoveResult> {
    const { productId, tagId } = params;

    const product = await this.repository.product.findById(productId);
    if (!product) {
      return {
        tag: undefined,
        affectedProductIds: [],
        userErrors: [
          { message: "Product not found", field: ["productId"], code: "NOT_FOUND" },
        ],
      };
    }

    const tag = await this.repository.tag.findById(tagId);
    if (!tag) {
      return {
        tag: undefined,
        affectedProductIds: [],
        userErrors: [
          { message: "Tag not found", field: ["tagId"], code: "NOT_FOUND" },
        ],
      };
    }

    const existing = await this.repository.tag.getProductTag(productId, tagId);
    if (!existing) {
      return {
        tag: undefined,
        affectedProductIds: [],
        userErrors: [
          {
            message: "Product is not assigned to tag",
            field: ["productId"],
            code: "NOT_FOUND",
          },
        ],
      };
    }

    await this.repository.tag.unlinkProductFromTag(productId, tagId);

    return { tag, affectedProductIds: [productId], userErrors: [] };
  }

  protected handleError(_error: unknown): ProductTagRemoveResult {
    return {
      tag: undefined,
      affectedProductIds: [],
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
