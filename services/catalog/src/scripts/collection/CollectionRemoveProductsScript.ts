import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { CollectionRemoveProductsParams, CollectionResult } from "./dto/index.js";

export class CollectionRemoveProductsScript extends BaseScript<
  CollectionRemoveProductsParams,
  CollectionResult
> {
  @Transactional()
  protected async execute(params: CollectionRemoveProductsParams): Promise<CollectionResult> {
    const collection = await this.repository.collection.findByIdForUpdate(params.collectionId);
    if (!collection) {
      return {
        collection: undefined,
        userErrors: [
          { message: "Collection not found", field: ["collectionId"], code: "NOT_FOUND" },
        ],
      };
    }
    if (collection.revision >= 2_147_483_646) {
      return {
        collection: undefined,
        userErrors: [
          { message: "Collection revision limit reached", code: "REVISION_LIMIT_EXCEEDED" },
        ],
      };
    }

    if (collection.type !== "manual") {
      return {
        collection: undefined,
        userErrors: [
          { message: "Can only remove products from manual collection", code: "INVALID" },
        ],
      };
    }
    if (params.productIds.length > 100) {
      return {
        collection: undefined,
        userErrors: [
          {
            message: "At most 100 products can be removed",
            field: ["productIds"],
            code: "LIMIT_EXCEEDED",
          },
        ],
      };
    }
    const productIds = [...new Set(params.productIds)];

    const changedProductIds = await this.repository.collectionItem.removeProducts(
      params.collectionId,
      productIds,
    );
    if (changedProductIds.length === 0) {
      return { collection, userErrors: [] };
    }
    const refreshed = await this.repository.collection.bumpRevision(
      params.collectionId,
      { listingChanged: false },
    );
    if (!refreshed) {
      throw new Error("Collection disappeared while removing products");
    }
    const operation = await this.repository.collectionSync.createOperation({
      workflowId: `${this.context.requestId}:collection:remove`,
      collectionId: params.collectionId,
      collectionRevision: refreshed.revision,
      reason: "remove",
      productIds: changedProductIds,
    });
    return {
      collection: refreshed,
      syncOperationId: operation.operationId,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): CollectionResult {
    return {
      collection: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
