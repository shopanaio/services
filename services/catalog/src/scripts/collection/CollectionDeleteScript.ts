import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { CollectionDeleteParams, CollectionDeleteResult } from "./dto/index.js";

export class CollectionDeleteScript extends BaseScript<
  CollectionDeleteParams,
  CollectionDeleteResult
> {
  @Transactional()
  protected async execute(
    params: CollectionDeleteParams
  ): Promise<CollectionDeleteResult> {
    const existing = await this.repository.collection.findByIdForUpdate(params.id);
    if (!existing) {
      return {
        deletedCollectionId: undefined,
        userErrors: [{ message: "Collection not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }
    if (existing.revision !== params.expectedRevision) {
      return {
        deletedCollectionId: undefined,
        userErrors: [{
          message: "Collection revision does not match",
          field: ["expectedRevision"],
          code: "REVISION_CONFLICT",
        }],
      };
    }
    if (
      existing.revision >= 2_147_483_646 ||
      existing.listingRevision >= 2_147_483_646
    ) {
      return {
        deletedCollectionId: undefined,
        userErrors: [{ message: "Collection revision limit reached", code: "REVISION_LIMIT_EXCEEDED" }],
      };
    }
    const syncOperation =
      existing.type === "manual"
        ? await this.repository.collectionSync.clearCollection({
            workflowId: `${this.context.requestId}:collection:delete`,
            collectionId: params.id,
            collectionRevision: existing.revision + 1,
          })
        : null;
    const deleted = await this.repository.collection.softDelete(
      params.id,
      params.expectedRevision
    );
    if (!deleted) {
      throw new Error("Collection delete compare-and-swap failed after row lock");
    }
    return {
      deletedCollectionId: params.id,
      revision: deleted.revision,
      listingRevision: deleted.listingRevision,
      deletedAt: deleted.deletedAt ?? undefined,
      syncOperationId: syncOperation?.operationId ?? undefined,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): CollectionDeleteResult {
    return {
      deletedCollectionId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
