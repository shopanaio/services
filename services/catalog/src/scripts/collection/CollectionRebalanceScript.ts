import { BaseScript } from "../../kernel/BaseScript.js";
import type { CollectionRebalanceParams, CollectionResult } from "./dto/index.js";

export class CollectionRebalanceScript extends BaseScript<
  CollectionRebalanceParams,
  CollectionResult
> {
  protected async execute(params: CollectionRebalanceParams): Promise<CollectionResult> {
    const collection = await this.repository.collection.findById(params.collectionId);
    if (!collection) {
      return {
        collection: undefined,
        userErrors: [{ message: "Collection not found", field: ["collectionId"], code: "NOT_FOUND" }],
      };
    }

    await this.repository.collectionItem.rebalance(params.collectionId);
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
