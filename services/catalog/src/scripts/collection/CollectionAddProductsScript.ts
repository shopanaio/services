import { BaseScript } from "../../kernel/BaseScript.js";
import type { CollectionAddProductsParams, CollectionResult } from "./dto/index.js";

export class CollectionAddProductsScript extends BaseScript<
  CollectionAddProductsParams,
  CollectionResult
> {
  protected async execute(params: CollectionAddProductsParams): Promise<CollectionResult> {
    const collection = await this.repository.collection.findById(params.collectionId);
    if (!collection) {
      return {
        collection: undefined,
        userErrors: [{ message: "Collection not found", field: ["collectionId"], code: "NOT_FOUND" }],
      };
    }

    if (collection.type !== "manual") {
      return {
        collection: undefined,
        userErrors: [{ message: "Can only add products to manual collection", code: "INVALID" }],
      };
    }

    await this.repository.collectionItem.addProducts(
      params.collectionId,
      params.productIds
    );

    const refreshed = await this.repository.collection.findById(params.collectionId);
    return { collection: refreshed ?? undefined, userErrors: [] };
  }

  protected handleError(_error: unknown): CollectionResult {
    return {
      collection: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
