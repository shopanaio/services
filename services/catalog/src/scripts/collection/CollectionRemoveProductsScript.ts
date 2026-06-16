import { BaseScript } from "../../kernel/BaseScript.js";
import type { CollectionRemoveProductsParams, CollectionResult } from "./dto/index.js";

export class CollectionRemoveProductsScript extends BaseScript<
  CollectionRemoveProductsParams,
  CollectionResult
> {
  protected async execute(
    params: CollectionRemoveProductsParams
  ): Promise<CollectionResult> {
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
        userErrors: [{ message: "Can only remove products from manual collection", code: "INVALID" }],
      };
    }

    await this.repository.collectionItem.removeProducts(
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
