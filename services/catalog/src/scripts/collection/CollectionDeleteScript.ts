import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { CollectionDeleteParams, CollectionDeleteResult } from "./dto/index.js";

export class CollectionDeleteScript extends BaseScript<
  CollectionDeleteParams,
  CollectionDeleteResult
> {
  @Transactional()
  protected async execute(params: CollectionDeleteParams): Promise<CollectionDeleteResult> {
    const existing = await this.repository.collection.findByIdForUpdate(params.id);
    if (!existing) {
      return {
        deletedCollectionId: undefined,
        userErrors: [{ message: "Collection not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }
    const syncOperation =
      existing.type === "manual"
        ? await this.repository.collectionSync.clearCollection({
            workflowId: `${this.context.requestId}:collection:delete`,
            collectionId: params.id,
          })
        : null;
    const deleted = await this.repository.collection.softDelete(params.id);
    if (!deleted) {
      throw new Error("Collection disappeared while deleting");
    }
    return {
      deletedCollectionId: params.id,
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
