import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  ProductTagAddParams,
  ProductTagAddResult,
} from "./dto/index.js";

export class ProductTagAddScript extends BaseScript<
  ProductTagAddParams,
  ProductTagAddResult
> {
  protected async execute(
    params: ProductTagAddParams
  ): Promise<ProductTagAddResult> {
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
    if (existing) {
      return { tag, affectedProductIds: [], userErrors: [] };
    }

    await this.repository.tag.linkProductToTag(productId, tagId);

    return { tag, affectedProductIds: [productId], userErrors: [] };
  }

  protected handleError(_error: unknown): ProductTagAddResult {
    return {
      tag: undefined,
      affectedProductIds: [],
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
