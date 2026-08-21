import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { LexoRankMoveFailureCode } from "../../repositories/LexoRankRepository.js";
import type { CollectionMoveProductParams, CollectionResult } from "./dto/index.js";

export class CollectionMoveProductScript extends BaseScript<
  CollectionMoveProductParams,
  CollectionResult
> {
  @Transactional()
  protected async execute(params: CollectionMoveProductParams): Promise<CollectionResult> {
    const collection = await this.repository.collection.findByIdForUpdate(params.collectionId);
    if (!collection) {
      return {
        collection: undefined,
        userErrors: [
          { message: "Collection not found", field: ["collectionId"], code: "NOT_FOUND" },
        ],
      };
    }
    if (collection.type !== "manual") {
      return {
        collection: undefined,
        userErrors: [{ message: "Can only move products in manual collection", code: "INVALID" }],
      };
    }

    const before = await this.repository.collectionItem.findByCollectionId(params.collectionId);
    const moveResult = await this.repository.collectionItem.moveProductRank(
      params.collectionId,
      params.productId,
      params.afterProductId,
      params.beforeProductId,
    );
    if (!moveResult.ok) {
      return this.moveError(moveResult.code);
    }
    const after = await this.repository.collectionItem.findByCollectionId(params.collectionId);
    const beforeRanks = new Map(before.map((item) => [item.productId, item.lexoRank]));
    const changedProductIds = after
      .filter((item) => beforeRanks.get(item.productId) !== item.lexoRank)
      .map((item) => item.productId);
    if (changedProductIds.length === 0) return { collection, userErrors: [] };
    const refreshed = await this.repository.collection.markChanged(params.collectionId, {
      listingChanged: false,
    });
    if (!refreshed) {
      throw new Error("Collection disappeared while moving a product");
    }
    const operation = await this.repository.collectionSync.createOperation({
      workflowId: `${this.context.requestId}:collection:move`,
      collectionId: params.collectionId,
      reason: "move",
      productIds: changedProductIds,
    });
    return {
      collection: refreshed,
      syncOperationId: operation.operationId,
      userErrors: [],
    };
  }

  private moveError(code: LexoRankMoveFailureCode): CollectionResult {
    switch (code) {
      case "INVALID_AFTER_BEFORE":
        return {
          collection: undefined,
          userErrors: [
            {
              message: "afterProductId and beforeProductId cannot be the same",
              field: ["afterProductId", "beforeProductId"],
              code: "INVALID_INPUT",
            },
          ],
        };
      case "INVALID_AFTER_SELF":
        return {
          collection: undefined,
          userErrors: [
            {
              message: "Cannot move product after itself",
              field: ["afterProductId"],
              code: "INVALID_INPUT",
            },
          ],
        };
      case "INVALID_BEFORE_SELF":
        return {
          collection: undefined,
          userErrors: [
            {
              message: "Cannot move product before itself",
              field: ["beforeProductId"],
              code: "INVALID_INPUT",
            },
          ],
        };
      case "ITEM_NOT_FOUND":
        return {
          collection: undefined,
          userErrors: [
            { message: "Product not in collection", field: ["productId"], code: "NOT_FOUND" },
          ],
        };
      case "AFTER_ITEM_NOT_FOUND":
        return {
          collection: undefined,
          userErrors: [
            {
              message: "Reference product not in collection",
              field: ["afterProductId"],
              code: "NOT_FOUND",
            },
          ],
        };
      case "BEFORE_ITEM_NOT_FOUND":
        return {
          collection: undefined,
          userErrors: [
            {
              message: "Reference product not in collection",
              field: ["beforeProductId"],
              code: "NOT_FOUND",
            },
          ],
        };
      case "RANK_SPACE_EXHAUSTED":
        return {
          collection: undefined,
          userErrors: [{ message: "Unable to move product", code: "RANK_SPACE_EXHAUSTED" }],
        };
    }
  }

  protected handleError(_error: unknown): CollectionResult {
    return {
      collection: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
