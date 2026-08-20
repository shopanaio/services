import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { CollectionAddProductsParams, CollectionResult } from "./dto/index.js";

export class CollectionAddProductsScript extends BaseScript<
  CollectionAddProductsParams,
  CollectionResult
> {
  @Transactional()
  protected async execute(params: CollectionAddProductsParams): Promise<CollectionResult> {
    const collection =
      await this.repository.collection.findByIdForUpdate(params.collectionId);
    if (!collection) {
      return {
        collection: undefined,
        userErrors: [{ message: "Collection not found", field: ["collectionId"], code: "NOT_FOUND" }],
      };
    }
    if (collection.revision !== params.expectedRevision) {
      return {
        collection: undefined,
        userErrors: [{ message: "Collection revision does not match", field: ["expectedRevision"], code: "REVISION_CONFLICT" }],
      };
    }
    if (collection.revision >= 2_147_483_646) {
      return {
        collection: undefined,
        userErrors: [{ message: "Collection revision limit reached", code: "REVISION_LIMIT_EXCEEDED" }],
      };
    }

    if (collection.type !== "manual") {
      return {
        collection: undefined,
        userErrors: [{ message: "Can only add products to manual collection", code: "INVALID" }],
      };
    }
    if (params.productIds.length > 100) {
      return {
        collection: undefined,
        userErrors: [{ message: "At most 100 products can be added", field: ["productIds"], code: "LIMIT_EXCEEDED" }],
      };
    }
    const productIds = [...new Set(params.productIds)];
    const products = await this.repository.product.getByIds(productIds);
    if (products.length !== productIds.length) {
      return {
        collection: undefined,
        userErrors: [{ message: "One or more products were not found", field: ["productIds"], code: "NOT_FOUND" }],
      };
    }

    const changedProductIds = await this.repository.collectionItem.addProducts(
      params.collectionId,
      productIds
    );
    if (changedProductIds.length === 0) {
      return { collection, userErrors: [] };
    }
    const refreshed = await this.repository.collection.bumpRevision(
      params.collectionId,
      params.expectedRevision,
      { listingChanged: false }
    );
    if (!refreshed) {
      throw new Error("Collection item compare-and-swap failed after row lock");
    }
    const operation = await this.repository.collectionSync.createOperation({
      workflowId: `${this.context.requestId}:collection:add`,
      collectionId: params.collectionId,
      collectionRevision: refreshed.revision,
      reason: "add",
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
