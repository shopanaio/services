import { BaseScript } from "../../kernel/BaseScript.js";
import type { CollectionDeleteParams, CollectionDeleteResult } from "./dto/index.js";

export class CollectionDeleteScript extends BaseScript<
  CollectionDeleteParams,
  CollectionDeleteResult
> {
  protected async execute(
    params: CollectionDeleteParams
  ): Promise<CollectionDeleteResult> {
    const deleted = await this.repository.collection.softDelete(params.id);
    if (!deleted) {
      return {
        deletedCollectionId: undefined,
        userErrors: [{ message: "Collection not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }
    return { deletedCollectionId: params.id, userErrors: [] };
  }

  protected handleError(_error: unknown): CollectionDeleteResult {
    return {
      deletedCollectionId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
