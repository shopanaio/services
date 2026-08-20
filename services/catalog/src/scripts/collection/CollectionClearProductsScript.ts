import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { CollectionClearProductsParams, CollectionResult } from "./dto/index.js";

export class CollectionClearProductsScript extends BaseScript<
  CollectionClearProductsParams,
  CollectionResult
> {
  @Transactional()
  protected async execute(params: CollectionClearProductsParams): Promise<CollectionResult> {
    const collection = await this.repository.collection.findByIdForUpdate(params.collectionId);
    if (!collection) {
      return {
        collection: undefined,
        userErrors: [
          {
            message: "Collection not found",
            field: ["collectionId"],
            code: "NOT_FOUND",
          },
        ],
      };
    }
    if (collection.revision !== params.expectedRevision) {
      return {
        collection: undefined,
        userErrors: [
          {
            message: "Collection revision does not match",
            field: ["expectedRevision"],
            code: "REVISION_CONFLICT",
          },
        ],
      };
    }
    if (collection.revision >= 2_147_483_646) {
      return {
        collection: undefined,
        userErrors: [
          {
            message: "Collection revision limit reached",
            code: "REVISION_LIMIT_EXCEEDED",
          },
        ],
      };
    }
    if (collection.type !== "manual") {
      return {
        collection: undefined,
        userErrors: [
          {
            message: "Can only clear manual collections",
            code: "INVALID",
          },
        ],
      };
    }

    const syncOperation = await this.repository.collectionSync.clearCollection({
      workflowId: `${this.context.requestId}:collection:clear`,
      collectionId: params.collectionId,
      collectionRevision: collection.revision + 1,
    });
    if (syncOperation.affectedCount === 0) {
      return { collection, userErrors: [] };
    }

    const refreshed = await this.repository.collection.bumpRevision(
      params.collectionId,
      params.expectedRevision,
      { listingChanged: false },
    );
    if (!refreshed) {
      throw new Error("Collection clear compare-and-swap failed after row lock");
    }
    if (!syncOperation.operationId) {
      throw new Error("Collection clear sync operation was not created");
    }
    return {
      collection: refreshed,
      syncOperationId: syncOperation.operationId,
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
