import { BaseScript } from "../../kernel/BaseScript.js";
import { midpointRank } from "../shared/rank.js";
import type { CollectionMoveProductParams, CollectionResult } from "./dto/index.js";

export class CollectionMoveProductScript extends BaseScript<
  CollectionMoveProductParams,
  CollectionResult
> {
  protected async execute(params: CollectionMoveProductParams): Promise<CollectionResult> {
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
        userErrors: [{ message: "Can only move products in manual collection", code: "INVALID" }],
      };
    }

    const [target, afterItem, beforeItem] = await Promise.all([
      this.repository.collectionItem.findByCollectionAndProduct(
        params.collectionId,
        params.productId
      ),
      params.afterProductId
        ? this.repository.collectionItem.findByCollectionAndProduct(
            params.collectionId,
            params.afterProductId
          )
        : Promise.resolve(null),
      params.beforeProductId
        ? this.repository.collectionItem.findByCollectionAndProduct(
            params.collectionId,
            params.beforeProductId
          )
        : Promise.resolve(null),
    ]);

    if (!target) {
      return {
        collection: undefined,
        userErrors: [{ message: "Product not in collection", field: ["productId"], code: "NOT_FOUND" }],
      };
    }

    // Validate reference products exist in collection
    if (params.afterProductId && !afterItem) {
      return {
        collection: undefined,
        userErrors: [{ message: "Reference product not in collection", field: ["afterProductId"], code: "NOT_FOUND" }],
      };
    }
    if (params.beforeProductId && !beforeItem) {
      return {
        collection: undefined,
        userErrors: [{ message: "Reference product not in collection", field: ["beforeProductId"], code: "NOT_FOUND" }],
      };
    }

    // If only afterProductId is provided, find the next item to use as upper bound
    // This ensures the moved item is placed immediately after afterItem
    let effectiveBeforeItem = beforeItem;
    if (afterItem && !beforeItem) {
      const allItems = await this.repository.collectionItem.findByCollectionId(params.collectionId);
      const afterIndex = allItems.findIndex((item) => item.productId === params.afterProductId);
      if (afterIndex >= 0 && afterIndex + 1 < allItems.length) {
        const nextItem = allItems[afterIndex + 1];
        // Don't use the target item as the upper bound
        if (nextItem.productId !== params.productId) {
          effectiveBeforeItem = nextItem;
        }
      }
    }

    let newRank = midpointRank(afterItem?.lexoRank ?? null, effectiveBeforeItem?.lexoRank ?? null);
    if (!newRank) {
      await this.repository.collectionItem.rebalance(params.collectionId);
      const [afterRebalanced, beforeRebalanced] = await Promise.all([
        params.afterProductId
          ? this.repository.collectionItem.findByCollectionAndProduct(
              params.collectionId,
              params.afterProductId
            )
          : Promise.resolve(null),
        params.beforeProductId
          ? this.repository.collectionItem.findByCollectionAndProduct(
              params.collectionId,
              params.beforeProductId
            )
          : Promise.resolve(null),
      ]);
      newRank = midpointRank(
        afterRebalanced?.lexoRank ?? null,
        beforeRebalanced?.lexoRank ?? null
      );
    }

    if (!newRank) {
      return {
        collection: undefined,
        userErrors: [{ message: "Unable to move product", code: "RANK_SPACE_EXHAUSTED" }],
      };
    }

    await this.repository.collectionItem.updateRank(
      params.collectionId,
      params.productId,
      newRank
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
